require('dotenv').config();
const { detectIntent } = require('./src/services/intent.service.js');
const { searchWeb } = require('./src/services/webSearch.service.js');

async function test() {
  const message = "current cm of mp";
  const detectedIntentResult = detectIntent(message);
  const detectedIntent = detectedIntentResult.intent;
  console.log("detectedIntent:", detectedIntent);
  
  let liveWebContext = null;
  if (detectedIntent === 'GENERAL') {
    liveWebContext = await searchWeb(message);
  }
  console.log("liveWebContext:", liveWebContext);
  
  const { generateGroqResponse } = require('./src/services/groqAI.js');
  const groqResult = await generateGroqResponse({
    message,
    intent: detectedIntent,
    docs: [],
    businessContext: {},
    sessionData: {},
    previousConversation: '',
    liveWebContext
  });
  
  console.log("Groq Result:", groqResult.text);
}
test().catch(console.error);
