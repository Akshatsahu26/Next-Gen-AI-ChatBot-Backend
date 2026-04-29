// In-memory blacklist for invalidated tokens.
// Note: this resets on server restart (good for hackathons/dev, replace with Redis for prod scale).
const blacklistedTokens = new Set();

const addTokenToBlacklist = (token) => {
  if (!token) return;
  blacklistedTokens.add(token);
};

const isTokenBlacklisted = (token) => blacklistedTokens.has(token);

module.exports = {
  addTokenToBlacklist,
  isTokenBlacklisted,
};
