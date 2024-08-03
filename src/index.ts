import { parseCli } from "clivo";
import "dotenv/config";

import { CINNABAR_PROJECT_VERSION } from "./cinnabar.js";
import { loadConfig } from "./config.js";
import { startPolling } from "./telegram.js";

/**
 * Main function that fetches documents, checks them, parses them, sends them and marks them as sent
 */
async function main() {
  const printIntro = () => {
    const design1 = "=".repeat(4);
    const text = `${design1} Triggram v${CINNABAR_PROJECT_VERSION} ${design1}`;
    const design2 = "=".repeat(text.length);
    console.log(`\n${design2}\n${text}\n${design2}\n`);
  };
  printIntro();

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
