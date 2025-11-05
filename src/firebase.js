// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC0Mqs2KxQJtbBaa33HaCGfwBvoVqedPTg",
  authDomain: "casamento-diego-yasmin.firebaseapp.com",
  projectId: "casamento-diego-yasmin",
  storageBucket: "casamento-diego-yasmin.firebasestorage.app",
  messagingSenderId: "788933588291",
  appId: "1:788933588291:web:83424d698a2369dc54abf6",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
