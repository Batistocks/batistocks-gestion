import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Clés de configuration de ton projet Firebase "batistocks-gestion"
const firebaseConfig = {
  apiKey: "AIzaSyDG08lDnnusKRUj9PbX9c1M4I5lagRHIFQ",
  authDomain: "batistocks-gestion.firebaseapp.com",
  projectId: "batistocks-gestion",
  storageBucket: "batistocks-gestion.firebasestorage.app",
  messagingSenderId: "1036529479942",
  appId: "1:1036529479942:web:c299c001bc50177900ee87",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
