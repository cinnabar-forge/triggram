/* eslint-disable sonarjs/no-duplicate-string */
import { sendTelegramMessage } from "cinnagram";
import https from "https";

import { MarkovChain } from "./markov.js";
import { Config, TriggerGroup } from "./types.js";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const SPECIFIC_CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID || "") || 0;
const TELEGRAM_API_POLLING_TIME =
  parseInt(process.env.TELEGRAM_API_POLLING_TIME || "30") || 30;
const APP_START_TIME = Date.now() / 1000;

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
 * @param config
 * @param group
 * @param chatId
 * @param messageId
 */
function sendTriggeredReply(
  config: Config,
  group: TriggerGroup,
  chatId: number,
  messageId: number,
): void {
  const replyThresholdMax = config.replyThresholdMax || 0;
  const replyThresholdMin = config.replyThresholdMin || 0;
  const delay =
    replyThresholdMin === 0 && replyThresholdMax === 0
      ? 0
      : Math.floor(
          Math.random() * (replyThresholdMax - replyThresholdMin + 1) +
            replyThresholdMin,
        );

  const replyIndex = Math.floor(Math.random() * group.replies.length);
  const reply = group.replies[replyIndex];
  console.log(
    `Sending reply "${reply}" to message ${messageId} in chatId ${chatId} in ${delay} seconds`,
  );
  group.futureTrigger[chatId] =
    Date.now() + getRandomTimeThreshold(group) * 60000;
  console.log(
    `Updated futureTrigger for group ${group.name}: next in ~${getTimeLeft(group.futureTrigger[chatId])} minutes`,
  );

  const sendMessage = () => {
    console.log(
      `Triggered reply to message ${messageId} in chatId ${chatId} sent`,
    );
    sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply, "html", {
      reply_parameters: { message_id: messageId },
    });
  };

  if (delay === 0) {
    sendMessage();
  } else {
    setTimeout(sendMessage, delay * 1000);
  }
}

/**
 *
 * @param chatId
 * @param messageId
 * @param reply
 */
function sendReply(chatId: number, messageId: number, reply: string): void {
  if (!reply) {
    return;
  }
  const replyThresholdMax = 4;
  const replyThresholdMin = 8;

  const delay = Math.floor(
    Math.random() * (replyThresholdMax - replyThresholdMin + 1) +
      replyThresholdMin,
  );

  console.log(
    `Sending reply "${reply}" to message ${messageId} in chatId ${chatId} in ${delay} seconds`,
  );

  const sendMessage = () => {
    console.log(`Reply to message ${messageId} in chatId ${chatId} sent`);
    sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply, "html", {
      reply_parameters: { message_id: messageId },
    });
  };

  if (delay === 0) {
    sendMessage();
  } else {
    setTimeout(sendMessage, delay * 1000);
  }
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
async function handleUpdate(update: any, config: Config) {
  if (!update.message || !update.message.text) {
    return;
  }

  const senderInfo = getSenderInfo(update);

  if (update.message.date <= APP_START_TIME) {
    console.log("Reject outdated message from", senderInfo);
    return;
  }

  const messageText = processMessageText(update.message.text);
  const chatId = update.message.chat.id;

  if (SPECIFIC_CHAT_ID && chatId !== SPECIFIC_CHAT_ID) {
    console.log("Reject", senderInfo);
    return;
  }

  console.log(`Accept ${senderInfo}: ${messageText}`);
  const acceptableTriggers: { group: TriggerGroup; trigger: string }[] = [];

  if (config.groups) {
    for (const group of config.groups) {
      for (const word of group.triggers) {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`(^|\\P{L})${word}($|\\P{L})`, "iu");
        if (regex.test(messageText)) {
          if (group.futureTrigger && Date.now() < group.futureTrigger[chatId]) {
            console.log(
              `Skipping group ${group.name} due to time threshold (~${getTimeLeft(group.futureTrigger[chatId])} minutes left)`,
            );
            break;
          }
          console.log(
            `Found acceptable trigger: ${word} in group ${group.name}`,
          );
          acceptableTriggers.push({ group, trigger: word });
        }
      }
    }
  }

  if (acceptableTriggers.length > 0) {
    const selectedTrigger =
      acceptableTriggers[Math.floor(Math.random() * acceptableTriggers.length)];
    console.log(
      `Selected trigger ${selectedTrigger.trigger} from group ${selectedTrigger.group.name}`,
    );
    sendTriggeredReply(
      config,
      selectedTrigger.group,
      chatId,
      update.message.message_id,
    );
    return;
  }

  const { markov } = config;

  if (markov) {
    const splittedMessageText = messageText.split(" ");
    const randomWord =
      splittedMessageText[
        Math.floor(Math.random() * splittedMessageText.length)
      ];

    const markovChain = new MarkovChain(markov);

    const answer = markovChain.generateSentence(
      Math.random() * 50 + 10,
      randomWord,
      randomWord,
    );

    console.log(
      `Generated a markov string '${answer}' based on '${randomWord}'`,
    );

    sendReply(chatId, update.message.message_id, answer);
  }
}
