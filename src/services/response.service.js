const TEMP_AI_ERROR = '⚠️ AI temporarily unavailable. Please try again.';

/**
 * Builds the final API payload for chat responses.
 * @param {{intent: string, reply: string, source?: string, data?: object, contextDocs?: object[]}} params
 * @returns {object}
 */
const buildChatResponse = ({ intent, reply, source = 'groq', action = null, data = {}, contextDocs = [] }) => ({
  type: String(intent || 'GENERAL').toLowerCase(),
  intent: String(intent || 'GENERAL'),
  source,
  action,
  reply,
  message: reply,
  data,
  retrievedDocs: contextDocs,
  speak: true,
});

/**
 * Builds fallback response for AI failures.
 * @param {string} intent
 * @returns {object}
 */
const buildAIErrorResponse = (intent) => ({
  message: "Server thoda busy hai, please 1 minute baad try karein.",
  fallback: true,
  reply: "Server thoda busy hai, please 1 minute baad try karein.",
  source: 'groq-error',
  intent,
});

module.exports = {
  TEMP_AI_ERROR,
  buildChatResponse,
  buildAIErrorResponse,
};
