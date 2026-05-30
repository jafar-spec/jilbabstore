const admin = require('firebase-admin');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const match = envLocal.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([^']+)'/);
if (!match) throw new Error("Key not found");

const serviceAccount = JSON.parse(match[1]);
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function check() {
  try {
    const user = await auth.getUserByEmail('jafar.01.salama@gmail.com');
    const doc = await db.collection('admins').doc(user.uid).get();
    console.log("Admin exists:", doc.exists);
    console.log("Admin data:", doc.data());
  } catch (e) {
    console.error(e);
  }
}

check();
