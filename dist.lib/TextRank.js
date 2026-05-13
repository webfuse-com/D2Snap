function initArray(n) {
  return Array.from({ length: n }, () => null);
}
function tokenizeSentences(text) {
  return text.split(/(?<=\p{Sentence_Terminal})\s|\n|\r/gu).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
}
function textRank(sentences, options = {}) {
  if (!sentences.length) return [];
  const optionsWithDefaults = {
    damping: 0.75,
    maxIterations: 20,
    minSimilarity: 0.1,
    tolerance: 1e-4,
    ...options
  };
  const sentenceCount = sentences.length;
  const termFrequencyPerSentence = initArray(sentenceCount);
  const sentenceVectorNorms = new Float64Array(sentenceCount);
  const tokenPattern = /[a-z0-9]+/g;
  for (let i = 0; i < sentenceCount; i++) {
    const termFrequencies = /* @__PURE__ */ new Map();
    const lowercaseSentence = sentences[i].toLowerCase();
    let tokenMatch;
    while ((tokenMatch = tokenPattern.exec(lowercaseSentence)) !== null) {
      const token = tokenMatch[0];
      const previousCount = termFrequencies.get(token) ?? 0;
      termFrequencies.set(token, previousCount + 1);
    }
    termFrequencyPerSentence[i] = termFrequencies;
    let sumOfSquaredCounts = 0;
    for (const count of termFrequencies.values()) {
      sumOfSquaredCounts += count * count;
    }
    sentenceVectorNorms[i] = Math.sqrt(sumOfSquaredCounts);
  }
  const tokenPostings = /* @__PURE__ */ new Map();
  for (let i = 0; i < sentenceCount; i++) {
    for (const token of termFrequencyPerSentence[i].keys()) {
      let postingList = tokenPostings.get(token);
      if (!postingList) {
        postingList = [];
        tokenPostings.set(token, postingList);
      }
      postingList.push(i);
    }
  }
  const neighborIndicesPerSentence = initArray(sentenceCount);
  const neighborWeightsPerSentence = initArray(sentenceCount);
  const weightedOutDegree = new Float64Array(sentenceCount);
  const dotProductAccumulator = new Float64Array(sentenceCount);
  const touchedNeighbors = [];
  for (let i = 0; i < sentenceCount; i++) {
    const sourceNorm = sentenceVectorNorms[i];
    if (sourceNorm === 0) {
      neighborIndicesPerSentence[i] = [];
      neighborWeightsPerSentence[i] = new Float64Array(0);
      continue;
    }
    const sourceTermFrequencies = termFrequencyPerSentence[i];
    for (const [token, sourceCount] of sourceTermFrequencies) {
      const postingList = tokenPostings.get(token);
      for (let j = 0; j < postingList.length; j++) {
        const targetIndex = postingList[j];
        if (targetIndex === i) continue;
        if (dotProductAccumulator[targetIndex] === 0) {
          touchedNeighbors.push(targetIndex);
        }
        const targetCount = termFrequencyPerSentence[targetIndex].get(token);
        dotProductAccumulator[targetIndex] += sourceCount * targetCount;
      }
    }
    const neighborIndices = [];
    const neighborWeights = [];
    let outDegreeSum = 0;
    for (let k = 0; k < touchedNeighbors.length; k++) {
      const targetIndex = touchedNeighbors[k];
      const dotProduct = dotProductAccumulator[targetIndex];
      const targetNorm = sentenceVectorNorms[targetIndex];
      if (dotProduct > 0 && targetNorm > 0) {
        const cosineSimilarity = dotProduct / (sourceNorm * targetNorm);
        if (cosineSimilarity > optionsWithDefaults.minSimilarity) {
          neighborIndices.push(targetIndex);
          neighborWeights.push(cosineSimilarity);
          outDegreeSum += cosineSimilarity;
        }
      }
      dotProductAccumulator[targetIndex] = 0;
    }
    touchedNeighbors.length = 0;
    neighborIndicesPerSentence[i] = neighborIndices;
    neighborWeightsPerSentence[i] = Float64Array.from(neighborWeights);
    weightedOutDegree[i] = outDegreeSum;
  }
  let currentScores = new Float64Array(sentenceCount).fill(1);
  let nextScores = new Float64Array(sentenceCount);
  const damping = optionsWithDefaults.damping;
  const teleportTerm = 1 - damping;
  const tolerance = optionsWithDefaults.tolerance;
  const maxIterations = optionsWithDefaults.maxIterations;
  for (let i = 0; i < maxIterations; i++) {
    let totalAbsoluteDelta = 0;
    for (let j = 0; j < sentenceCount; j++) {
      const neighborIndices = neighborIndicesPerSentence[j];
      const neighborWeights = neighborWeightsPerSentence[j];
      let weightedScoreSum = 0;
      for (let k = 0; k < neighborIndices.length; k++) {
        const neighborIndex = neighborIndices[k];
        const neighborOutDegree = weightedOutDegree[neighborIndex];
        if (neighborOutDegree > 0) {
          weightedScoreSum += neighborWeights[k] / neighborOutDegree * currentScores[neighborIndex];
        }
      }
      const updatedScore = teleportTerm + damping * weightedScoreSum;
      const scoreDifference = updatedScore - currentScores[j];
      nextScores[j] = updatedScore;
      totalAbsoluteDelta += scoreDifference < 0 ? -scoreDifference : scoreDifference;
    }
    const swapBuffer = currentScores;
    currentScores = nextScores;
    nextScores = swapBuffer;
    if (totalAbsoluteDelta < tolerance * sentenceCount) break;
  }
  return sentences.map((sentence, i) => ({
    sentence,
    index: i,
    score: currentScores[i]
  })).sort((a, b) => b.score - a.score);
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
