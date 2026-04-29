const calculateLoanDetails = ({ amount, interest, tenure }) => {
  const principal = Number(amount);
  const annualInterest = Number(interest);
  const tenureMonths = Number(tenure);

  if (!principal || principal <= 0 || annualInterest < 0 || !tenureMonths || tenureMonths <= 0) {
    throw new Error('Invalid loan inputs. Amount and tenure must be greater than 0; interest cannot be negative.');
  }

  const monthlyRate = annualInterest / 12 / 100;

  let emi;

  if (monthlyRate === 0) {
    emi = principal / tenureMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    emi = (principal * monthlyRate * factor) / (factor - 1);
  }

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;

  return {
    emi: Number(emi.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalPayment: Number(totalPayment.toFixed(2)),
  };
};

module.exports = {
  calculateLoanDetails,
};
