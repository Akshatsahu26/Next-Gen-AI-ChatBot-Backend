const { detectIntent, INTENTS } = require('../services/intent.service');
const { retrieveRelevantDocuments } = require('../services/rag/rag.service');
const { handleFraud, handleLoan } = require('../services/business.service');
const { generateGroqResponse } = require('../services/groqAI');
const { buildChatResponse, buildAIErrorResponse } = require('../services/response.service');
const { calculateEMIResult } = require('../services/emi.service');
const Transaction = require('../../models/Transaction');
const {
  userSessions,
  STEP,
  getSession,
  saveSession,
  appendTurn,
  getPreviousConversation,
  resetSession,
  updateEmiSessionData,
} = require('../services/sessionMemory.service');

const getSessionId = (req) => String(req.body?.sessionId || req.body?.userId || 'guest-session');

const extractTransferFromMessage = (message) => {
  const normalized = String(message || '').toLowerCase();
  const accountMatch = normalized.match(/\b\d{10,18}\b/);
  const amountMatch = normalized.match(/(?:rs|inr|₹)?\s*(\d+(?:[.,]\d+)*)/i);

  if (!accountMatch || !amountMatch) return null;

  const receiver = accountMatch[0];
  const amount = Number(String(amountMatch[1]).replace(/,/g, ''));

  if (!receiver || Number.isNaN(amount) || amount <= 0) return null;

  return { receiver, amount };
};

const extractAccountNumber = (message) => {
  const normalized = String(message || '').toLowerCase();
  const accountMatch = normalized.match(/\b\d{10,18}\b/);
  return accountMatch ? accountMatch[0] : null;
};

const isBalanceQuery = (message) => {
  const normalized = String(message || '').toLowerCase();
  return [
    'balance',
    'bal',
    'account balance',
    'mera balance',
    'balance bata',
    'balance batao',
    'check balance',
    'kitna balance',
  ].some((phrase) => normalized.includes(phrase));
};

const isSpendingAnalysisQuery = (message) => {
  const normalized = String(message || '').toLowerCase();
  return [
    'highest spend',
    'most spend',
    'most spending',
    'monthly spend',
    'where i spend',
    'where my money goes',
    'sabse jada',
    'sabse zyada',
    'jyada paise',
    'maximum spending',
    'top category',
    'expenses breakdown',
  ].some((phrase) => normalized.includes(phrase));
};

const resolveIntent = (session, detectedIntent) => {
  if (
    session.intent === INTENTS.EMI &&
    session.step !== STEP.READY &&
    (detectedIntent === INTENTS.GENERAL || detectedIntent === INTENTS.EMI)
  ) {
    return INTENTS.EMI;
  }

  if (detectedIntent !== INTENTS.GENERAL) {
    return detectedIntent;
  }

  return session.intent || INTENTS.GENERAL;
};

const buildBusinessContext = ({ intent, session, message }) => {
  if (intent === INTENTS.EMI) {
    const { missing } = updateEmiSessionData(session, message);
    const context = {
      conversation: {
        intent: INTENTS.EMI,
        step: session.step,
        missing,
        collectedData: session.data,
      },
      instructions: 'If data is incomplete, ask the next missing EMI detail naturally.',
    };

    if (session.step === STEP.READY) {
      const emiResult = calculateEMIResult({
        principal: session.data.amount,
        annualInterest: session.data.interestRate,
        months: session.data.durationMonths,
      });

      context.emiCalculation = {
        principal: session.data.amount,
        annualInterest: session.data.interestRate,
        months: session.data.durationMonths,
        ...emiResult,
      };
      context.instructions =
        'Explain EMI result clearly with monthly EMI, total interest, and total payable. Be concise and helpful.';
    }

    return context;
  }

  if (intent === INTENTS.FRAUD) {
    return {
      conversation: {
        intent,
        step: 'GUIDE_USER',
      },
      fraudGuidance: handleFraud(message),
    };
  }

  if (intent === INTENTS.LOAN) {
    return {
      conversation: {
        intent,
        step: 'GUIDE_USER',
      },
      loanGuidance: handleLoan(message),
    };
  }

  if (intent === INTENTS.TRANSACTION) {
    return {
      conversation: {
        intent,
        step: 'GUIDE_USER',
      },
      transactionChecklist: [
        'Verify beneficiary/account details',
        'Check UTR/reference number',
        'Confirm bank settlement window',
        'Raise complaint ticket if unresolved',
      ],
    };
  }

  return {
    conversation: {
      intent: INTENTS.GENERAL,
      step: 'OPEN_CHAT',
    },
  };
};

const handleChat = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const sessionId = getSessionId(req);
    const userId = req.body?.userId;

    if (!message) {
      return res.status(400).json({
        type: 'general',
        message: 'message is required',
      });
    }

    if (isSpendingAnalysisQuery(message)) {
      if (!userId) {
        return res.status(200).json({
          type: 'general',
          message: 'Balance/spending check ke liye please login kar ke dobara poochhiye.',
          reply: 'Aapka spending analysis dekhne ke liye login zaroori hai.',
          speak: true,
        });
      }

      const debitTransactions = await Transaction.find({
        userId: String(userId),
        type: 'debit',
      }).lean();

      if (!debitTransactions.length) {
        return res.status(200).json({
          type: 'general',
          message: 'Abhi tak koi debit transaction nahi mila.',
          reply: 'Abhi tak koi debit transaction nahi mila. Jaise hi aap spend karenge, main analysis bata dunga.',
          speak: true,
        });
      }

      const categoryTotals = debitTransactions.reduce((acc, tx) => {
        const category = String(tx.category || 'others');
        acc[category] = (acc[category] || 0) + (Number(tx.amount) || 0);
        return acc;
      }, {});

      const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const [topCategory, topAmount] = sorted[0] || ['others', 0];

      const topSummary = sorted
        .slice(0, 3)
        .map(([category, amount]) => `${category}: ₹${Number(amount).toLocaleString('en-IN')}`)
        .join('\n');

      const reply = `Aapka sabse zyada kharcha **${topCategory}** me ho raha hai (₹${Number(topAmount).toLocaleString('en-IN')}).\n\nTop categories:\n${topSummary}`;

      return res.status(200).json({
        type: 'general',
        message: reply,
        reply,
        speak: true,
      });
    }

    let session = getSession(sessionId);
    const detectedIntent = detectIntent(message);
    const intent = resolveIntent(session, detectedIntent);

    if (session.intent !== intent) {
      if (intent === INTENTS.EMI) {
        session.intent = INTENTS.EMI;
        session.step = STEP.ASK_AMOUNT;
        session.data = {
          amount: null,
          interestRate: null,
          durationMonths: null,
        };
      } else if (intent !== session.intent && detectedIntent !== INTENTS.GENERAL) {
        session = resetSession(sessionId, intent);
        session.intent = intent;
      }
    }

    const docs = retrieveRelevantDocuments(message, 4);
    const businessContext = buildBusinessContext({ intent, session, message });
    const sessionData = {
      intent: session.intent,
      step: session.step,
      data: session.data,
      lastUpdatedAt: session.lastUpdatedAt,
    };

    console.log('User:', message);
    console.log('Session:', userSessions.get(sessionId));

    appendTurn(sessionId, 'user', message);
    saveSession(sessionId, session);

    const previousConversation = getPreviousConversation(sessionId);

    try {
      const groqResult = await generateGroqResponse({
        message,
        intent,
        docs,
        businessContext,
        sessionData,
        previousConversation,
      });

      let parsedAI = { message: groqResult.text, action: { type: 'none', data: {} } };
      try {
        const rawJson = JSON.parse(groqResult.text);
        
        // Map new {action, payload} format to legacy {type, data} format for ChatUI backward compatibility
        parsedAI.message = rawJson.message || groqResult.text;
        parsedAI.action = {
          type: rawJson.action || rawJson.function || 'none',
          data: rawJson.payload || rawJson.arguments || {}
        };

        if (parsedAI.action.type === 'check_balance') {
          let accountNumber = parsedAI.action.data.accountNumber || parsedAI.action.data.account_number;
          if (!accountNumber) {
            accountNumber = extractAccountNumber(message);
            if (accountNumber) {
              parsedAI.action.data = {
                ...parsedAI.action.data,
                accountNumber,
              };
            } else {
              parsedAI.message = 'Apna account number bhejiye, main balance bata deta hoon.';
            }
          }
        }

        if (parsedAI.action.type === 'send_money') {
          let receiverAccount = parsedAI.action.data.receiver || parsedAI.action.data.receiverId || parsedAI.action.data.account_number || parsedAI.action.data.accountNumber;
          let amountValue = parsedAI.action.data.amount;

          if (!receiverAccount || !amountValue) {
            const fallbackTransfer = extractTransferFromMessage(message);
            if (fallbackTransfer) {
              receiverAccount = receiverAccount || fallbackTransfer.receiver;
              amountValue = amountValue || fallbackTransfer.amount;
              parsedAI.action.data = {
                ...parsedAI.action.data,
                receiver: receiverAccount,
                amount: amountValue,
              };
            }
          }

          if (receiverAccount) {
            const User = require('../models/user.model');
            const receiverUser = await User.findOne({ accountNumber: receiverAccount });
            if (receiverUser) {
              parsedAI.action.data.receiverName = receiverUser.name;
            } else {
              parsedAI.message = `Main is account number (${receiverAccount}) ko nahi dhoondh paaya. Kripya sahi account number dijiye.`;
              parsedAI.action = { type: 'none', data: {} };
            }
          }
        }
      } catch (parseErr) {
        console.warn('Groq returned non-JSON text, falling back to raw text mapping.');
      }

      if (parsedAI.action.type === 'none') {
        const fallbackTransfer = extractTransferFromMessage(message);
        if (fallbackTransfer) {
          parsedAI.action = { type: 'send_money', data: fallbackTransfer };
          parsedAI.message =
            parsedAI.message ||
            'Theek hai, main transfer start kar raha hoon. PIN/OTP ke liye prompt aayega.';
        }
      }

      appendTurn(sessionId, 'assistant', parsedAI.message);

      if (parsedAI.action.type === 'none' && isBalanceQuery(message)) {
        const accountNumber = extractAccountNumber(message);
        parsedAI.action = {
          type: 'check_balance',
          data: accountNumber ? { accountNumber } : {},
        };
        parsedAI.message = accountNumber
          ? 'Balance check kar raha hoon.'
          : 'Apna account number bhejiye, main balance bata deta hoon.';
      }

      if (intent === INTENTS.EMI && session.step === STEP.READY) {
        session.step = STEP.IDLE;
        session.intent = INTENTS.GENERAL;
        session.data = {
          amount: null,
          interestRate: null,
          durationMonths: null,
        };
        saveSession(sessionId, session);
      }

      return res.status(200).json(
        buildChatResponse({
          intent,
          reply: parsedAI.message,
          action: parsedAI.action,
          source: 'groq',
          data: businessContext,
          contextDocs: docs,
        })
      );
    } catch (fallbackError) {
      return res.status(200).json(buildAIErrorResponse(intent));
    }
  } catch (error) {
    return res.status(500).json({
      type: 'general',
      message: error.message || 'Unable to process chat request',
    });
  }
};

module.exports = {
  handleChat,
};
