// Servicio de datos basado en localStorage (modo demo / sin Firebase)
import { initialData } from '../data/initialData';

const KEY = 'taskmanager_tasks_v2';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveToStorage(tasks) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

function getTasks() {
  let tasks = loadFromStorage();
  if (!tasks) {
    tasks = initialData.map((t, i) => ({ ...t, id: `local_${i}` }));
    saveToStorage(tasks);
  }
  return tasks;
}

// Listeners en memoria para simular tiempo real
const listeners = new Set();

function notify() {
  const tasks = getTasks();
  listeners.forEach((cb) => cb(tasks));
}

export function subscribeTasksLocal(callback) {
  listeners.add(callback);
  // Llamar inmediatamente con los datos actuales
  callback(getTasks());
  return () => listeners.delete(callback);
}

export async function getTasksLocal() {
  return getTasks();
}

export async function addTaskLocal(task) {
  const tasks = getTasks();
  const newTask = { ...task, id: `local_${Date.now()}` };
  tasks.push(newTask);
  saveToStorage(tasks);
  notify();
  return newTask;
}

export async function updateTaskLocal(id, data) {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...data };
    saveToStorage(tasks);
    notify();
  }
}

export async function deleteTaskLocal(id) {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveToStorage(tasks);
  notify();
}

export async function seedIfEmptyLocal() {
  const existing = loadFromStorage();
  if (!existing) {
    const tasks = initialData.map((t, i) => ({ ...t, id: `local_${i}` }));
    saveToStorage(tasks);
    notify();
    return true;
  }
  return false;
}
