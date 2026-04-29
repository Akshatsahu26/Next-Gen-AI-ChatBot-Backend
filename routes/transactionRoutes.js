const express = require('express');
const {
  getTransactions,
  generateTransferOTP,
  sendMoneyTransfer,
  sendTransaction,
  getInsights,
  fraudCheck,
} = require('../controllers/transactionController');

const authMiddleware = require('../src/middleware/auth.middleware');

const router = express.Router();

router.get('/transactions', authMiddleware, getTransactions);
router.get('/transaction', authMiddleware, getTransactions);
router.post('/transaction/generate-otp', generateTransferOTP);
router.post('/transaction/send', sendMoneyTransfer);
router.post('/transactions/send', sendTransaction);
router.get('/transactions/insights', getInsights);
router.post('/fraud-check', fraudCheck);

module.exports = router;
