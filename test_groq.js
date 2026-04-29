require('dotenv').config();
console.log('API_KEY:', process.env.GROQ_API_KEY ? 'exists' : 'missing');
const { generateGroqResponse } = require('./src/services/groqAI');
generateGroqResponse({ message: 'hello', intent: 'GENERAL', docs: [], previousConversation: [] })
  .then(res => console.log('SUCCESS:', res))
  .catch(err => console.error('ERROR:', err.message));
