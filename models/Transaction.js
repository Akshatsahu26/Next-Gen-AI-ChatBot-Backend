const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
      trim: true,
    },
    senderAccount: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    receiverAccount: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: false,
      trim: true,
      default: 'transfer',
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    status: {
      type: String,
      enum: ['success'],
      default: 'success',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
