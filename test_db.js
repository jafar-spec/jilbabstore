import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = {
  apiKey: "dummy",
  projectId: "jilbab-store"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use emulator or real DB? We are just reading the local config... Wait, we don't have the env vars here.
