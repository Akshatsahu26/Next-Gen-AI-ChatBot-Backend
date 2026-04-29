const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const extractNumbers = (message) => {
  const matches = String(message || '').match(/\d+(?:\.\d+)?/g) || [];
  return matches.map(Number).filter((value) => Number.isFinite(value));
};

const parseAmount = (message, numbers) => {
  const lower = String(message || '').toLowerCase();

  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)/i);
  if (lakhMatch) {
    return Number(lakhMatch[1]) * 100000;
  }

  const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(crore|cr|crores)/i);
  if (croreMatch) {
    return Number(croreMatch[1]) * 10000000;
  }

  return numbers[0] || null;
};

const parseInterest = (message, numbers) => {
  const percentMatch = String(message || '').match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) return Number(percentMatch[1]);

  const lower = String(message || '').toLowerCase();
  const interestMatch = lower.match(/interest\s*(?:rate)?\s*(\d+(?:\.\d+)?)/);
  if (interestMatch) return Number(interestMatch[1]);

  return numbers[1] || null;
};

const parseTenureMonths = (message, numbers) => {
  const lower = String(message || '').toLowerCase();

  const monthsMatch = lower.match(/(\d+(?:\.\d+)?)\s*(month|months)/);
  if (monthsMatch) return Math.round(Number(monthsMatch[1]));

  const yearsMatch = lower.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)/);
  if (yearsMatch) return Math.round(Number(yearsMatch[1]) * 12);

  return numbers[2] ? Math.round(Number(numbers[2])) : null;
};

const calculateEMIResult = ({ principal, annualInterest, months }) => {
  const P = Number(principal);
  const annualRate = Number(annualInterest);
  const N = Number(months);

  if (!Number.isFinite(P) || !Number.isFinite(annualRate) || !Number.isFinite(N)) {
    throw new Error('Invalid EMI inputs. Please provide amount, interest, and tenure.');
  }

  if (P <= 0 || annualRate < 0 || N <= 0) {
    throw new Error('Amount and tenure must be greater than 0 and interest cannot be negative.');
  }

  const R = annualRate / 12 / 100;

  let emi = 0;
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

const extractAndCalculateEMI = (message) => {
  const numbers = extractNumbers(message);
  const principal = parseAmount(message, numbers);
  const annualInterest = parseInterest(message, numbers);
  const months = parseTenureMonths(message, numbers);

  if (!principal || annualInterest == null || !months) {
    return {
      ok: false,
      error: 'Please share loan amount, annual interest (e.g. 10%), and tenure (months/years).',
      parsed: {
        principal,
        annualInterest,
        months,
      },
    };
  }

  const data = calculateEMIResult({
    principal,
    annualInterest,
    months,
  });

  return {
    ok: true,
    parsed: {
      principal,
      annualInterest,
      months,
    },
    data,
  };
};

module.exports = {
  calculateEMIResult,
  extractAndCalculateEMI,
};
