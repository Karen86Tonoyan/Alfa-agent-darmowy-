import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { FiltrTonoyana, Decision } from "./validation/filtry-tonoyana";
import {
  getFacebookPageByGraphId,
  getFacebookPageById,
  getNotificationPreferences,
} from "./db";
import {
  createAIReply,
  createIncomingMessage,
  getScheduledPostsForPublishing,
  updateAIReply,
  updateScheduledPost,
} from "./db-groups-posts";
import { getDefaultToneByPage } from "./db-tones";
import { publishPagePost, sendPageMessage } from "./facebook";

const filtry = new FiltrTonoyana();

function getRawBody(req: Request) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  return JSON.stringify(req.body ?? {});
}

function verifyFacebookSignature(req: Request) {
  if (!ENV.facebookAppSecret) return true;
  const signature = req.header("x-hub-signature-256");
  if (!signature) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", ENV.facebookAppSecret)
    .update(getRawBody(req))
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function maybeNotify(
  pageId: number,
  title: string,
  content: string,
  key:
    | "notifyOnNewMessage"
    | "notifyOnPostPublished"
    | "notifyOnPostFailed"
    | "notifyOnAIReply"
) {
  const prefs = await getNotificationPreferences(pageId);
  if (prefs && prefs[key] === 0) return false;
  return notifyOwner({ title, content });
}

async function generateAndSendReply(params: {
  pageId: number;
  messageDbId: number;
  senderName?: string | null;
  senderId: string;
  messageText: string;
  pageAccessToken: string;
}) {
  const tone = await getDefaultToneByPage(params.pageId);
  const systemPrompt =
    tone?.systemPrompt ||
    `You are a Facebook Page assistant. Reply helpfully, briefly, and professionally. Tone: ${
      tone?.toneType || "professional"
    }. Language: ${tone?.language || "en"}.`;

  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Reply to this customer message from ${params.senderName || "customer"}: ${params.messageText}`,
      },
    ],
  });

  const candidate = String(llmResult.choices[0]?.message?.content ?? "").trim();
  const validation = filtry.analyze(candidate);

  const reply = await createAIReply({
    pageId: params.pageId,
    incomingMessageId: params.messageDbId,
    toneConfigId: tone?.id,
    replyContent: candidate,
    status: validation.decision === Decision.BLOCK ? "rejected" : "generated",
    errorMessage: validation.decision === Decision.BLOCK ? validation.summary() : null,
  });

  if (validation.decision === Decision.BLOCK) {
    await maybeNotify(
      params.pageId,
      "AI reply blocked",
      `Reply for incoming message ${params.messageDbId} was blocked by ALFA validation.`,
      "notifyOnAIReply"
    );
    return;
  }

  const result = await sendPageMessage(params.pageAccessToken, params.senderId, candidate);
  await updateAIReply(reply.id, {
    status: "sent",
    facebookMessageId: result.message_id,
    sentAt: new Date(),
    errorMessage: null,
  });

  await maybeNotify(
    params.pageId,
    "AI reply sent",
    `Sent AI reply for incoming message ${params.messageDbId}.`,
    "notifyOnAIReply"
  );
}

export function registerFacebookWebhookRoutes(app: Express) {
  app.get("/api/facebook/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
      mode === "subscribe" &&
      typeof token === "string" &&
      token === ENV.facebookWebhookVerifyToken
    ) {
      res.status(200).send(String(challenge ?? ""));
      return;
    }

    res.status(403).send("Forbidden");
  });

  app.post("/api/facebook/webhook", async (req: Request, res: Response) => {
    if (!verifyFacebookSignature(req)) {
      res.status(401).send("Invalid signature");
      return;
    }

    const payload = req.body as any;
    if (payload?.object !== "page" || !Array.isArray(payload?.entry)) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    for (const entry of payload.entry) {
      const page = await getFacebookPageByGraphId(String(entry.id));
      if (!page || !Array.isArray(entry.messaging)) continue;

      for (const event of entry.messaging) {
        const text = event?.message?.text;
        const senderId = event?.sender?.id;
        const messageId = event?.message?.mid;

        if (!text || !senderId || !messageId) continue;

        const message = await createIncomingMessage({
          pageId: page.id,
          senderId: String(senderId),
          senderName: event?.sender?.name || null,
          messageContent: text,
          messageId: String(messageId),
          conversationId: event?.recipient?.id ? String(event.recipient.id) : null,
          receivedAt: event?.timestamp ? new Date(event.timestamp) : new Date(),
        });

        await maybeNotify(
          page.id,
          "New Facebook message",
          `New incoming message on page ${page.pageName}.`,
          "notifyOnNewMessage"
        );

        try {
          await generateAndSendReply({
            pageId: page.id,
            messageDbId: message.id,
            senderName: message.senderName,
            senderId: String(senderId),
            messageText: text,
            pageAccessToken: page.pageAccessToken,
          });
        } catch (error) {
          console.error("[FacebookAgent] Auto reply failed:", error);
        }
      }
    }

    res.status(200).json({ ok: true });
  });
}

export async function runScheduledPostPublisher() {
  const duePosts = await getScheduledPostsForPublishing();

  for (const post of duePosts) {
    try {
      const page = await getFacebookPageById(post.pageId);
      if (!page) {
        await updateScheduledPost(post.id, {
          status: "failed",
          errorMessage: "Page not found",
        });
        continue;
      }

      const mediaUrl = post.mediaUrls?.split(",").map((item) => item.trim()).filter(Boolean)[0];
      const result = await publishPagePost(page.pageAccessToken, post.content, mediaUrl);

      await updateScheduledPost(post.id, {
        status: "published",
        publishedAt: new Date(),
        facebookPostId: result.post_id || result.id,
        errorMessage: null,
      });

      await maybeNotify(
        page.id,
        "Scheduled post published",
        `Scheduled post ${post.id} was published successfully.`,
        "notifyOnPostPublished"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduler error";
      await updateScheduledPost(post.id, {
        status: "failed",
        errorMessage: message,
      });

      const page = await getFacebookPageById(post.pageId);
      if (page) {
        await maybeNotify(
          page.id,
          "Scheduled post failed",
          `Scheduled post ${post.id} failed: ${message}`,
          "notifyOnPostFailed"
        );
      }
    }
  }
}

export function startPostScheduler() {
  const intervalMs =
    Number.isFinite(ENV.schedulerIntervalMs) && ENV.schedulerIntervalMs >= 10000
      ? ENV.schedulerIntervalMs
      : 60000;

  void runScheduledPostPublisher();
  return setInterval(() => {
    void runScheduledPostPublisher();
  }, intervalMs);
}
