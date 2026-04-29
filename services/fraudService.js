const FRAUD_KEYWORDS = ['urgent', 'otp', 'click', 'verify'];

const analyzeFraudRisk = (message) => {
  const normalizedMessage = String(message || '').toLowerCase();

  const matchedKeywords = FRAUD_KEYWORDS.filter((keyword) =>
    normalizedMessage.includes(keyword)
  );

  let riskScore = matchedKeywords.length * 25;
  if (normalizedMessage.includes('account blocked') || normalizedMessage.includes('suspended')) {
    riskScore += 20;
  }

  riskScore = Math.min(riskScore, 100);

  let riskLevel = 'Low';
  if (riskScore >= 70) {
    riskLevel = 'High';
  } else if (riskScore >= 35) {
    riskLevel = 'Medium';
  }

  const explanation = matchedKeywords.length
    ? `Detected suspicious keywords: ${matchedKeywords.join(', ')}.`
    : 'No major phishing keywords detected.';

  return {
    riskLevel,
    riskScore,
    explanation,
  };
};

module.exports = {
  analyzeFraudRisk,
};
