import { config } from "../config";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text: string;
  };
  error_code?: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TELEGRAM_API_BASE = "https://api.telegram.org";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Handle rate limiting
    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Telegram rate limited after ${MAX_RETRIES} retries`
        );
      }
      const retryAfter = response.headers.get("retry-after");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Telegram rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }

    // Retry on server errors
    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Telegram server error (${response.status}). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }

    return response;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name === "AbortError" &&
      attempt < MAX_RETRIES
    ) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Telegram request timed out. Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Core: sendMessage
// ---------------------------------------------------------------------------

/**
 * Send a text message via the Telegram Bot API.
 *
 * Uses HTML parse mode for rich formatting support. Messages are sent to the
 * configured CHAT_ID.
 *
 * @see https://core.telegram.org/bots/api#sendmessage
 */
export async function sendMessage(
  text: string
): Promise<TelegramSendMessageResponse | null> {
  const botToken = config.telegramBotToken;
  const chatId = config.telegramChatId;

  if (!botToken || !chatId) {
    logger.warn(
      "Telegram bot token or chat ID not configured -- skipping message"
    );
    return null;
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
  logger.info(`Telegram: sending message to chat ${chatId}`);

  try {
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const json = (await response.json()) as TelegramSendMessageResponse;

    if (!json.ok) {
      logger.error("Telegram sendMessage failed", {
        error_code: json.error_code,
        description: json.description,
      });
      return json;
    }

    logger.info(
      `Telegram: message sent (message_id=${json.result?.message_id})`
    );
    return json;
  } catch (err) {
    logger.error("Telegram sendMessage error", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatted alert
// ---------------------------------------------------------------------------

/**
 * Send a formatted alert notification.
 *
 * Format:
 *   [ALERT] Title
 *   ─────────────
 *   Body content here
 *   ─────────────
 *   Timestamp
 */
export async function sendAlert(
  title: string,
  body: string
): Promise<TelegramSendMessageResponse | null> {
  const timestamp = new Date().toISOString();
  const separator = "\u2500".repeat(20);

  const text = [
    `<b>[ALERT] ${escapeHtml(title)}</b>`,
    separator,
    escapeHtml(body),
    separator,
    `<i>${timestamp}</i>`,
  ].join("\n");

  logger.info(`Telegram: sending alert -- ${title}`);
  return sendMessage(text);
}

// ---------------------------------------------------------------------------
// Error notification
// ---------------------------------------------------------------------------

/**
 * Send an error notification with stack trace and context.
 *
 * Format:
 *   [ERROR] Context
 *   ─────────────
 *   Error: message
 *   Stack: (first 3 lines)
 *   ─────────────
 *   Timestamp
 */
export async function sendError(
  error: Error,
  context: string
): Promise<TelegramSendMessageResponse | null> {
  const timestamp = new Date().toISOString();
  const separator = "\u2500".repeat(20);

  // Truncate stack trace to first 3 lines to stay within message limits
  const stackLines = (error.stack ?? "").split("\n").slice(0, 4);
  const truncatedStack = stackLines.join("\n");

  const text = [
    `<b>[ERROR] ${escapeHtml(context)}</b>`,
    separator,
    `<b>Error:</b> <code>${escapeHtml(error.message)}</code>`,
    `<b>Stack:</b>`,
    `<pre>${escapeHtml(truncatedStack)}</pre>`,
    separator,
    `<i>${timestamp}</i>`,
  ].join("\n");

  logger.info(`Telegram: sending error notification -- ${context}`);
  return sendMessage(text);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
