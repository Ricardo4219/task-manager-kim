// Reemplaza estos valores con los de tu proyecto Firebase:
// Ve a https://console.firebase.google.com → Tu proyecto → Configuración → Agregar app web
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCzzCsNXgYp7BHUY6uJveqkMWrymGML6CE",
  authDomain: "proyectos-kim.firebaseapp.com",
  projectId: "proyectos-kim",
  storageBucket: "proyectos-kim.firebasestorage.app",
  messagingSenderId: "95721848612",
  appId: "1:95721848612:web:abab651f57cfa7c11e3db1"
};

// Detecta si los valores son placeholders (modo demo)
export const isFirebaseConfigured = !firebaseConfig.apiKey.startsWith('TU_');

export let db = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}
