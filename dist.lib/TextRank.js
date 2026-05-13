function initArray(n, value = 0) {
  return Array.from({ length: n }, () => value);
}
function initMatrix(n, m = n) {
  return initArray(n).map(() => initArray(m));
}
function tokenizeSentences(text) {
  return text.split(/(?<=\p{Sentence_Terminal})\s|\n|\r/gu).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
}
function textRank(sentences, options = {}) {
  if (!sentences.length) return [];
  const optionsWithDefaults = {
    damping: 0.75,
    maxIterations: 20,
    ...options
  };
  const sentenceTokens = sentences.map((sentence) => sentence.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => !!token.trim()));
  const n = sentences.length;
  const similarityMatrix = initMatrix(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const vector1 = [];
      const vector2 = [];
      for (const token of new Set(sentenceTokens[i].concat(sentenceTokens[j]))) {
        vector1.push(sentenceTokens[i].filter((w) => w === token).length);
        vector2.push(sentenceTokens[j].filter((w) => w === token).length);
      }
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i2 = 0; i2 < vector1.length; i2++) {
        dotProduct += vector1[i2] * vector2[i2];
        normA += vector1[i2] * vector1[i2];
        normB += vector2[i2] * vector2[i2];
      }
      similarityMatrix[i][j] = dotProduct / (normA ** 0.5 * normB ** 0.5 + 1e-10);
    }
  }
  const scores = initArray(n, 1);
  for (let iteration = 0; iteration < optionsWithDefaults.maxIterations; iteration++) {
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let norm = 0;
        for (let i2 = 0; i2 < similarityMatrix[j].length; i2++) {
          norm += similarityMatrix[j][i2] * similarityMatrix[i2][i2];
        }
        sum += similarityMatrix[j][i] / (norm || 1) * scores[j];
      }
      scores[i] = optionsWithDefaults.damping * sum + (1 - optionsWithDefaults.damping);
    }
  }
  return sentences.map((sentence, i) => {
    return {
      sentence,
      index: i,
      score: scores[i]
    };
  }).sort((a, b) => b.score - a.score);
}
function transform(text, ratio = 0.5, simple = false, noEmpty = false, textRankOptions = {}) {
  const sentences = tokenizeSentences(text);
  const k = Math.min(
    Math.max(
      Math.round(sentences.length * ratio),
      +noEmpty
    ),
    sentences.length
  );
  if (sentences.length <= k) return sentences.join("\n");
  if (simple) {
    return sentences.slice(0, k).join("\n");
  }
  return textRank(sentences, textRankOptions).slice(0, k).sort((a, b) => a.index - b.index).map((obj) => obj.sentence).join("\n");
}
export {
  textRank,
  tokenizeSentences,
  transform
};
