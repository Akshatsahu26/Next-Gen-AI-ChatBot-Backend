const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calculateEMI = ({ principal, annualRate, months }) => {
  const P = Number(principal);
  const annual = Number(annualRate);
  const N = Number(months);

  if (!Number.isFinite(P) || !Number.isFinite(annual) || !Number.isFinite(N)) {
    throw new Error('Invalid EMI inputs');
  }

  if (P <= 0 || annual < 0 || N <= 0) {
    throw new Error('Principal, interest and duration must be valid positive values');
  }

  const R = annual / 12 / 100;

  let emi;
  if (R === 0) {
    emi = P / N;
  } else {
    const growth = Math.pow(1 + R, N);
    emi = (P * R * growth) / (growth - 1);
  }

  const totalPayment = emi * N;
  const totalInterest = totalPayment - P;

  return {
    emi: round2(emi),
    totalPayment: round2(totalPayment),
    totalInterest: round2(totalInterest),
  };
};

const getAffordablePrincipal = ({ maxEmi, annualRate, months }) => {
  const E = Number(maxEmi);
  const annual = Number(annualRate);
  const N = Number(months);

  if (!Number.isFinite(E) || !Number.isFinite(annual) || !Number.isFinite(N)) {
    return 0;
  }

  if (E <= 0 || annual < 0 || N <= 0) {
    return 0;
  }

  const R = annual / 12 / 100;
  if (R === 0) {
    return Math.max(0, Math.floor(E * N));
  }

  const growth = Math.pow(1 + R, N);
  const principal = (E * (growth - 1)) / (R * growth);
  return Math.max(0, Math.floor(principal));
};

const getCreditScore = ({ income, amount }) => {
  const monthlyIncome = Number(income);
  const loanAmount = Number(amount);

  let score = 600;

  if (monthlyIncome >= 100000) score += 120;
  else if (monthlyIncome >= 60000) score += 90;
  else if (monthlyIncome >= 30000) score += 55;
  else if (monthlyIncome >= 20000) score += 25;
  else score -= 30;

  const yearlyIncome = monthlyIncome * 12;
  const leverage = yearlyIncome > 0 ? loanAmount / yearlyIncome : 10;

  if (leverage <= 0.35) score += 80;
  else if (leverage <= 0.6) score += 45;
  else if (leverage <= 1) score += 10;
  else score -= 40;

  score = Math.max(300, Math.min(850, score));

  let band = 'Average';
  if (score >= 750) band = 'Good';
  if (score < 600) band = 'Poor';

  return { score, band };
};

const checkEligibility = ({ income, amount, interest, duration }) => {
  const monthlyIncome = Number(income);
  const principal = Number(amount);

  if (monthlyIncome < 20000) {
    return {
      status: 'rejected',
      reason: 'Income below minimum threshold of ₹20,000.',
      suggestedAmount: 0,
    };
  }

  const { emi } = calculateEMI({
    principal,
    annualRate: interest,
    months: duration,
  });

  const maxAllowedEmi = monthlyIncome * 0.4;

  if (emi <= maxAllowedEmi) {
    return {
      status: 'approved',
      reason: 'Eligible: EMI is within 40% of monthly income.',
      suggestedAmount: principal,
    };
  }

  const suggestedAmount = getAffordablePrincipal({
    maxEmi: maxAllowedEmi,
    annualRate: interest,
    months: duration,
  });

  return {
    status: 'rejected',
    reason: 'EMI exceeds 40% of monthly income.',
    suggestedAmount,
  };
};

const getSmartSuggestion = ({ status, requestedAmount, suggestedAmount }) => {
  const requested = Number(requestedAmount) || 0;
  const suggested = Number(suggestedAmount) || 0;

  if (status === 'approved') {
    return `You can afford a loan of ₹${requested.toLocaleString('en-IN')} comfortably.`;
  }

  if (suggested > 0) {
    return `Based on your income, a safer offer is around ₹${suggested.toLocaleString('en-IN')}.`;
  }

  return 'Your current profile is not eligible for this loan amount.';
};

module.exports = {
  calculateEMI,
  checkEligibility,
  getCreditScore,
  getSmartSuggestion,
};
