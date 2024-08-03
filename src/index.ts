import { parseCli } from "clivo";
import "dotenv/config";

import { loadConfig } from "./config.js";
import { startPolling } from "./telegram.js";

/**
 * Main function that fetches documents, checks them, parses them, sends them and marks them as sent
 */
async function main() {
  const result = parseCli({
    args: process.argv,
    options: [{ letter: "c", name: "config" }],
  });

  if (!result["config"]) {
    throw new Error("Config file is required");
  }

  startPolling(loadConfig(result["config"][0]));
}

main().catch(console.error);
