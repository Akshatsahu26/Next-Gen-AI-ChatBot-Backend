const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { addTokenToBlacklist } = require('../utils/tokenBlacklist');

const buildToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'identifier and password are required',
      });
    }

    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase().trim() }
      : { phone: identifier.trim() };

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = buildToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    return next(error);
  }
};

const getProtectedDashboard = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to your protected dashboard',
    user: req.user,
  });
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    addTokenToBlacklist(token);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};

module.exports = {
  login,
  getProtectedDashboard,
  logout,
};
