const { extractAndCalculateEMI } = require('./emi.service');

const handleEMI = (message) => {
  const parsed = extractAndCalculateEMI(message);

  if (!parsed.ok) {
    return {
      handled: true,
      status: 'needs_input',
      reply:
        'Please share loan amount, annual interest rate, and tenure. Example: emi 100000 10 12',
      data: parsed.parsed,
    };
  }

  const { emi, totalInterest, totalPayment } = parsed.data;

  return {
    handled: true,
    status: 'calculated',
    reply: `Your EMI is ₹${emi.toLocaleString('en-IN')} per month. Total interest is ₹${totalInterest.toLocaleString(
      'en-IN'
    )} and total repayment is ₹${totalPayment.toLocaleString('en-IN')}.`,
    data: {
      ...parsed.data,
      parsed: parsed.parsed,
    },
  };
};

const handleFraud = (message) => {
  const text = String(message || '').toLowerCase();
  const containsUrgentSignal = /otp|pin|link|apk|remote app|screen share|kyc update/.test(text);

  return {
    handled: true,
    severity: containsUrgentSignal ? 'high' : 'medium',
    steps: [
      'Do not click links or share OTP/PIN/password.',
      'Immediately block card/UPI if you interacted with the message.',
      'Change banking password and app PIN.',
      'Report to bank support and cybercrime helpline 1930.',
      'Keep screenshots, sender number, and timestamps as evidence.',
    ],
  };
};

const handleLoan = (message) => {
  const text = String(message || '').toLowerCase();
  const hints = [];

  if (/reject|decline|not approved/.test(text)) {
    hints.push('Check credit score and reduce outstanding dues before reapplying.');
  }

  if (/disburs|pending|delay/.test(text)) {
    hints.push('Verify e-mandate, bank details, and pending KYC/document flags.');
  }

  if (hints.length === 0) {
    hints.push('Review credit score, KYC, and existing EMI burden to improve eligibility.');
  }

  return {
    handled: true,
    eligibilityFactors: [
      'Credit score',
      'Monthly income vs existing EMI',
      'KYC and employment stability',
      'Repayment history',
    ],
    guidance: hints,
  };
};

module.exports = {
  handleEMI,
  handleFraud,
  handleLoan,
};
