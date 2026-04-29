const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    income: {
      type: Number,
      required: true,
      min: 1,
    },
    employmentType: {
      type: String,
      enum: ['Student', 'Salaried', 'Self-employed'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    interest: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 360,
    },
    emi: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPayment: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInterest: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      default: '',
      maxlength: 280,
    },
    suggestedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditScore: {
      type: Number,
      default: 600,
      min: 300,
      max: 850,
    },
    creditBand: {
      type: String,
      enum: ['Good', 'Average', 'Poor'],
      default: 'Average',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Loan', loanSchema);
