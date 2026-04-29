const express = require('express');
const { applyLoan, transferMoney, registerComplaint } = require('../controllers/action.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/apply-loan', authMiddleware, applyLoan);
router.post('/transfer-money', authMiddleware, transferMoney);
router.post('/register-complaint', authMiddleware, registerComplaint);

module.exports = router;
