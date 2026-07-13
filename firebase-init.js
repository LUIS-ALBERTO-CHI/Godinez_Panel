/* ============================================================================
   Inicialización de Firebase (SDK modular vía CDN, sin build step)
   ============================================================================
   Exporta la app, auth y db ya inicializados, más los helpers de Firestore/Auth
   que usan app.js y admin.js. Todo se importa desde el CDN de gstatic.
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  initializeFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Usamos la base "(default)". Forzamos "long polling" porque el transporte de
// streaming de Firestore suele quedar bloqueado por redes corporativas, antivirus
// o extensiones del navegador → error "client is offline".
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export {
  app,
  auth,
  db,
  ADMIN_EMAIL,
  // Auth
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  // Firestore
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
};
