import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      // Fix newlines in the private key if they are escaped
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing.");
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
