const Loan = require('../models/loan.model');
const {
  calculateEMI,
  checkEligibility,
  getCreditScore,
  getSmartSuggestion,
} = require('../services/loan.service');

const EMPLOYMENT_TYPES = ['Student', 'Salaried', 'Self-employed'];

const sanitizeNumber = (value) => Number(value);

const validateLoanPayload = (payload, { forApplication = false } = {}) => {
  const errors = [];

  if (forApplication) {
    if (!payload.fullName || !String(payload.fullName).trim()) {
      errors.push('Full Name is required');
    }

    if (!payload.employmentType || !EMPLOYMENT_TYPES.includes(payload.employmentType)) {
      errors.push('Employment Type must be Student, Salaried, or Self-employed');
    }

    const income = sanitizeNumber(payload.income);
    if (!Number.isFinite(income) || income <= 0) {
      errors.push('Income must be greater than 0');
    }
  }

  const amount = sanitizeNumber(payload.amount);
  const duration = sanitizeNumber(payload.duration);
  const interest = payload.interest == null ? 12 : sanitizeNumber(payload.interest);

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push('Loan Amount must be greater than 0');
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push('Loan Duration must be greater than 0');
  }

  if (!Number.isFinite(interest) || interest < 0 || interest > 100) {
    errors.push('Interest Rate must be between 0 and 100');
  }

  return errors;
};

const calculateLoan = async (req, res) => {
  try {
    const errors = validateLoanPayload(req.body, { forApplication: false });
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
      });
    }

    const amount = sanitizeNumber(req.body.amount);
    const duration = sanitizeNumber(req.body.duration);
    const interest = req.body.interest == null ? 12 : sanitizeNumber(req.body.interest);

    const result = calculateEMI({
      principal: amount,
      annualRate: interest,
      months: duration,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate EMI',
    });
  }
};

const applyLoan = async (req, res) => {
  try {
    const errors = validateLoanPayload(req.body, { forApplication: true });
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
      });
    }

    const fullName = String(req.body.fullName).trim();
    const income = sanitizeNumber(req.body.income);
    const employmentType = req.body.employmentType;
    const amount = sanitizeNumber(req.body.amount);
    const duration = sanitizeNumber(req.body.duration);
    const interest = req.body.interest == null ? 12 : sanitizeNumber(req.body.interest);

    const emiDetails = calculateEMI({
      principal: amount,
      annualRate: interest,
      months: duration,
    });

    const eligibility = checkEligibility({
      income,
      amount,
      interest,
      duration,
    });

    const creditScore = getCreditScore({
      income,
      amount,
    });

    const suggestion = getSmartSuggestion({
      status: eligibility.status,
      requestedAmount: amount,
      suggestedAmount: eligibility.suggestedAmount,
    });

    const loan = await Loan.create({
      userId: req.user._id,
      fullName,
      income,
      employmentType,
      amount,
      interest,
      duration,
      emi: emiDetails.emi,
      totalPayment: emiDetails.totalPayment,
      totalInterest: emiDetails.totalInterest,
      status: eligibility.status,
      reason: eligibility.reason,
      suggestedAmount: eligibility.suggestedAmount,
      creditScore: creditScore.score,
      creditBand: creditScore.band,
    });

    return res.status(201).json({
      success: true,
      message: eligibility.status === 'approved' ? 'Loan approved' : 'Loan rejected',
      data: {
        loan,
        emi: emiDetails,
        eligibility,
        creditScore,
        suggestion,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to apply loan',
    });
  }
};

const getUserLoans = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user._id) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: cannot access other user loans',
      });
    }

    const loans = await Loan.find({ userId: id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: loans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user loans',
    });
  }
};

module.exports = {
  calculateLoan,
  applyLoan,
  getUserLoans,
};
