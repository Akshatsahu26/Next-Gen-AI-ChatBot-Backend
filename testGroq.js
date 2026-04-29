require('dotenv').config();
const { generateGroqResponse } = require('./src/services/groqAI');
console.log('API_KEY:', process.env.GROQ_API_KEY ? 'exists' : 'missing');

generateGroqResponse({ message: 'hello', intent: 'GENERAL', docs: [], previousConversation: [] })
  .then(res => console.log('SUCCESS:', res))
  .catch(err => {
     console.error('PROMISE CATCH ERROR:', err);
  });
