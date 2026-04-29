const express = require('express');
const { login, logout, getProtectedDashboard } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/auth/login', login);
router.post('/auth/logout', authMiddleware, logout);
router.get('/protected/dashboard', authMiddleware, getProtectedDashboard);

module.exports = router;
