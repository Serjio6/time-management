const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');

function issueSessionToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), firebaseUid: user.firebaseUid, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

exports.register = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) throw new ApiError(400, 'idToken is required');

  const decoded = await admin.auth().verifyIdToken(idToken);

  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (user) throw new ApiError(409, 'User already registered, use /login instead');

  user = await User.create({
    firebaseUid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified || false,
    displayName: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
    avatarUrl: decoded.picture || null,
  });

  const token = issueSessionToken(user);
  res.status(201).json({ success: true, data: { token, user } });
});

exports.login = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) throw new ApiError(400, 'idToken is required');

  const decoded = await admin.auth().verifyIdToken(idToken);

  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified || false,
      displayName: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
      avatarUrl: decoded.picture || null,
    });
  }

  user.lastActiveAt = new Date();
  await user.save();

  const token = issueSessionToken(user);
  res.json({ success: true, data: { token, user } });
});

exports.refresh = asyncHandler(async (req, res) => {
  // req.user is populated by authMiddleware from the current (possibly soon-to-expire) token
  const token = issueSessionToken(req.user);
  res.json({ success: true, data: { token } });
});

exports.logout = asyncHandler(async (req, res) => {
  // Stateless JWT — logout is handled client-side by discarding the token.
  // If a denylist is needed later, record req.token's jti in Redis here.
  res.json({ success: true, data: { message: 'Logged out' } });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['displayName', 'avatarUrl', 'profile'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
});
