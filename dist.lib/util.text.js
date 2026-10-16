const SENTENCE_DELIMITER_REGEX = /(?<=\p{Sentence_Terminal})\s|\n|\r/gu;
function tokenizeSentences(text) {
  return text.split(SENTENCE_DELIMITER_REGEX).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
}
function transformWithRanking(text, ratio, rankSentencesFn, noEmpty = false) {
  const sentences = tokenizeSentences(text);
  const k = Math.min(
    Math.max(
      Math.ceil(sentences.length * ratio),
      +noEmpty
    ),
    sentences.length
  );
  if (sentences.length <= k) return sentences.join("\n");
  const keptSentenceCounts = /* @__PURE__ */ new Map();
  for (const sentence of rankSentencesFn([...sentences]).slice(0, k)) {
    keptSentenceCounts.set(sentence, (keptSentenceCounts.get(sentence) ?? 0) + 1);
  }
  return sentences.filter((sentence) => {
    const keptSentenceCount = keptSentenceCounts.get(sentence) ?? 0;
    if (!keptSentenceCount) return false;
    keptSentenceCounts.set(sentence, keptSentenceCount - 1);
    return true;
  }).join("\n");
}
const TEXT_ENCODER = new TextEncoder();
function getByteLength(text) {
  return TEXT_ENCODER.encode(text).length;
}
function getSizeRatio(snapshotSize, originalSize) {
  if (originalSize === 0) return snapshotSize === 0 ? 1 : Infinity;
  return snapshotSize / originalSize;
}
export {
  getByteLength,
  getSizeRatio,
  tokenizeSentences,
  transformWithRanking
};
