import * as fs from "fs";
import * as path from "path";

import { Config } from "./types.js";

/**
 * Load the configuration from the given path
 * @param configPath
 * @param markovPath
 */
export function loadConfig(configPath?: string, markovPath?: string): Config {
  let config: Config = {};

  if (configPath) {
    const configPathResolved = path.resolve(configPath);
    console.log("Loading config", configPathResolved);
    const fileContent = fs.readFileSync(configPathResolved, "utf-8");
    config = JSON.parse(fileContent) as Config;
  }

  if (markovPath) {
    const markovPathResolved = path.resolve(markovPath);
    console.log("Loading markov", markovPathResolved);
    const fileContent = fs.readFileSync(markovPathResolved, "utf-8");
    config.markov = JSON.parse(fileContent) as string[];
  }

  config.groups?.forEach((group, index) => {
    group.name = `${group.triggers[0]}-${group.triggers.length}-${group.replies.length}-${index}`;
    group.triggers = group.triggers.map((trigger) => trigger.toLowerCase());
    group.futureTrigger = {};
    if (!group.timeThresholdMin && !group.timeThresholdMax) {
      group.timeThresholdMin = 1;
      group.timeThresholdMax = 60;
    } else if (!group.timeThresholdMin) {
      group.timeThresholdMin = group.timeThresholdMax;
    } else if (!group.timeThresholdMax) {
      group.timeThresholdMax = group.timeThresholdMin;
    }
  });
  if (!config.replyThresholdMin && !config.replyThresholdMax) {
    config.replyThresholdMin = 10;
    config.replyThresholdMax = 40;
  } else if (!config.replyThresholdMin) {
    config.replyThresholdMin = config.replyThresholdMax;
  } else if (!config.replyThresholdMax) {
    config.replyThresholdMax = config.replyThresholdMin;
  }
  return config;
}
