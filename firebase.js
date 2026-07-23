const admin = require('firebase-admin');
const logger = require('../utils/logger');

function initFirebase() {
  if (admin.apps.length) return admin;

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('Firebase Admin initialized');
  } catch (err) {
    logger.error('Firebase Admin initialization failed', err.message);
  }

  return admin;
}

module.exports = initFirebase();
