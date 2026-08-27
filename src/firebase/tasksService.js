import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'tasks';

// Escucha cambios en tiempo real
export function subscribeTasks(callback) {
  const q = query(collection(db, COLLECTION), orderBy('numero', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(tasks);
  });
}

// Obtener todas las tareas (una sola vez)
export async function getTasks() {
  const q = query(collection(db, COLLECTION), orderBy('numero', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Agregar nueva tarea
export async function addTask(task) {
  return await addDoc(collection(db, COLLECTION), task);
}

// Actualizar tarea
export async function updateTask(id, data) {
  const ref = doc(db, COLLECTION, id);
  return await updateDoc(ref, data);
}

// Eliminar tarea
export async function deleteTask(id) {
  const ref = doc(db, COLLECTION, id);
  return await deleteDoc(ref);
}

// Cargar datos iniciales (seed) — solo si la colección está vacía
export async function seedIfEmpty(initialData) {
  const snapshot = await getDocs(collection(db, COLLECTION));
  if (!snapshot.empty) return false;
  const batch = writeBatch(db);
  initialData.forEach((task) => {
    const ref = doc(collection(db, COLLECTION));
    batch.set(ref, task);
  });
  await batch.commit();
  return true;
}
