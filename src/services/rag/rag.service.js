const { KNOWLEDGE_BASE } = require('../../data/knowledgeBase');
const { InMemoryVectorStore } = require('./vectorStore.service');

const vectorStore = new InMemoryVectorStore(KNOWLEDGE_BASE);

/**
 * Retrieves relevant context documents for a user query.
 * @param {string} message
 * @param {number} topK
 * @returns {Array<{id: string, topic: string, title: string, content: string, tags: string[], score: number}>}
 */
const retrieveRelevantDocuments = (message, topK = 4) => {
  return vectorStore.search(String(message || ''), topK);
};

module.exports = {
  retrieveRelevantDocuments,
};
