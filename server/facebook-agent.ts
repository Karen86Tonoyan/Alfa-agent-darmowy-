import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { alfa } from "./validation/alfa-pipeline"; // upgraded to full kozacki pipeline
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
  getGroupById,
} from "./db-groups-posts";
import { getDefaultToneByPage } from "./db-tones";
import { publishPagePost, sendPageMessage } from "./facebook";
import { postToGroupViaBrowser, isValidGroupUrl } from "./group-browser-poster";
import { postToFacebookGroupViaOperator } from "./browser-operator-client";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

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

  // KOZACKI full ALFA pipeline for live customer messages (high pressure)
  const pipeline = await alfa.analyze(candidate, {
    depth: "FULL",
    context: `Replying to customer message: ${params.messageText}`,
  });

  const reply = await createAIReply({
    pageId: params.pageId,
    incomingMessageId: params.messageDbId,
    toneConfigId: tone?.id,
    replyContent: candidate,
    status: pipeline.finalDecision === "BLOCK" ? "rejected" : "generated",
    errorMessage: pipeline.finalDecision === "BLOCK" ? pipeline.baseAnalysis.summary() : null,
  });

  if (pipeline.finalDecision === "BLOCK") {
    await maybeNotify(
      params.pageId,
      "AI reply blocked by ALFA",
      `Message ${params.messageDbId} blocked. Score ${pipeline.overallScore}. ${pipeline.blockedBy.join(", ")}`,
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

async function downloadMediaForBrowser(mediaUrl?: string): Promise<string | undefined> {
  if (!mediaUrl) return undefined;
  if (!mediaUrl.startsWith("http")) return mediaUrl; // already local?

  try {
    const tempDir = path.join(os.tmpdir(), "alfa-browser-media");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const ext = path.extname(new URL(mediaUrl).pathname) || ".jpg";
    const localPath = path.join(tempDir, `media-${Date.now()}${ext}`);

    const response = await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 30000 });
    fs.writeFileSync(localPath, response.data);
    return localPath;
  } catch (e) {
    console.error("Failed to download media for browser post:", e);
    return undefined;
  }
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
      const mediaLocalPathForBrowser = await downloadMediaForBrowser(mediaUrl);

      // 1. Always try to post to the Page feed via Graph API (reliable)
      let pagePostResult: any = null;
      try {
        pagePostResult = await publishPagePost(page.pageAccessToken, post.content, mediaUrl);
      } catch (e) {
        console.error("Page post failed:", e);
      }

      // 2. Post to groups via browser (the missing piece - Groups API is dead)
      const groupIds = post.groupIds ? post.groupIds.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      let groupSuccess = 0;
      let groupErrors: string[] = [];

      if (groupIds.length > 0) {
        const groups = await Promise.all(groupIds.map((gid: string) => getGroupById(Number(gid)).catch(() => null)));
        for (const grp of groups) {
          if (!grp || !grp.groupUrl || !isValidGroupUrl(grp.groupUrl)) continue;

          // Prefer the advanced BrowserOperator agent (the one from https://github.com/BrowserOperator/browser-operator-core)
          // because it uses multi-agent reasoning + vision + CDP for complex sites like Facebook.
          // Falls back to raw Playwright if operator is not configured or fails.
          let res: { success: boolean; error?: string; postUrl?: string };
          try {
            const opRes = await postToFacebookGroupViaOperator({
              groupUrl: grp.groupUrl,
              content: post.content,
              mediaUrl: mediaLocalPathForBrowser || mediaUrl,
              // modelConfig can be passed from env or per-page settings in a real setup
            });
            res = opRes;
            if (!opRes.success && process.env.BROWSER_OPERATOR_API_URL) {
              // If operator was configured but failed, still try raw Playwright as fallback
              const pwRes = await postToGroupViaBrowser(page.id, grp.groupUrl, post.content, mediaLocalPathForBrowser);
              if (pwRes.success) res = { success: true, postUrl: pwRes.postUrl };
            }
          } catch (opErr) {
            // Operator not available or errored — fall back to direct Playwright
            const pwRes = await postToGroupViaBrowser(page.id, grp.groupUrl, post.content, mediaLocalPathForBrowser);
            res = pwRes;
          }

          if (res.success) {
            groupSuccess++;
          } else {
            groupErrors.push(`Group ${grp.groupName || grp.groupUrl}: ${res.error || "unknown error"}`);
          }
        }
      }

      const finalStatus = groupIds.length === 0 || groupSuccess > 0 ? "published" : "failed";
      const fbId = pagePostResult?.post_id || pagePostResult?.id;

      await updateScheduledPost(post.id, {
        status: finalStatus,
        publishedAt: new Date(),
        facebookPostId: fbId,
        errorMessage: groupErrors.length ? groupErrors.join(" | ") : null,
      });

      await maybeNotify(
        page.id,
        "Scheduled post published",
        `Scheduled post ${post.id} published to page${groupSuccess ? ` + ${groupSuccess} groups` : ""}.`,
        "notifyOnPostPublished"
      );

      if (groupErrors.length) {
        await maybeNotify(page.id, "Some group posts failed", groupErrors.join("\n"), "notifyOnPostFailed");
      }
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
