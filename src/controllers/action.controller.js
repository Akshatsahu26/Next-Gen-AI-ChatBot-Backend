const mongoose = require('mongoose');
const User = require('../models/user.model');
const Transaction = require('../../models/Transaction');

const applyLoan = async (req, res) => {
  try {
    const { income, employment, amount } = req.body;
    
    // Simulate 2 seconds backend processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Basic logic to determine mock approval
    const isApproved = parseFloat(income) * 10 > parseFloat(amount);
    
    return res.status(200).json({
      success: true,
      data: {
        status: isApproved ? 'APPROVED' : 'REJECTED',
        amountRequested: amount,
        referenceId: `LOAN-${Date.now()}`,
        message: isApproved 
          ? 'Congratulations, your loan application is pre-approved based on your profile.' 
          : 'Unfortunately, we cannot approve this loan amount based on the provided income.',
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Loan application failed' });
  }
};

const transferMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { recipient, amount, pin } = req.body;
    const transferAmount = Number(amount);
    
    console.log(`[Transfer Start] User ${req.user._id} initiating transfer of ${transferAmount} to ${recipient}`);

    if (!transferAmount || transferAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    // 1. Fetch sender with PIN
    const sender = await User.findById(req.user._id).select('+pin').session(session);
    if (!sender) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: 'Sender not found' });
    }

    // 2. Validate PIN
    const isPinValid = await sender.comparePin(String(pin));
    if (!isPinValid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, error: 'Invalid UPI PIN entered' });
    }

    // 3. Fetch recipient (lookup by accountNumber first, then by name)
    let receiver = await User.findOne({ accountNumber: recipient }).session(session);
    if (!receiver) {
      // Fallback: search by name (case-insensitive)
      receiver = await User.findOne({ name: { $regex: new RegExp(`^${recipient}$`, 'i') } }).session(session);
    }

    if (!receiver) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: `Recipient ${recipient} not found in our system` });
    }

    if (sender._id.toString() === receiver._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: 'Cannot transfer to yourself' });
    }

    // 4. Check balance
    if (sender.balance < transferAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    console.log(`[Before Transfer] Sender Balance: ${sender.balance}, Receiver Balance: ${receiver.balance}`);

    // 5. Update Balances
    sender.balance -= transferAmount;
    receiver.balance += transferAmount;

    // 6. Create Transaction Records
    const senderTx = await Transaction.create([{
      userId: String(sender._id),
      senderAccount: sender.accountNumber,
      receiverAccount: receiver.accountNumber,
      amount: transferAmount,
      type: 'debit',
      category: 'transfer',
      status: 'success',
      description: `Transfer to ${receiver.name || receiver.accountNumber}`,
      date: new Date(),
    }], { session });

    const receiverTx = await Transaction.create([{
      userId: String(receiver._id),
      senderAccount: sender.accountNumber,
      receiverAccount: receiver.accountNumber,
      amount: transferAmount,
      type: 'credit',
      category: 'transfer',
      status: 'success',
      description: `Received from ${sender.name || sender.accountNumber}`,
      date: new Date(),
    }], { session });

    sender.transactions.push(senderTx[0]._id);
    receiver.transactions.push(receiverTx[0]._id);

    await sender.save({ session });
    await receiver.save({ session });

    // 7. Commit Transaction
    await session.commitTransaction();
    session.endSession();

    console.log(`[After Transfer] Sender Balance: ${sender.balance}, Receiver Balance: ${receiver.balance}, TXN Logged`);

    return res.status(200).json({
      success: true,
      status: 'success',
      message: 'Transfer completed',
      newBalance: sender.balance,
      data: {
        status: 'SUCCESS',
        transactionId: senderTx[0]._id,
        recipient: receiver.name || receiver.accountNumber,
        amount: transferAmount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Transfer Error]', error);
    return res.status(500).json({ error: error.message || 'Money transfer failed' });
  }
};

const registerComplaint = async (req, res) => {
  try {
    const { issue } = req.body;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return res.status(200).json({
      success: true,
      data: {
        ticketId: `CMP-${Date.now()}`,
        status: 'OPEN',
        trackedIssue: issue
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Complaint registration failed' });
  }
};

module.exports = {
  applyLoan,
  transferMoney,
  registerComplaint
};