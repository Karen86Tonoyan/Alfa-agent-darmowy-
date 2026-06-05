/**
 * Browser-based Group Poster using Playwright
 *
 * Since Facebook Groups API was deprecated (April 2024), posting to groups
 * requires browser automation.
 *
 * This module provides a connection to a real browser (Playwright) so the ALFA agent
 * can actually publish to groups the page is a member of.
 *
 * Security notes:
 * - Uses persistent browser context per page (stores cookies/session in userDataDir)
 * - First run: browser will open (or headless=false for setup) — user must log in once as the page admin.
 * - Subsequent runs reuse the session.
 * - Never hardcode credentials. User manages the profile.
 *
 * Usage in scheduler:
 *   await postToGroupViaBrowser(group.groupUrl, content, mediaLocalPath?)
 */

// Lazy import for Playwright so the whole app doesn't crash if the user hasn't run `pnpm browser:setup` yet.
let playwright: any = null;
async function getPlaywright() {
  if (!playwright) {
    try {
      playwright = await import("playwright");
    } catch (e) {
      throw new Error(
        "Playwright not installed. Run: pnpm browser:setup (then npx playwright install --with-deps on first setup). " +
        "This is required for group posting because Facebook Groups API is deprecated."
      );
    }
  }
  return playwright;
}

const PROFILES_DIR = path.join(process.cwd(), "storage", "browser-profiles");

// Ensure profiles dir exists
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

interface PostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

let contextCache: Map<number, BrowserContext> = new Map();

/**
 * Get or create a persistent browser context for a specific page.
 * This keeps cookies/logins alive across runs.
 */
async function getBrowserContext(pageId: number): Promise<BrowserContext> {
  if (contextCache.has(pageId)) {
    const cached = contextCache.get(pageId)!;
    if (cached.pages().length > 0) return cached; // still alive
  }

  const userDataDir = path.join(PROFILES_DIR, `page-${pageId}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const { chromium } = await getPlaywright();
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: process.env.HEADLESS_BROWSER !== "false", // set HEADLESS_BROWSER=false for first login
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  // Stealth: hide webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  contextCache.set(pageId, context);
  return context;
}

/**
 * Post content to a Facebook Group using the browser.
 * The context must already be logged in (as the page admin who can post in that group).
 */
export async function postToGroupViaBrowser(
  pageId: number,
  groupUrl: string,
  content: string,
  imagePath?: string
): Promise<PostResult> {
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    context = await getBrowserContext(pageId);
    page = await context.newPage();

    // Go to the group
    await page.goto(groupUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Wait for group to load (feed or composer)
    await page.waitForTimeout(2500);

    // Try multiple common selectors for the "Write something..." composer in groups
    const composerSelectors = [
      'div[role="textbox"][aria-label*="Write something"]',
      'div[aria-label="Create a post"]',
      'div[role="button"][aria-label*="Write a post"]',
      'textarea[placeholder*="Write something"]',
      'div[contenteditable="true"][aria-label*="post"]',
    ];

    let composer: any = null;
    for (const sel of composerSelectors) {
      try {
        composer = await page.waitForSelector(sel, { timeout: 8000, state: "visible" });
        if (composer) break;
      } catch {}
    }

    if (!composer) {
      // Sometimes groups show "Join" or different UI — try to find the post button area
      await page.screenshot({ path: path.join(PROFILES_DIR, `debug-group-${Date.now()}.png`) });
      throw new Error("Could not find post composer in group. Make sure the account is logged in and is a member of the group.");
    }

    // Click to focus the composer
    await composer.click();
    await page.waitForTimeout(600);

    // Type the content (use clipboard for longer text to avoid typing limits)
    await page.keyboard.type(content, { delay: 10 });

    // Handle image if provided
    if (imagePath && fs.existsSync(imagePath)) {
      const fileInputs = await page.$$('input[type="file"]');
      if (fileInputs.length > 0) {
        await fileInputs[0].setInputFiles(imagePath);
        await page.waitForTimeout(1500);
      } else {
        // Try the "Photo/video" button
        const photoBtn = await page.$('div[aria-label*="Photo"] , div[aria-label*="Video"]');
        if (photoBtn) {
          await photoBtn.click();
          await page.waitForTimeout(800);
          const hiddenInput = await page.$('input[type="file"]');
          if (hiddenInput) await hiddenInput.setInputFiles(imagePath);
        }
      }
    }

    // Find and click the Post button
    const postButtonSelectors = [
      'div[aria-label="Post"][role="button"]',
      'button[aria-label="Post"]',
      'div[role="button"]:has-text("Post")',
      '[data-testid="post-button"]',
    ];

    let posted = false;
    for (const sel of postButtonSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          posted = true;
          break;
        }
      } catch {}
    }

    if (!posted) {
      // Fallback: press Enter or Ctrl+Enter in some composers
      await page.keyboard.down("Control");
      await page.keyboard.press("Enter");
      await page.keyboard.up("Control");
    }

    // Wait for post to appear or success indicator
    await page.waitForTimeout(4000);

    // Try to capture the new post URL (best effort)
    let postUrl: string | undefined;
    try {
      const postLink = await page.$('a[href*="/groups/"][href*="/posts/"]');
      if (postLink) {
        postUrl = await postLink.getAttribute("href");
        if (postUrl && !postUrl.startsWith("http")) postUrl = "https://facebook.com" + postUrl;
      }
    } catch {}

    await page.close();

    return {
      success: true,
      postUrl,
    };
  } catch (error: any) {
    console.error("Browser group post error:", error);
    if (page) {
      try {
        await page.screenshot({ path: path.join(PROFILES_DIR, `error-${Date.now()}.png`) });
      } catch {}
      await page.close().catch(() => {});
    }
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Close all browser contexts (for graceful shutdown)
 */
export async function closeAllBrowserContexts() {
  for (const [pageId, ctx] of contextCache.entries()) {
    try {
      await ctx.close();
    } catch {}
  }
  contextCache.clear();
}

/**
 * Helper: check if a group URL looks valid
 */
export function isValidGroupUrl(url: string): boolean {
  return /facebook\.com\/groups\//i.test(url);
}
