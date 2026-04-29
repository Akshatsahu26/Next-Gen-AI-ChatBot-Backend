const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { isTokenBlacklisted } = require('../utils/tokenBlacklist');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing or invalid token header',
      });
    }

    const token = authHeader.split(' ')[1];

    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: token has been logged out',
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server auth configuration error',
      });
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found',
      });
    }

    req.user = user.toSafeObject();
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: invalid or expired token',
    });
  }
};

module.exports = authMiddleware;
