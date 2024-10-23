export class MarkovChain {
  chain: Record<string, any[]>;
  constructor(sentences: string[]) {
    this.chain = {};
    this.buildChain(sentences);
  }

  buildChain(sentences: any) {
    for (const sentence of sentences) {
      const words = sentence.split(" ");
      for (let i = 0; i < words.length - 1; i++) {
        const word = words[i];
        const nextWord = words[i + 1];
        if (!this.chain[word]) {
          this.chain[word] = [];
        }
        this.chain[word].push(nextWord);
      }
    }
  }

  generateSentence(
    maxLength: number,
    startWord: string,
    startSentence?: string,
  ) {
    let sentence = startSentence || "";
    let currentWord = startWord;
    for (let i = 0; i < maxLength; i++) {
      const nextWord = this.getNextWord(currentWord);
      if (!nextWord) {
        break;
      }
      sentence += (sentence ? " " : "") + nextWord;
      currentWord = nextWord;
    }
    return sentence;
  }

  getNextWord(word: number | string) {
    if (!this.chain[word]) {
      return null;
    }
    const nextWords = this.chain[word];

    const randomIndex = Math.floor(Math.random() * nextWords.length);
    return nextWords[randomIndex];
  }
}
