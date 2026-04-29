const express = require('express');
const protect = require('../middleware/auth.middleware');
const {
  calculateLoan,
  applyLoan,
  getUserLoans,
} = require('../controllers/loan.controller');

const router = express.Router();

router.post('/calculate', protect, calculateLoan);
router.post('/apply', protect, applyLoan);
router.get('/user/:id', protect, getUserLoans);

module.exports = router;
