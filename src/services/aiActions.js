const Complaint = require('../../models/Complaint');

const calculateEMI = ({ principal, rate, months }) => {
  if (!principal || !rate || !months) {
    throw new Error('Missing parameters for EMI calculation');
  }

  const P = parseFloat(principal);
  const annualRate = parseFloat(rate);
  const n = parseInt(months, 10);

  if (isNaN(P) || isNaN(annualRate) || isNaN(n) || P <= 0 || annualRate < 0 || n <= 0) {
    throw new Error('Invalid EMI parameters');
  }

  if (annualRate === 0) {
    const emi = P / n;
    return {
      emi: emi.toFixed(2),
      totalInterest: 0,
      totalAmount: P.toFixed(2),
    };
  }

  const r = annualRate / 12 / 100;
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalAmount = emi * n;
  const totalInterest = totalAmount - P;

  return {
    emi: emi.toFixed(2),
    totalInterest: totalInterest.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  };
};

const createComplaint = async ({ issue, userId = 'guest_user' }) => {
  const ticketId = `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const complaint = new Complaint({
    userId,
    title: 'AI Registration',
    description: issue || 'General issue',
    ticketId,
    status: 'pending',
  });

  await complaint.save();
  
  return {
    success: true,
    ticketId,
    status: 'pending',
  };
};

const checkTransaction = async ({ transactionId }) => {
  // Mock transaction lookup
  return {
    transactionId,
    status: 'SUCCESS',
    amount: '₹10,000',
    timestamp: new Date().toISOString(),
    remark: 'Verified via Agent Mode',
  };
};

const handleFraud = async ({ fraudType }) => {
  return {
    success: true,
    actionTaken: 'ALL_CARDS_BLOCKED',
    referenceNo: `FRD-${Date.now()}`
  };
};

module.exports = {
  calculateEMI,
  createComplaint,
  checkTransaction,
  handleFraud
};
