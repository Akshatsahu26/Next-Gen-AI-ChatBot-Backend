require('dotenv').config();
const { searchWeb } = require('./src/services/webSearch.service.js');
async function test() {
  const result = await searchWeb("who is current cm of mp");
  console.log(result);
}
test().catch(console.error);
