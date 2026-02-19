#!/usr/bin/env node
import { chromium, type Browser, type Page, type BrowserContext } from "playwright-core";

const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_URL = process.env.HA_URL || "http://supervisor/core";

if (!SUPERVISOR_TOKEN) {
  console.error(
    "Error: SUPERVISOR_TOKEN not set. This tool must run inside a Home Assistant add-on."
  );
  process.exit(1);
}

const HELP = `ha-browse — Home Assistant Browser Tool

Usage:
  ha-browse screenshot [path] [options]    Take a screenshot of an HA page
  ha-browse pdf [path]                     Save an HA page as PDF
  ha-browse dom [path]                     Get the accessibility tree of a page
  ha-browse click <selector> [path]        Click an element on a page
  ha-browse fill <selector> <value> [path] Fill an input field
  ha-browse eval <js> [path]               Evaluate JavaScript on a page
  ha-browse --help                         Show this help

Paths:
  Paths are relative to the HA frontend root. Examples:
    /lovelace/0           — First dashboard
    /lovelace/overview    — "overview" dashboard
    /config               — Settings page
    /config/devices       — Devices page
    /config/entities      — Entities page
    /config/automations   — Automations page
    /developer-tools      — Developer tools
    /map                  — Map view

Options:
  --width N              Viewport width (default: 1280)
  --height N             Viewport height (default: 720)
  --full-page            Capture full scrollable page
  --selector <sel>       Wait for and capture only this element
  --wait <ms>            Extra wait time in ms after page load (default: 2000)
  --output <path>        Output file path (default: /tmp/ha-screenshot-<ts>.png)
  --dark                 Use dark theme
  --timeout <ms>         Navigation timeout (default: 30000)

Examples:
  ha-browse screenshot                                # Screenshot of default dashboard
  ha-browse screenshot /lovelace/overview             # Screenshot of overview dashboard
  ha-browse screenshot /config/automations --full-page # Full-page screenshot
  ha-browse screenshot --selector "ha-card" /lovelace/0  # Just the first card
  ha-browse dom /lovelace/0                           # Accessibility tree
  ha-browse pdf /lovelace/0                           # Save as PDF
`;

interface BrowseOptions {
  width: number;
  height: number;
  fullPage: boolean;
  selector: string | null;
  wait: number;
  output: string | null;
  dark: boolean;
  timeout: number;
}

function parseOptions(args: string[]): { options: BrowseOptions; remaining: string[] } {
  const options: BrowseOptions = {
    width: 1280,
    height: 720,
    fullPage: false,
    selector: null,
    wait: 2000,
    output: null,
    dark: false,
    timeout: 30000,
  };
  const remaining: string[] = [];

  let i = 0;
  while (i < args.length) {
    switch (args[i]) {
      case "--width":
        options.width = parseInt(args[++i], 10) || 1280;
        break;
      case "--height":
        options.height = parseInt(args[++i], 10) || 720;
        break;
      case "--full-page":
        options.fullPage = true;
        break;
      case "--selector":
        options.selector = args[++i];
        break;
      case "--wait":
        options.wait = parseInt(args[++i], 10) || 2000;
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--dark":
        options.dark = true;
        break;
      case "--timeout":
        options.timeout = parseInt(args[++i], 10) || 30000;
        break;
      default:
        remaining.push(args[i]);
    }
    i++;
  }

  return { options, remaining };
}

async function launchBrowser(): Promise<Browser> {
  // Use system-installed Chromium
  const executablePath = process.env.CHROMIUM_PATH || "/usr/bin/chromium-browser";

  return chromium.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--headless",
    ],
  });
}

async function createPage(
  browser: Browser,
  options: BrowseOptions
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    extraHTTPHeaders: {
      Authorization: `Bearer ${SUPERVISOR_TOKEN}`,
    },
    colorScheme: options.dark ? "dark" : "light",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(options.timeout);

  return { context, page };
}

async function navigateToHA(page: Page, path: string, options: BrowseOptions): Promise<void> {
  const url = `${HA_URL}${path}`;
  console.error(`Navigating to: ${url}`);

  await page.goto(url, { waitUntil: "networkidle" });

  // HA frontend is a web component app — wait for it to render
  // Try to wait for the main content to appear
  try {
    await page.waitForSelector("home-assistant, ha-panel-lovelace, hc-lovelace", {
      timeout: 10000,
    });
  } catch {
    // Not all pages have these selectors, continue anyway
  }

  // Additional wait for dynamic content rendering
  if (options.wait > 0) {
    await page.waitForTimeout(options.wait);
  }

  // If a specific selector was requested, wait for it
  if (options.selector) {
    try {
      await page.waitForSelector(options.selector, { timeout: options.timeout });
    } catch {
      console.error(`Warning: selector "${options.selector}" not found within timeout`);
    }
  }
}

async function cmdScreenshot(args: string[]): Promise<void> {
  const { options, remaining } = parseOptions(args);
  const path = remaining[0] || "/lovelace/0";
  const outputPath =
    options.output || `/tmp/ha-screenshot-${Date.now()}.png`;

  const browser = await launchBrowser();
  try {
    const { context, page } = await createPage(browser, options);
    await navigateToHA(page, path, options);

    if (options.selector) {
      const element = await page.$(options.selector);
      if (element) {
        await element.screenshot({ path: outputPath });
      } else {
        console.error(`Selector "${options.selector}" not found, taking full page screenshot`);
        await page.screenshot({ path: outputPath, fullPage: options.fullPage });
      }
    } else {
      await page.screenshot({ path: outputPath, fullPage: options.fullPage });
    }

    console.log(outputPath);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function cmdPdf(args: string[]): Promise<void> {
  const { options, remaining } = parseOptions(args);
  const path = remaining[0] || "/lovelace/0";
  const outputPath =
    options.output || `/tmp/ha-page-${Date.now()}.pdf`;

  const browser = await launchBrowser();
  try {
    const { context, page } = await createPage(browser, options);
    await navigateToHA(page, path, options);

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
    });

    console.log(outputPath);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function cmdDom(args: string[]): Promise<void> {
  const { options, remaining } = parseOptions(args);
  const path = remaining[0] || "/lovelace/0";

  const browser = await launchBrowser();
  try {
    const { context, page } = await createPage(browser, options);
    await navigateToHA(page, path, options);

    // Get accessibility tree — gives a structured view of the page
    const snapshot = await page.accessibility.snapshot();
    if (snapshot) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.error("No accessibility tree available");
      // Fallback: get a simplified DOM representation
      const simplified = await page.evaluate(() => {
        function simplify(el: Element, depth: number = 0): string {
          if (depth > 6) return "";
          const tag = el.tagName.toLowerCase();
          const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
            ? ` "${el.textContent?.trim().slice(0, 80)}"`
            : "";
          const attrs: string[] = [];
          if (el.id) attrs.push(`id="${el.id}"`);
          if (el.className && typeof el.className === "string")
            attrs.push(`class="${el.className.split(" ").slice(0, 3).join(" ")}"`);
          const attrStr = attrs.length ? " " + attrs.join(" ") : "";

          let result = "  ".repeat(depth) + `<${tag}${attrStr}>${text}\n`;
          // Traverse shadow DOM too
          const root = el.shadowRoot || el;
          for (const child of root.children) {
            result += simplify(child, depth + 1);
          }
          return result;
        }
        return simplify(document.body);
      });
      console.log(simplified);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

async function cmdClick(args: string[]): Promise<void> {
  const { options, remaining } = parseOptions(args);
  if (remaining.length === 0) {
    console.error("Usage: ha-browse click <selector> [path]");
    process.exit(1);
  }
  const selector = remaining[0];
  const path = remaining[1] || "/lovelace/0";
  const outputPath =
    options.output || `/tmp/ha-screenshot-${Date.now()}.png`;

  const browser = await launchBrowser();
  try {
    const { context, page } = await createPage(browser, options);
    await navigateToHA(page, path, options);

    await page.click(selector);
    // Wait for any resulting navigation or rendering
    await page.waitForTimeout(Math.max(options.wait, 1000));

    await page.screenshot({ path: outputPath, fullPage: options.fullPage });
    console.log(`Clicked "${selector}" — screenshot: ${outputPath}`);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function cmdFill(args: string[]): Promise<void> {
  const { options, remaining } = parseOptions(args);
  if (remaining.length < 2) {
    console.error("Usage: ha-browse fill <selector> <value> [path]");
    process.exit(1);
  }
  const selector = remaining[0];
  const value = remaining[1];
  const path = remaining[2] || "/lovelace/0";

  const browser = await launchBrowser();
  try {
    const { context, page } = await createPage(browser, options);
    await navigateToHA(page, path, options);

    await page.fill(selector, value);
    console.log(`Filled "${selector}" with "${value}"`);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function cmdEval(args: string[]): Promise<void> {
  const { options, remaining } = parseOptions(args);
  if (remaining.length === 0) {
    console.error("Usage: ha-browse eval <javascript> [path]");
    process.exit(1);
  }
  const js = remaining[0];
  const path = remaining[1] || "/lovelace/0";

  const browser = await launchBrowser();
  try {
    const { context, page } = await createPage(browser, options);
    await navigateToHA(page, path, options);

    const result = await page.evaluate(js);
    if (result !== undefined) {
      console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    }
    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case "screenshot":
      await cmdScreenshot(commandArgs);
      break;
    case "pdf":
      await cmdPdf(commandArgs);
      break;
    case "dom":
      await cmdDom(commandArgs);
      break;
    case "click":
      await cmdClick(commandArgs);
      break;
    case "fill":
      await cmdFill(commandArgs);
      break;
    case "eval":
      await cmdEval(commandArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run 'ha-browse --help' for usage");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
