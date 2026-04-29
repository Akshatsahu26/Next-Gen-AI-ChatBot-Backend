const INTENTS = {
  EMI: 'EMI',
  LOAN: 'LOAN',
  FRAUD: 'FRAUD',
  TRANSACTION: 'TRANSACTION',
  GENERAL: 'GENERAL',
};

const KEYWORDS = {
  [INTENTS.EMI]: ['emi', 'interest', 'tenure', 'principal', 'installment', 'month', 'year'],
  [INTENTS.LOAN]: ['loan', 'eligibility', 'disbursal', 'rejected', 'approval', 'borrow'],
  [INTENTS.FRAUD]: ['fraud', 'scam', 'otp', 'phishing', 'suspicious', 'hack', 'upi pin'],
  [INTENTS.TRANSACTION]: [
    'transaction',
    'payment',
    'debited',
    'credited',
    'refund',
    'complaint',
    'ticket',
    'balance',
    'upi',
  ],
};

const SCORE_WEIGHTS = {
  keyword: 1,
  pattern: 2,
};

const INTENT_PATTERNS = {
  [INTENTS.EMI]: [/\bemi\b/i, /\b\d+(?:\.\d+)?\s*%\b/i, /\b(months?|years?)\b/i],
  [INTENTS.LOAN]: [/\bloan\b/i, /\bloan\s*(?:reject|issue|problem)\b/i, /\beligib/i],
  [INTENTS.FRAUD]: [/\bfraud\b/i, /\b(otp|pin).*(share|ask)\b/i, /\bphishing\b/i],
  [INTENTS.TRANSACTION]: [/\b(transaction|payment|upi)\b/i, /\bdebited\b.*\bnot\s+credited\b/i],
};

const normalize = (message) => String(message || '').toLowerCase().trim();

/**
 * Detects user intent using keyword and pattern matching.
 * @param {string} message
 * @returns {'EMI'|'LOAN'|'FRAUD'|'TRANSACTION'|'GENERAL'}
 */
const detectIntent = (message = '') => {
  const text = normalize(message);
  if (!text) return INTENTS.GENERAL;

  const scores = {
    [INTENTS.EMI]: 0,
    [INTENTS.LOAN]: 0,
    [INTENTS.FRAUD]: 0,
    [INTENTS.TRANSACTION]: 0,
  };

  Object.entries(KEYWORDS).forEach(([intent, keywords]) => {
    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        scores[intent] += SCORE_WEIGHTS.keyword;
      }
    });
  });

  Object.entries(INTENT_PATTERNS).forEach(([intent, patterns]) => {
    patterns.forEach((pattern) => {
      if (pattern.test(text)) {
        scores[intent] += SCORE_WEIGHTS.pattern;
      }
    });
  });

  // Agent Mode Extraction BEFORE keyword fallback
  let extractedData = null;
  let isActionable = false;

  // 1. EMI
  const emiRegex = /calculate\s+emi[^\d]*?(\d+)[^\d]*?(\d+(?:\.\d+)?)\s*%?[^\d]*?(\d+)\s*(months?|years?)/i;
  const emiMatch = text.match(emiRegex);
  if (emiMatch) {
    let months = parseInt(emiMatch[3], 10);
    if (emiMatch[4].toLowerCase().startsWith('year')) {
      months *= 12;
    }
    extractedData = {
      principal: emiMatch[1],
      rate: emiMatch[2],
      months: months.toString(),
    };
    isActionable = true;
    return { intent: INTENTS.EMI, extractedData, isActionable };
  }

  // 2. Transaction / Complaint
  const txnRegex = /transaction.*?([A-Z0-9]{8,})/i;
  const txnMatch = text.match(txnRegex);
  if (txnMatch) {
    extractedData = { transactionId: txnMatch[1].trim() };
    isActionable = true;
    return { intent: INTENTS.TRANSACTION, extractedData, isActionable };
  }

  const complaintRegex = /(?:register|file|raise)\s+(?:a|my)?\s*complaint\s*(?:about|for|regarding|that)?\s*(.+)/i;
  const cmpMatch = text.match(complaintRegex);
  if (cmpMatch) {
    extractedData = { issue: cmpMatch[1].trim() };
    isActionable = true;
    return { intent: INTENTS.TRANSACTION, extractedData, isActionable };
  }

  // 3. Fraud
  const fraudRegex = /(stolen card|lost card|unauthorized|hacked|scammed|please block my card)/i;
  const fraudMatch = text.match(fraudRegex);
  if (fraudMatch) {
    extractedData = { fraudType: fraudMatch[1].trim() };
    isActionable = true;
    return { intent: INTENTS.FRAUD, extractedData, isActionable };
  }

  // If no action matched, fallback to the keyword scored intent
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestIntent, score] = ranked[0] || [INTENTS.GENERAL, 0];
  const finalIntent = score > 0 ? bestIntent : INTENTS.GENERAL;

  return { intent: finalIntent, extractedData, isActionable };
};

module.exports = {
  INTENTS,
  detectIntent,
};
