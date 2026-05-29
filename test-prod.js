const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "test",
  projectId: "jilbab-store",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const d = await getDoc(doc(db, "products", "F6r8AtHuaupkZ62wqJeX"));
  console.log("Exists:", d.exists());
  process.exit(0);
}
check();
