// Servicio unificado: usa Firebase si está configurado, localStorage si no.
import { isFirebaseConfigured } from './config';
import {
  addTask as fbAdd,
  updateTask as fbUpdate,
  deleteTask as fbDelete,
} from './tasksService';
import {
  addTaskLocal,
  updateTaskLocal,
  deleteTaskLocal,
} from './localService';

export async function addTask(task) {
  return isFirebaseConfigured ? fbAdd(task) : addTaskLocal(task);
}

export async function updateTask(id, data) {
  return isFirebaseConfigured ? fbUpdate(id, data) : updateTaskLocal(id, data);
}

export async function deleteTask(id) {
  return isFirebaseConfigured ? fbDelete(id) : deleteTaskLocal(id);
}
