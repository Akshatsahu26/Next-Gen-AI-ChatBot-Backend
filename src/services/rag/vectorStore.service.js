const {
  buildVocabulary,
  toVector,
  cosineSimilarity,
} = require('./embedding.service');

class InMemoryVectorStore {
  constructor(documents = []) {
    this.documents = documents.map((doc) => ({
      ...doc,
      searchableText: `${doc.title || ''} ${doc.topic || ''} ${doc.content || ''} ${(doc.tags || []).join(' ')}`,
    }));

    this.vocabulary = buildVocabulary(this.documents.map((doc) => doc.searchableText));
    this.documentVectors = this.documents.map((doc) => toVector(doc.searchableText, this.vocabulary));
  }

  search(query, topK = 4) {
    const queryVector = toVector(query, this.vocabulary);

    return this.documents
      .map((doc, index) => ({
        doc,
        score: cosineSimilarity(queryVector, this.documentVectors[index]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter((item) => item.score > 0)
      .map((item) => ({
        id: item.doc.id,
        topic: item.doc.topic,
        title: item.doc.title,
        content: item.doc.content,
        tags: item.doc.tags,
        score: Number(item.score.toFixed(4)),
      }));
  }
}

module.exports = {
  InMemoryVectorStore,
};
