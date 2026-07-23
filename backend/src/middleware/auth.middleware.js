const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Two supported auth paths:
 *  1. Firebase ID token on /api/auth/register|login — verified against Firebase,
 *     used to find-or-create the User and issue our own session JWT.
 *  2. Session JWT (issued above) on every other request — verified locally,
 *     no round trip to Firebase needed.
 *
 * This middleware handles path 2 (and lazily upgrades a Firebase token if one
 * is presented directly, so the frontend can use a single Authorization header
 * during the initial login exchange).
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Try our own session JWT first (the common case).
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      req.user = user;
      req.userId = user._id.toString();
      user.lastActiveAt = new Date();
      user.save().catch((err) => logger.error('Failed to update lastActiveAt', err));
      return next();
    } catch (jwtErr) {
      // Fall through to Firebase verification (e.g. first login exchange).
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        displayName: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User'),
        avatarUrl: decodedToken.picture || null,
      });
    }

    req.user = user;
    req.userId = user._id.toString();
    req.firebaseUid = decodedToken.uid;
    next();
  } catch (err) {
    logger.warn('Auth failed', err.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware };
