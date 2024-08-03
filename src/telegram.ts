import { sendTelegramMessage } from "cinnagram";
import https from "https";

import { Config, TriggerGroup } from "./types.js";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const SPECIFIC_CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID || "") || 0;
const TELEGRAM_API_POLLING_TIME =
  parseInt(process.env.TELEGRAM_API_POLLING_TIME || "30") || 30;

let lastUpdateId = 0;

/**
 * Get updates from Telegram API
 * @param config
 */
export function startPolling(config: Config) {
  console.log(
    `Awaiting updates from Telegram API for ${TELEGRAM_API_POLLING_TIME} seconds...`,
  );
  https
    .get(
      `${TELEGRAM_API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=${TELEGRAM_API_POLLING_TIME}&allowed_updates=["message"]`,
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          let timeout = 200;
          try {
            const updates = JSON.parse(data);
            if (updates.ok) {
              if (updates.result.length === 0) {
                console.log("No new updates.");
              } else {
                updates.result?.forEach((update: any) => {
                  lastUpdateId = update.update_id;
                  handleUpdate(update, config);
                });
              }
            } else {
              timeout = 10000;
            }
          } catch (error) {
            timeout = 10000;
            console.error("Error parsing JSON response:", error);
          } finally {
            setTimeout(startPolling, timeout, config);
          }
        });
      },
    )
    .on("error", (err) => {
      console.error("Error fetching updates:", err);
      setTimeout(startPolling, 7500, config);
    });
}

/**
 *
 * @param update
 */
function getSenderInfo(update: any): string {
  return `${update.message.from.username} (${update.message.from.id}) of ${update.message.chat.type} '${update.message.chat.title}' (${update.message.chat.id})`;
}

/**
 *
 * @param text
 */
function processMessageText(text: string): string {
  return text.toLowerCase();
}

/**
 *
 * @param group
 */
function getRandomTimeThreshold(group: TriggerGroup): number {
  return (
    Math.floor(
      Math.random() * (group.timeThresholdMax - group.timeThresholdMin + 1),
    ) + group.timeThresholdMin
  );
}

/**
 *
 * @param group
 * @param chatId
 * @param messageId
 */
function sendReply(
  group: TriggerGroup,
  chatId: number,
  messageId: number,
): void {
  const replyIndex = Math.floor(Math.random() * group.replies.length);
  const reply = group.replies[replyIndex];
  console.log(`Sending reply: ${reply} to chatId: ${chatId}`);
  sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply, "html", {
    reply_parameters: { message_id: messageId },
  });
  group.futureTrigger = Date.now() + getRandomTimeThreshold(group) * 60000;
  console.log(
    `Updated futureTrigger for group ${group.name}: next in ~${getTimeLeft(group.futureTrigger)} minutes`,
  );
}

/**
 *
 * @param future
 */
function getTimeLeft(future: number) {
  return Math.round((future - Date.now()) / 60000);
}

/**
 *
 * @param update
 * @param config
 */
function handleUpdate(update: any, config: Config) {
  if (update.message && update.message.text) {
    const messageText = processMessageText(update.message.text);
    const chatId = update.message.chat.id;
    const senderInfo = getSenderInfo(update);

    if (!SPECIFIC_CHAT_ID || chatId === SPECIFIC_CHAT_ID) {
      console.log(`Accept ${senderInfo}: ${messageText}`);
      const acceptableTriggers: { group: TriggerGroup; trigger: string }[] = [];

      for (const group of config.groups) {
        for (const word of group.triggers) {
          if (messageText.includes(word)) {
            console.log(
              `Found acceptable trigger: ${word} in group ${group.name}`,
            );
            if (group.futureTrigger && Date.now() < group.futureTrigger) {
              console.log(
                `Skipping group ${group.name} due to time threshold (~${getTimeLeft(group.futureTrigger)} minutes left)`,
              );
              break;
            }
            acceptableTriggers.push({ group, trigger: word });
          }
        }
      }

      if (acceptableTriggers.length > 0) {
        const selectedTrigger =
          acceptableTriggers[
            Math.floor(Math.random() * acceptableTriggers.length)
          ];
        console.log(
          `Selected trigger ${selectedTrigger.trigger} from group ${selectedTrigger.group.name}`,
        );
        sendReply(selectedTrigger.group, chatId, update.message.message_id);
      } else {
        console.log(
          `No acceptable triggers found for message '${messageText}'`,
        );
      }
    } else {
      console.log("Reject", senderInfo);
    }
  }
}
