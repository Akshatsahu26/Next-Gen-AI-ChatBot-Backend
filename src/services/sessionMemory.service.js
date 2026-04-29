const { INTENTS } = require('./intent.service');

const userSessions = new Map();
const MAX_HISTORY = 12;

const STEP = {
  IDLE: 'IDLE',
  ASK_AMOUNT: 'ASK_AMOUNT',
  ASK_INTEREST: 'ASK_INTEREST',
  ASK_DURATION: 'ASK_DURATION',
  READY: 'READY',
};

const createDefaultSession = () => ({
  intent: INTENTS.GENERAL,
  step: STEP.IDLE,
  data: {
    amount: null,
    interestRate: null,
    durationMonths: null,
  },
  history: [],
  lastUpdatedAt: Date.now(),
});

const getSession = (sessionId) => {
  const key = String(sessionId || 'guest-session');
  if (!userSessions.has(key)) {
    userSessions.set(key, createDefaultSession());
  }
  return userSessions.get(key);
};

const saveSession = (sessionId, session) => {
  const key = String(sessionId || 'guest-session');
  session.lastUpdatedAt = Date.now();
  userSessions.set(key, session);
};

const appendTurn = (sessionId, role, content) => {
  const session = getSession(sessionId);
  session.history.push({ role, content, at: Date.now() });
  session.history = session.history.slice(-MAX_HISTORY);
  saveSession(sessionId, session);
};

const getPreviousConversation = (sessionId) => {
  const session = getSession(sessionId);
  return session.history
    .slice(-8)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join('\n');
};

const resetSession = (sessionId, nextIntent = INTENTS.GENERAL) => {
  const base = createDefaultSession();
  base.intent = nextIntent;
  saveSession(sessionId, base);
  return base;
};

const parseAmount = (message, expectedStep) => {
  const lower = String(message || '').toLowerCase();

  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)/i);
  if (lakhMatch) return Number(lakhMatch[1]) * 100000;

  const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(crore|cr|crores)/i);
  if (croreMatch) return Number(croreMatch[1]) * 10000000;

  const numbers = lower.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return null;

  if (expectedStep === STEP.ASK_AMOUNT) return numbers[0];

  const probable = numbers.find((value) => value >= 1000);
  return probable || null;
};

const parseInterestRate = (message, expectedStep) => {
  const lower = String(message || '').toLowerCase();
  const percentMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) return Number(percentMatch[1]);

  const explicit = lower.match(/interest(?:\s*rate)?\s*(?:is)?\s*(\d+(?:\.\d+)?)/i);
  if (explicit) return Number(explicit[1]);

  const numbers = lower.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return null;

  if (expectedStep === STEP.ASK_INTEREST) return numbers[0];

  return null;
};

const parseDurationMonths = (message, expectedStep) => {
  const lower = String(message || '').toLowerCase();

  const monthMatch = lower.match(/(\d+(?:\.\d+)?)\s*(month|months)/i);
  if (monthMatch) return Math.round(Number(monthMatch[1]));

  const yearMatch = lower.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)/i);
  if (yearMatch) return Math.round(Number(yearMatch[1]) * 12);

  const numbers = lower.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return null;

  if (expectedStep === STEP.ASK_DURATION) return Math.round(numbers[0]);

  return null;
};

const parseCompactEmiInputs = (message) => {
  const lower = String(message || '').toLowerCase();
  const numbers = lower.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (numbers.length < 3) return null;

  return {
    amount: Number(numbers[0]),
    interestRate: Number(numbers[1]),
    durationMonths: Math.round(Number(numbers[2])),
  };
};

const getEmiMissingFields = (data) => {
  const missing = [];
  if (!Number.isFinite(data.amount) || data.amount <= 0) missing.push('amount');
  if (!Number.isFinite(data.interestRate) || data.interestRate <= 0) missing.push('interestRate');
  if (!Number.isFinite(data.durationMonths) || data.durationMonths <= 0) missing.push('durationMonths');
  return missing;
};

const updateEmiSessionData = (session, message) => {
  if (session.step === STEP.IDLE) {
    session.step = STEP.ASK_AMOUNT;
  }

  const compact = parseCompactEmiInputs(message);
  if (compact) {
    if (!session.data.amount && Number.isFinite(compact.amount) && compact.amount > 0) {
      session.data.amount = compact.amount;
    }
    if (!session.data.interestRate && Number.isFinite(compact.interestRate) && compact.interestRate > 0) {
      session.data.interestRate = compact.interestRate;
    }
    if (
      !session.data.durationMonths &&
      Number.isFinite(compact.durationMonths) &&
      compact.durationMonths > 0
    ) {
      session.data.durationMonths = compact.durationMonths;
    }
  }

  if (!session.data.amount) {
    const amount = parseAmount(message, session.step);
    if (Number.isFinite(amount) && amount > 0) {
      session.data.amount = amount;
    }
  }

  if (!session.data.interestRate) {
    const interestRate = parseInterestRate(message, session.step);
    if (Number.isFinite(interestRate) && interestRate > 0) {
      session.data.interestRate = interestRate;
    }
  }

  if (!session.data.durationMonths) {
    const durationMonths = parseDurationMonths(message, session.step);
    if (Number.isFinite(durationMonths) && durationMonths > 0) {
      session.data.durationMonths = durationMonths;
    }
  }

  const missing = getEmiMissingFields(session.data);

  if (missing.length === 0) {
    session.step = STEP.READY;
  } else if (missing[0] === 'amount') {
    session.step = STEP.ASK_AMOUNT;
  } else if (missing[0] === 'interestRate') {
    session.step = STEP.ASK_INTEREST;
  } else {
    session.step = STEP.ASK_DURATION;
  }

  return {
    session,
    missing,
  };
};

module.exports = {
  userSessions,
  STEP,
  getSession,
  saveSession,
  appendTurn,
  getPreviousConversation,
  resetSession,
  updateEmiSessionData,
  getEmiMissingFields,
};
