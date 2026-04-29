/* eslint-disable no-console */
const { INTENTS } = require('../src/services/intent.service');
const { STEP, getSession, resetSession, updateEmiSessionData } = require('../src/services/sessionMemory.service');
const { calculateEMIResult } = require('../src/services/emi.service');

const sessionId = 'memory-test-user';

const turns = ['emi', '100000', '10%', '12 months'];

resetSession(sessionId, INTENTS.EMI);
const session = getSession(sessionId);
session.intent = INTENTS.EMI;
session.step = STEP.ASK_AMOUNT;

console.log('Conversation memory smoke test\n');

turns.forEach((turn) => {
  const result = updateEmiSessionData(session, turn);

  console.log('User:', turn);
  console.log('Step:', session.step);
  console.log('Collected Data:', session.data);
  console.log('Missing:', result.missing);
  console.log('---');
});

if (session.step === STEP.READY) {
  const emi = calculateEMIResult({
    principal: session.data.amount,
    annualInterest: session.data.interestRate,
    months: session.data.durationMonths,
  });

  console.log('Computed EMI Result:', emi);
} else {
  console.log('Session did not reach READY state.');
}
