/**
 * Client for BrowserOperator (https://github.com/BrowserOperator/browser-operator-core)
 *
 * This provides the "połączenie z przeglądarką" — the Alfa agent talks to a running
 * Browser Operator instance (via its agent-server / eval-server HTTP API) to perform
 * complex browser tasks using its built-in multi-agent AI system + CDP.
 *
 * Main use case in this project: posting to Facebook Groups (API deprecated) in a robust,
 * agentic way instead of fragile hand-written Playwright scripts.
 *
 * The content sent to the browser is always pre-validated by ALFA (Filtry Tonoyana pipeline)
 * so the operator receives clean, non-hallucinated copy.
 *
 * Requires:
 * - Browser Operator desktop app running with remote debugging / agent mode enabled (CDP on 9223 or configured).
 * - The agent-server (eval-server/nodejs) running and connected to the browser's CDP.
 * - Configured via env:
 *     BROWSER_OPERATOR_API_URL=http://localhost:8081
 *     BROWSER_OPERATOR_AUTH_KEY=your-secret-key   (if set on the server)
 *
 * Model config is passed per-request (supports the nested main_model / mini_model / nano_model format
 * that the operator expects, compatible with OpenAI, OpenRouter, Groq, LiteLLM, etc.).
 */

import axios from "axios";

export interface ModelConfig {
  main_model: {
    provider: string;
    model: string;
    api_key?: string;
    base_url?: string;
  };
  mini_model?: {
    provider: string;
    model: string;
    api_key?: string;
    base_url?: string;
  };
  nano_model?: {
    provider: string;
    model: string;
    api_key?: string;
    base_url?: string;
  };
}

export interface BrowserTaskRequest {
  input: string | Array<{ role: string; content: string }>;
  url?: string;
  wait_timeout?: number;
  model?: ModelConfig;
}

export interface BrowserTaskResponse {
  id?: string;
  output?: string;
  status?: string;
  tabId?: string;
  clientId?: string;
  [key: string]: any;
}

const DEFAULT_API_URL = process.env.BROWSER_OPERATOR_API_URL || "http://localhost:8081";

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authKey = process.env.BROWSER_OPERATOR_AUTH_KEY;
  if (authKey) {
    headers["Authorization"] = `Bearer ${authKey}`;
  }
  return headers;
}

/**
 * Send a high-level natural language task to the Browser Operator agent.
 * The agent will use its vision + tools + the configured LLMs to accomplish it in the browser.
 *
 * Example for Facebook group post:
 *   await executeBrowserTask({
 *     input: `You are logged in as a Facebook Page admin.
 *             Go to this group: https://facebook.com/groups/xxx
 *             Create a post with EXACTLY this text (do not change a single word):
 *             "${validatedAlfaContent}"
 *             ${mediaUrl ? `Attach the image from ${mediaUrl} if possible.` : ""}
 *             Publish it. Return the post URL if successful.`,
 *     url: "https://facebook.com", // starting point
 *     model: { ... your preferred fast + capable models ... }
 *   });
 */
export async function executeBrowserTask(
  request: BrowserTaskRequest
): Promise<BrowserTaskResponse> {
  const url = `${DEFAULT_API_URL.replace(/\/$/, "")}/v1/responses`;

  try {
    const res = await axios.post<BrowserTaskResponse>(url, request, {
      headers: getHeaders(),
      timeout: (request.wait_timeout || 60000) + 30000, // extra buffer
    });
    return res.data;
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message || "Browser Operator task failed";
    console.error("BrowserOperator error:", msg);
    throw new Error(`Browser Operator: ${msg}`);
  }
}

/**
 * Convenience helper specifically for posting to a Facebook Group using the operator.
 * The content MUST come from ALFA validation (passed in).
 */
export async function postToFacebookGroupViaOperator(params: {
  groupUrl: string;
  content: string; // already ALFA validated + approved
  mediaUrl?: string;
  modelConfig?: ModelConfig;
}): Promise<{ success: boolean; postUrl?: string; rawResponse?: any; error?: string }> {
  const instruction = [
    "You are controlling a browser session that is logged into Facebook as a Page admin who can post to groups.",
    `Navigate to the Facebook group at: ${params.groupUrl}`,
    "Find the composer to create a new post (it may say 'Write something...' or similar).",
    "IMPORTANT: Use the following text EXACTLY as provided. Do not paraphrase, shorten, add hashtags, or change any wording:",
    `---EXACT POST TEXT START---\n${params.content}\n---EXACT POST TEXT END---`,
    params.mediaUrl
      ? `If possible, attach the media file or image available at: ${params.mediaUrl}. If it's a remote URL the browser can access, use it; otherwise describe that attachment is needed.`
      : "",
    "Review the post preview if shown.",
    "Publish / Post the content to the group.",
    "After publishing, try to capture the URL of the newly created post (it will be in the group feed).",
    "Return a clear confirmation and the post URL if you successfully published it.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await executeBrowserTask({
      input: instruction,
      url: "https://www.facebook.com",
      wait_timeout: 120000,
      model: params.modelConfig,
    });

    // The response text from the agent usually contains success/failure + URL
    const outputText = typeof response.output === "string" ? response.output : JSON.stringify(response);

    // Heuristic: look for a FB group post URL in the output
    const urlMatch = outputText.match(/https?:\/\/(?:www\.)?facebook\.com\/groups\/[^\/\s]+\/posts\/[^\s"'`)]+/i);

    return {
      success: /success|published|posted|done/i.test(outputText) || !!urlMatch,
      postUrl: urlMatch ? urlMatch[0] : undefined,
      rawResponse: response,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
    };
  }
}
