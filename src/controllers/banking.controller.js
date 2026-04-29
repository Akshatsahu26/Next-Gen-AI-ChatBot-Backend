const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

const User = require('../models/user.model');
const Transaction = require('../../models/Transaction');
const Loan = require('../models/loan.model');
const FraudComplaint = require('../models/fraudComplaint.model');

// Custom logger
const logger = {
  info: (msg, data) => console.log(`[BANKING-INFO] ${msg}`, data || ''),
  error: (msg, error) => console.error(`[BANKING-ERROR] ${msg}`, error || ''),
};

/**
 * POST /transfer
 * Validates balance, uses MongoDB Session for atomic simulated transfer
 */
const transferMoney = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join(', '), errors: errors.array() });
  }

  const { receiverId, amount } = req.body;
  const transferAmount = Number(amount);
  const senderId = req.user._id;

  logger.info('Transfer request payload', { receiverId, amount, transferAmount, senderId });

  logger.info(`Transfer initiated by User:${senderId} to Receiver:${receiverId} Amount:${transferAmount}`);

  const performTransfer = async (session = null) => {
    const senderQuery = User.findById(senderId);
    const sender = session ? await senderQuery.session(session) : await senderQuery;
    if (!sender) {
      throw new Error('Sender not found');
    }

    const receiverQuery = User.findOne({ accountNumber: receiverId });
    const receiver = session ? await receiverQuery.session(session) : await receiverQuery;
    if (!receiver) {
      throw new Error('Receiver account not found');
    }

    if (sender._id.toString() === receiver._id.toString()) {
      throw new Error('Cannot transfer to self');
    }

    if (sender.balance < transferAmount) {
      throw new Error('Insufficient balance');
    }

    // Atomic balance update
    sender.balance -= transferAmount;
    receiver.balance += transferAmount;

    // Create Transaction history
    const senderTx = await Transaction.create([
      {
      userId: String(sender._id),
      senderAccount: sender.accountNumber,
      receiverAccount: receiver.accountNumber,
      amount: transferAmount,
      type: 'debit',
      category: 'transfer',
      status: 'success',
      description: `Transfer to User ${receiverId}`,
      date: new Date(),
      },
    ], session ? { session } : undefined);

    const receiverTx = await Transaction.create([
      {
      userId: String(receiver._id),
      senderAccount: sender.accountNumber,
      receiverAccount: receiver.accountNumber,
      amount: transferAmount,
      type: 'credit',
      category: 'transfer',
      status: 'success',
      description: `Transfer from User ${senderId}`,
      date: new Date(),
      },
    ], session ? { session } : undefined);

    sender.transactions.push(senderTx[0]._id);
    receiver.transactions.push(receiverTx[0]._id);

    if (session) {
      await sender.save({ session });
      await receiver.save({ session });
      await session.commitTransaction();
      session.endSession();
    } else {
      await sender.save();
      await receiver.save();
    }

    logger.info('Transfer successful', { transactionId: senderTx[0]._id });

    return {
      transactionId: senderTx[0]._id,
      newBalance: sender.balance,
    };
  };

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const data = await performTransfer(session);

    logger.info('Transfer successful', { transactionId: data.transactionId });

    return res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data,
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (_) {
        // no-op
      }
    }

    if (String(error.message || '').includes('Transaction numbers are only allowed')) {
      try {
        const data = await performTransfer(null);
        logger.info('Transfer successful (non-transactional fallback)', { transactionId: data.transactionId });
        return res.status(200).json({
          success: true,
          message: 'Transfer successful',
          data,
        });
      } catch (retryError) {
        logger.error('Transfer failed', retryError.message);
        return res.status(400).json({
          success: false,
          message: retryError.message || 'Transaction failed',
        });
      }
    }

    logger.error('Transfer failed', error.message);

    return res.status(400).json({
      success: false,
      message: error.message || 'Transaction failed',
    });
  }
};

/**
 * POST /loan
 * Mocks eligibility check and stores request
 */
const applyLoan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join(', '), errors: errors.array() });
  }

  const { amount, type } = req.body;
  const userId = req.user._id;

  logger.info(`Loan requested by User:${userId} Amount:${amount} Type:${type}`);

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Mock Eligibility Check (Approval logic)
    const isEligible = amount <= 500000; // Mock: Approve if <= 5Lakhs
    const status = isEligible ? 'approved' : 'rejected';

    const loanRequest = await Loan.create({
      userId: user._id,
      fullName: user.name,
      income: 50000, // Mocked fallback
      employmentType: 'Salaried',
      amount: Number(amount),
      interest: 10.5,
      duration: 24,
      emi: Number((amount * 1.105) / 24).toFixed(2),
      totalPayment: Number(amount * 1.105),
      totalInterest: Number(amount * 0.105),
      status: status,
      reason: isEligible ? 'Standard approval' : 'Requested amount too high',
    });

    logger.info(`Loan processed with status: ${status}`, { loanId: loanRequest._id });

    return res.status(201).json({
      success: true,
      message: `Loan request ${status}`,
      data: loanRequest
    });
  } catch (error) {
    logger.error('Loan application failed', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /fraud
 * Generates complaint ID and stores Fraud Complaint
 */
const reportFraud = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join(', '), errors: errors.array() });
  }

  const { description } = req.body;
  const userId = req.user._id;

  logger.info(`Fraud reported by User:${userId}`);

  try {
    const complaintId = `FRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const fraudComplaint = await FraudComplaint.create({
      userId,
      description,
      complaintId,
      status: 'pending',
    });

    logger.info('Fraud complaint registered successfully', { complaintId });

    return res.status(201).json({
      success: true,
      message: 'Fraud complaint registered successfully',
      data: {
        complaintId: fraudComplaint.complaintId,
        status: fraudComplaint.status,
      }
    });
  } catch (error) {
    logger.error('Fraud reporting failed', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /balance
 * Fetches balance for the authenticated user or provided account number (must match user).
 */
const getBalance = async (req, res) => {
  const { accountNumber } = req.body || {};
  const userAccount = req.user?.accountNumber;
  const targetAccount = accountNumber || userAccount;

  if (!targetAccount) {
    return res.status(400).json({
      success: false,
      message: 'accountNumber is required',
    });
  }

  if (userAccount && targetAccount !== userAccount) {
    return res.status(403).json({
      success: false,
      message: 'You can only check your own account balance',
    });
  }

  try {
    const user = await User.findOne({ accountNumber: targetAccount });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Balance fetched successfully',
      data: {
        accountNumber: user.accountNumber,
        balance: user.balance,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch balance',
    });
  }
};

module.exports = {
  transferMoney,
  applyLoan,
  reportFraud,
  getBalance
};
