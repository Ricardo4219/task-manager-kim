import { createContext, useContext, useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../firebase/config';
import { subscribeTasks, seedIfEmpty } from '../firebase/tasksService';
import {
  subscribeTasksLocal,
  seedIfEmptyLocal,
} from '../firebase/localService';
import { initialData } from '../data/initialData';

const TasksContext = createContext(null);

function checkAndApplyOverdueStatus(tasks) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return tasks.map(task => {
    if (task.estatus === 'Completado' || !task.fechaCompletado) {
      return task;
    }

    const fechaLimite = new Date(`${task.fechaCompletado}T00:00:00`);
    if (isNaN(fechaLimite.getTime())) {
      return task;
    }

    if (hoy > fechaLimite) {
      return { ...task, estatus: 'Retrasado' };
    }
    
    // Si hoy no es mayor que la fecha límite, pero el estatus es 'Retrasado',
    // lo revertimos a 'En Proceso' para corregir datos incorrectos.
    if (task.estatus === 'Retrasado' && hoy <= fechaLimite) {
      return { ...task, estatus: 'En Proceso' };
    }

    return task;
  });
}

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFirebase, setUsingFirebase] = useState(isFirebaseConfigured);

  useEffect(() => {
    const processTasks = (data) => {
      const tasksWithStatus = checkAndApplyOverdueStatus(data);
      setTasks(tasksWithStatus);
      setLoading(false);
    };

    let unsub = () => {};

    if (isFirebaseConfigured) {
      // Modo Firebase
      seedIfEmpty(initialData).then(() => {
        unsub = subscribeTasks(processTasks);
      });
    } else {
      // Modo localStorage (demo)
      seedIfEmptyLocal();
      unsub = subscribeTasksLocal(processTasks);
    }

    // Job en segundo plano: verifica los retrasos automáticamente cada minuto (60000ms)
    // Esto asegura que el estado "Retrasado" se actualice en tiempo real si el día cambia.
    const intervalId = setInterval(() => {
      setTasks((currentTasks) => checkAndApplyOverdueStatus(currentTasks));
    }, 60000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <TasksContext.Provider value={{ tasks, loading, usingFirebase }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  return useContext(TasksContext);
}
