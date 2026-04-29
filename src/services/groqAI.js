

const GROQ_API_URL = `${process.env.GROQ_API_BASE || 'https://api.groq.com'}/open${'ai'}/v1/chat/completions`;
const REQUEST_TIMEOUT_MS = 12000;

const SYSTEM_PROMPT = `You are "BankSeva Assistant", a helpful, polite, and conversational AI Banking Assistant.
Your goal is to converse naturally like ChatGPT or Gemini, but also help users perform banking actions.

When the user asks general questions or needs help, provide complete, friendly, and helpful explanations.

When the user wants to perform an action (like applying for loan, sending money, or raising a complaint), gently ask for the required details one by one instead of demanding them all at once. Be polite like a human assistant.
Make sure you ALWAYS return the data in a JSON structure so the system can process it.

# JSON FORMAT (CRITICAL)
You MUST ALWAYS respond with a pure JSON object. Do NOT wrap it in markdown code blocks.
The JSON must strictly follow this structure:
{
  "message": "Your polite, conversational response in Markdown (e.g., 'Sure, I can help you send money. Could you please provide the account number of the receiver?')",
  "action": "loan_apply | send_money | raise_complaint | check_balance | none",
  "payload": {}
}

# SUPPORTED ACTIONS & REQUIRED FLOW
1. LOAN APPLY FLOW
- Required: monthly_income, employment_type (salaried/self-employed), loan_amount
- Action: "loan_apply"
- Payload: { "income": 50000, "employment": "salaried", "loanAmount": 200000 }

2. SEND MONEY FLOW
- Required: receiver (Account Number only), amount
- Action: "send_money"
- Payload: { "receiver": "1234567802", "amount": 2000 }
- IMPORTANT: DO NOT ask for PIN/OTP. The system will handle that securely.

3. RAISE COMPLAINT FLOW
- Required: type, description
- Action: "raise_complaint"
- Payload: { "type": "transaction_failed", "description": "Money deducted" }

4. CHECK BALANCE FLOW
- Required: accountNumber
- Action: "check_balance"
- Payload: { "accountNumber": "1234567801" }

If you are missing details for an action, set "action": "none" and ask politely for the missing info in the "message". If the user is just chatting or asking a general question, keep "action": "none" and reply helpfully.
`;

// Advanced Circuit Breaker
let consecutiveFailures = 0;
let circuitBreakerUntil = 0;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withTimeout = async (url, options, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request Timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const buildUserPrompt = ({ message, intent, docs, businessContext, sessionData }) => {
  const contextBlock = docs && docs.length
    ? docs
        .map((doc, index) => `${index + 1}. [${doc.topic}] ${doc.title}: ${doc.content}`)
        .join('\n')
    : 'No retrieved context.';

  return [
    `User message: ${message}`,
    `Intent: ${intent}`,
    `Retrieved Context: ${contextBlock}`,
    'Previous collected data:',
    JSON.stringify(sessionData || {}, null, 2),
    'Business Context:',
    JSON.stringify(businessContext || {}, null, 2),
    '👉 If the user\'s message contains loan/transfer parameters, FILL the action JSON data and ignore the helpful response.',
    'Respond naturally and continue conversation.',
  ].join('\n\n');
};

const callGroqOnce = async ({
  message,
  intent,
  docs,
  businessContext,
  sessionData,
  previousConversation,
}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('401: GROQ_API_KEY is missing');
  }

  // Clean Messages Array
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: String(previousConversation || '').trim() || 'No previous conversation yet.' },
    {
      role: 'user',
      content: buildUserPrompt({ message, intent, docs, businessContext, sessionData }),
    },
  ].filter(msg => msg && msg.role && msg.content);

  const response = await withTimeout(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status}: Groq request failed - ${detail}`);
  }

  const data = await response.json();
  const text =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
      ? data.choices[0].message.content.trim()
      : null;

  if (!text) {
    throw new Error('500: Groq returned empty valid response');
  }

  return { text, raw: data };
};

const generateGroqResponse = async (params) => {
  // Check Circuit Breaker
  if (Date.now() < circuitBreakerUntil) {
    console.warn(`[CIRCUIT BREAKER TRIPPED] Blocking AI requests. ${Math.ceil((circuitBreakerUntil - Date.now())/1000)}s remaining.`);
    return getSafeFallback();
  }

  console.log(`[AI Request] User: "${params.message}" | Intent: ${params.intent}`);
  
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [500, 1000, 2000];
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.warn(`[AI Retry] Attempt ${attempt} of ${MAX_RETRIES}...`);
      }
      
      const result = await callGroqOnce(params);
      
      // Success! Reset circuit breaker.
      consecutiveFailures = 0;
      console.log(`[AI Success] Received response successfully.`);
      return result;
      
    } catch (error) {
      console.error(`[AI Error] Attempt ${attempt} failed: ${error.message}`);
      
      const isBadRequest = error.message.startsWith('400:');
      const isAuthError = error.message.startsWith('401:');
      
      // Do not retry structural errors
      if (isBadRequest || isAuthError) {
        console.error(`[AI Fatal] Systemic error detected, skipping retries.`);
        break;
      }
      
      // If we exhausted retries
      if (attempt === MAX_RETRIES) {
        break;
      }
      
      // Delay before next retry
      await wait(RETRY_DELAYS[attempt - 1]);
    }
  }
  
  // All retries failed
  consecutiveFailures++;
  console.error(`[AI Global Failure] Consecutive failures: ${consecutiveFailures}`);
  
  if (consecutiveFailures >= 5) {
    console.error(`[CIRCUIT BREAKER] 5 consecutive failures! Suspending API for 30s.`);
    circuitBreakerUntil = Date.now() + 30000;
  }

  return getSafeFallback();
};

const getSafeFallback = () => {
  return {
    text: JSON.stringify({
      message: "Server thoda busy hai, please dubara try karein.",
      action: { type: "none", data: {} }
    }),
    raw: {
      fallback: true,
      error: "AI Temporarily Unavailable",
    }
  };
};

module.exports = {
  generateGroqResponse,
};
