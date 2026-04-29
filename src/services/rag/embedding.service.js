const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const buildVocabulary = (documents) => {
  const terms = new Set();

  documents.forEach((doc) => {
    tokenize(doc).forEach((token) => terms.add(token));
  });

  return Array.from(terms);
};

const toVector = (text, vocabulary) => {
  const tokenCounts = new Map();
  const tokens = tokenize(text);

  tokens.forEach((token) => {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  });

  const denominator = tokens.length || 1;

  return vocabulary.map((term) => (tokenCounts.get(term) || 0) / denominator);
};

const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = {
  tokenize,
  buildVocabulary,
  toVector,
  cosineSimilarity,
};
