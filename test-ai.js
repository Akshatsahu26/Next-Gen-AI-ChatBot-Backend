require('dotenv').config();
const { getAIResponse } = require('./src/services/ai.service');

async function test() {
  try {
    const res = await getAIResponse('hello');
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
