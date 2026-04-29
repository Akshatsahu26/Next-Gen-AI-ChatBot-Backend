const { generateGroqResponse } = require('./groqAI');
const { retrieveRelevantDocuments } = require('./rag/rag.service');
const { TEMP_AI_ERROR } = require('./response.service');

/**
 * Backward-compatible AI response helper that now uses Groq only.
 * @param {string} userMessage
 * @param {string} intentType
 * @param {object} context
 * @returns {Promise<{text: string, source: string}>}
 */
const handleAIResponse = async (userMessage, intentType = 'GENERAL', context = {}) => {
  try {
    const docs = retrieveRelevantDocuments(userMessage, 4);
    const response = await generateGroqResponse({
      message: userMessage,
      intent: intentType,
      docs,
      businessContext: context,
      sessionData: context,
      previousConversation: '',
    });

    return {
      text: response.text,
      source: 'groq',
    };
  } catch (err) {
  console.error("AI ERROR:", err.message);

  return {
    text: "⚠️ Temporary issue. Please try again.",
    source: 'groq-error',
  };
}
};

const getHybridAIResponse = async ({ userMessage, intentType, context }) => {
  const result = await handleAIResponse(userMessage, intentType, context);
  return result.text;
};

module.exports = {
  getHybridAIResponse,
  handleAIResponse,
};
