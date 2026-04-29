const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../src/models/user.model');
const { calculateInsights } = require('../services/insightService');
const { analyzeFraudRisk } = require('../services/fraudService');
const { calculateLoanDetails } = require('../services/loanService');

const LOAN_NUMBER_REGEX = /\d+(?:\.\d+)?/g;
const otpStore = new Map();

const makeOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const getTransactions = async (req, res, next) => {
  try {
    // Prefer userId to avoid showing both debit/credit for the same transfer
    const userId = req.user?._id ? String(req.user._id) : null;
    const account = req.user?.accountNumber || req.query.account;

    if (!userId && !account) {
      return res.status(400).json({ success: false, message: 'Account context missing' });
    }

    const filter = userId
      ? { userId }
      : {
          $or: [
            { senderAccount: account },
            { receiverAccount: account },
          ],
        };

    const transactions = await Transaction.find(filter).sort({ createdAt: -1, date: -1 });

    // Map output to match frontend expectations
    const mappedTransactions = transactions.map((t) => ({
      id: t._id,
      fromUser: t.senderAccount,
      toUser: t.receiverAccount,
      senderAccount: t.senderAccount,
      receiverAccount: t.receiverAccount,
      amount: t.amount,
      type: t.type,
      status: t.status,
      description: t.description,
      date: t.date || t.createdAt,
      createdAt: t.createdAt || t.date,
    }));

    res.status(200).json({ success: true, data: mappedTransactions });
  } catch (error) {
    next(error);
  }
};

const generateTransferOTP = async (req, res, next) => {
  try {
    const { senderAccount, receiverAccount, amount } = req.body;

    if (!senderAccount || !receiverAccount || !amount) {
      return res.status(400).json({
        success: false,
        message: 'senderAccount, receiverAccount and amount are required',
      });
    }

    if (senderAccount === receiverAccount) {
      return res.status(400).json({
        success: false,
        message: 'Sender and receiver accounts must be different',
      });
    }

    const otp = makeOTP();
    otpStore.set(senderAccount, {
      otp,
      receiverAccount,
      amount: Number(amount),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Mock OTP visibility for development/testing.
    console.log(`[BankSeva OTP] ${senderAccount} -> ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      otp,
    });
  } catch (error) {
    return next(error);
  }
};

const sendMoneyTransfer = async (req, res, next) => {
  try {
    const { senderAccount, receiverAccount, amount, pin, otp } = req.body;

    if (!senderAccount || !receiverAccount || amount == null || !pin || !otp) {
      return res.status(400).json({
        success: false,
        message: 'senderAccount, receiverAccount, amount, pin and otp are required',
      });
    }

    if (!/^\d{8,12}$/.test(senderAccount) || !/^\d{8,12}$/.test(receiverAccount)) {
      return res.status(400).json({
        success: false,
        message: 'Account number must be 8-12 digits',
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits',
      });
    }

    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    if (senderAccount === receiverAccount) {
      return res.status(400).json({
        success: false,
        message: 'Sender and receiver accounts must be different',
      });
    }

    const sender = await User.findOne({ accountNumber: senderAccount }).select('+pin');
    const receiver = await User.findOne({ accountNumber: receiverAccount });

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender account not found',
      });
    }

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver account not found',
      });
    }

    if (sender.balance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    const isPinValid = await sender.comparePin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect PIN',
      });
    }

    const otpRecord = otpStore.get(senderAccount);
    if (!otpRecord || otpRecord.expiresAt < Date.now()) {
      otpStore.delete(senderAccount);
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not generated',
      });
    }

    if (
      otpRecord.otp !== String(otp) ||
      otpRecord.receiverAccount !== receiverAccount ||
      Number(otpRecord.amount) !== transferAmount
    ) {
      return res.status(400).json({
        success: false,
        message: 'Wrong OTP',
      });
    }

    sender.balance -= transferAmount;
    receiver.balance += transferAmount;

    const senderTx = await Transaction.create({
      userId: String(sender._id),
      senderAccount,
      receiverAccount,
      amount: transferAmount,
      type: 'debit',
      category: 'transfer',
      status: 'success',
      description: `Transfer to ${receiverAccount}`,
      date: new Date(),
    });

    const receiverTx = await Transaction.create({
      userId: String(receiver._id),
      senderAccount,
      receiverAccount,
      amount: transferAmount,
      type: 'credit',
      category: 'transfer',
      status: 'success',
      description: `Received from ${senderAccount}`,
      date: new Date(),
    });

    sender.transactions.push(senderTx._id);
    receiver.transactions.push(receiverTx._id);

    await sender.save();
    await receiver.save();

    otpStore.delete(senderAccount);

    await Notification.create({
      userId: String(sender._id),
      type: 'transfer',
      message: `₹${transferAmount} sent to ${receiverAccount}`,
      read: false,
    });

    await Notification.create({
      userId: String(receiver._id),
      type: 'transfer',
      message: `₹${transferAmount} received from ${senderAccount}`,
      read: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Transfer successful',
      balance: sender.balance,
      data: {
        senderTransaction: senderTx,
        receiverTransaction: receiverTx,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const sendTransaction = async (req, res, next) => {
  try {
    const { userId, amount, category, date, description } = req.body;

    if (!userId || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount, and category are required',
      });
    }

    const transaction = await Transaction.create({
      userId,
      amount,
      category,
      type: 'debit',
      date: date || new Date(),
      description: description || 'Transaction sent',
    });

    await Notification.create({
      userId,
      type: 'transaction',
      message: `Debit transaction of ₹${amount} created under ${category}`,
      read: false,
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

const getInsights = async (_req, res, next) => {
  try {
    const transactions = await Transaction.find().lean();
    const insights = calculateInsights(transactions);
    res.status(200).json({ success: true, data: insights });
  } catch (error) {
    next(error);
  }
};

const fraudCheck = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }

    const risk = analyzeFraudRisk(message);
    res.status(200).json({ success: true, data: risk });
  } catch (error) {
    next(error);
  }
};

const calculateLoan = async (req, res, next) => {
  try {
    const { amount, interest, tenure } = req.body;

    const loanResult = calculateLoanDetails({ amount, interest, tenure });

    res.status(200).json({ success: true, data: loanResult });
  } catch (error) {
    error.status = 400;
    next(error);
  }
};

const chatAssistant = async (req, res, next) => {
  try {
    const { message = '', userId } = req.body;
    const text = String(message).trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }

    const normalized = text.toLowerCase();

    const isFraudIntent =
      normalized.includes('fraud') ||
      normalized.includes('scam') ||
      normalized.includes('otp') ||
      normalized.includes('verify') ||
      normalized.includes('urgent');

    if (isFraudIntent) {
      const fraud = analyzeFraudRisk(text);
      return res.status(200).json({
        success: true,
        data: {
          type: 'fraud',
          payload: fraud,
          text: 'Fraud analysis completed.',
        },
      });
    }

    const isLoanIntent = normalized.includes('loan') || normalized.includes('emi');
    if (isLoanIntent) {
      const values = text.match(LOAN_NUMBER_REGEX)?.map(Number) || [];

      if (values.length < 3) {
        return res.status(200).json({
          success: true,
          data: {
            type: 'emi',
            payload: null,
            text: 'Please share loan amount, annual interest(%), and tenure in months (example: 100000 10 24).',
          },
        });
      }

      const [amount, interest, tenure] = values;
      const emi = calculateLoanDetails({ amount, interest, tenure });

      return res.status(200).json({
        success: true,
        data: {
          type: 'emi',
          payload: {
            ...emi,
            amount,
            interest,
            tenure,
          },
          text: 'EMI calculation ready.',
        },
      });
    }

    const isInsightIntent =
      normalized.includes('insight') ||
      normalized.includes('spend') ||
      normalized.includes('transaction summary') ||
      normalized.includes('summary');

    if (isInsightIntent) {
      const query = userId ? { userId } : {};
      const transactions = await Transaction.find(query).lean();
      const insights = calculateInsights(transactions);

      return res.status(200).json({
        success: true,
        data: {
          type: 'insights',
          payload: insights,
          text: 'Transaction insights generated.',
        },
      });
    }

    if (normalized.includes('complaint') || normalized.includes('issue')) {
      return res.status(200).json({
        success: true,
        data: {
          type: 'complaint',
          payload: null,
          text: 'Opening complaint assistant. Please provide title and issue details.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        type: 'text',
        payload: null,
        text: 'Try asking about fraud, EMI, transaction insights, or complaint support.',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  generateTransferOTP,
  sendMoneyTransfer,
  sendTransaction,
  getInsights,
  fraudCheck,
  calculateLoan,
  chatAssistant,
};
