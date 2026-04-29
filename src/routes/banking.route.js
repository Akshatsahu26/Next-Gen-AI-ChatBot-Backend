const express = require('express');
const { body } = require('express-validator');
const { transferMoney, applyLoan, reportFraud, getBalance } = require('../controllers/banking.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Apply JWT Authentication to all banking routes
router.use(authMiddleware);

router.post(
  '/transfer',
  [
    body('receiverId').notEmpty().withMessage('receiverId is required'),
    body('amount').isNumeric().withMessage('amount must be a valid number').custom(val => val > 0).withMessage('amount must be greater than zero'),
  ],
  transferMoney
);

router.post(
  '/loan',
  [
    body('amount').isNumeric().withMessage('amount must be a valid number').custom(val => val > 0).withMessage('amount must be greater than zero'),
    body('type').notEmpty().withMessage('type is required'),
  ],
  applyLoan
);

router.post(
  '/fraud',
  [
    body('description').notEmpty().withMessage('description is required').isLength({ min: 10 }).withMessage('description must be at least 10 characters long'),
  ],
  reportFraud
);

router.post(
  '/balance',
  [
    body('accountNumber').optional().isString().withMessage('accountNumber must be a string'),
  ],
  getBalance
);

module.exports = router;
