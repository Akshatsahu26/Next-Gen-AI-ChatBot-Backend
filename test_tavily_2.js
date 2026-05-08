require('dotenv').config();
const { searchWeb } = require('./src/services/webSearch.service.js');
async function test() {
  console.log("Key exists:", !!process.env.TAVILY_API_KEY);
  const result = await searchWeb("who is current cm of mp");
  console.log("Result:", result);
}
test().catch(console.error);
