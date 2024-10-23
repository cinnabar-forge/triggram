#!/usr/bin/env node

import { parseCli } from "clivo";
import fs from "fs";

const result = parseCli({
  args: process.argv,
  options: [
    { letter: "i", name: "input" },
    { letter: "u", name: "user" },
    { letter: "o", name: "output" },
  ],
});

const inputFile = result.input[0];
const outputFile = result.output[0];
const userId = result.user[0];

fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  const chatData = JSON.parse(data);
  const userMessages = chatData.messages.filter(message => message.from_id === ("user" + userId) && !message.forwarded_from);

  const cleanedText = userMessages.flatMap(message => {
    if (message.text_entities) {
      return message.text_entities.map(entity => entity.text).join('');
      // return '';
    } else {
      return '';
    }
  }).filter(text => text.trim() !== '');

  fs.writeFile(outputFile, JSON.stringify(cleanedText, null, 2), () => {})
});
