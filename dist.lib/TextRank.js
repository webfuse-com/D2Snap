function initArray(n, value = 0) {
  return Array.from({ length: n }, () => value);
}
function initMatrix(n, m = n) {
  return initArray(n).map(() => initArray(m));
}
function tokenizeSentences(text) {
  return text.replace(/[^\w\s.?!:]+/g, "").split(/[.?!:]\s|\n|\r/g).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
}
function textRank(textOrSentences, k = 3, options = {}) {
  if (!textOrSentences.length) return "";
  const sentences = !Array.isArray(textOrSentences) ? tokenizeSentences(textOrSentences) : textOrSentences;
  if (sentences.length <= k) return sentences.join("\n");
  const optionsWithDefaults = {
    damping: 0.75,
    maxIterations: 20,
    maxSentences: Infinity,
    ...options
  };
  const sentenceTokens = sentences.map((sentence) => sentence.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => !!token.trim())).slice(0, optionsWithDefaults.maxSentences);
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
  }).sort((a, b) => b.score - a.score).slice(0, Math.min(k, sentences.length)).sort((a, b) => a.index - b.index).map((obj) => obj.sentence).join("\n");
}
function relativeTextRank(text, ratio = 0.5, options = {}, noEmpty = false) {
  const sentences = tokenizeSentences(text);
  const k = Math.max(
    Math.round(sentences.length * ratio),
    1
  );
  return textRank(sentences, Math.max(k, +noEmpty), options);
}
export {
  relativeTextRank,
  textRank,
  tokenizeSentences
};
