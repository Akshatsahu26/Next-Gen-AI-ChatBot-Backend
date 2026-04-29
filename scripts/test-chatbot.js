/* eslint-disable no-console */
const { detectIntent } = require('../src/services/intent.service');
const { handleEMI, handleFraud, handleLoan } = require('../src/services/business.service');
const { retrieveRelevantDocuments } = require('../src/services/rag/rag.service');

const testMessages = [
  'hello',
  'emi',
  'emi 100000 10 12',
  'fraud message received',
  'loan not working',
];

const run = () => {
  console.log('Running chatbot pipeline smoke checks...\n');

  testMessages.forEach((message) => {
    const intent = detectIntent(message);
    const docs = retrieveRelevantDocuments(message, 3);

    const business =
      intent === 'EMI'
        ? handleEMI(message)
        : intent === 'FRAUD'
          ? handleFraud(message)
          : intent === 'LOAN'
            ? handleLoan(message)
            : { handled: false };

    console.log('----------------------------------------');
    console.log(`Message: ${message}`);
    console.log(`Intent : ${intent}`);
    console.log('Business Layer Output:', business);
    console.log(
      'Top RAG Docs:',
      docs.map((doc) => `${doc.topic}:${doc.title} (${doc.score})`).join(' | ') || 'None'
    );
  });

  console.log('\nDone.');
};

run();
