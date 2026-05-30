const admin = require('firebase-admin');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const match = envLocal.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([^']+)'/);
if (!match) throw new Error("Key not found in .env.local");

const serviceAccount = JSON.parse(match[1]);
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function fixAdmin() {
  try {
    // 1. Revoke the wrong admin
    try {
      const wrongUser = await auth.getUserByEmail('coralreef525@carpkingdom.com');
      await db.collection('admins').doc(wrongUser.uid).delete();
      console.log('Revoked admin rights from coralreef525@carpkingdom.com');
    } catch (e) {
      console.log('Wrong user not found or already deleted');
    }

    // 2. Assign the correct admin
    let correctUser;
    try {
      correctUser = await auth.getUserByEmail('jafar.01.salama@gmail.com');
      await auth.updateUser(correctUser.uid, { emailVerified: true });
      console.log("Forcibly verified email for existing user.");
    } catch (e) {
      console.log("User not found, creating jafar.01.salama@gmail.com with password 'admin123'...");
      correctUser = await auth.createUser({
        email: 'jafar.01.salama@gmail.com',
        password: 'admin123',
        emailVerified: true
      });
    }

    await db.collection('admins').doc(correctUser.uid).set({
      role: 'operator',
      email: correctUser.email
    }, { merge: true });
    console.log(`Successfully assigned operator role to ${correctUser.email}`);
  } catch (error) {
    console.error("Error fixing admin:", error);
  }
}

fixAdmin();
