import * as fs from "fs";
import * as path from "path";

import { Config } from "./types.js";

/**
 * Load the configuration from the given path
 * @param configPath
 */
export function loadConfig(configPath: string): Config {
  const configPathResolved = path.resolve(configPath);
  const fileContent = fs.readFileSync(configPathResolved, "utf-8");
  const config: Config = JSON.parse(fileContent);
  config.groups.forEach((group, index) => {
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
