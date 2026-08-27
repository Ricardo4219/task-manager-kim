import { createContext, useContext, useState, useEffect } from 'react';

const ProjectsOrderContext = createContext(null);

const STORAGE_KEY = 'projectsOrder';

export function ProjectsOrderProvider({ children }) {
  const [projectOrder, setProjectOrder] = useState([]);

  // Cargar orden desde localStorage al iniciar; si está vacío, dejar vacío (se construye con flechas)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) setProjectOrder(parsed);
      } catch (e) {
        console.error('Error al cargar orden de proyectos:', e);
      }
    }
  }, []);

  // Guardar orden en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectOrder));
  }, [projectOrder]);

  function moveProjectUp(projectName, currentProjects = []) {
    setProjectOrder((prev) => {
      let list = prev;
      // Si no hay orden guardado, construirlo con los proyectos actuales
      if (list.length === 0 && currentProjects.length > 0) {
        list = [...currentProjects].sort();
      }
      const index = list.indexOf(projectName);
      if (index <= 0) return list;
      const newOrder = [...list];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  }

  function moveProjectDown(projectName, currentProjects = []) {
    setProjectOrder((prev) => {
      let list = prev;
      if (list.length === 0 && currentProjects.length > 0) {
        list = [...currentProjects].sort();
      }
      const index = list.indexOf(projectName);
      if (index < 0 || index >= list.length - 1) return list;
      const newOrder = [...list];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  }

  function addProject(projectName) {
    setProjectOrder((prev) => {
      if (!prev.includes(projectName)) {
        return [...prev, projectName];
      }
      return prev;
    });
  }

  function getSortedProjects(projects) {
    // Primero los que están en el orden personalizado
    const ordered = projectOrder.filter((p) => projects.includes(p));
    // Luego los nuevos que no tienen orden asignado
    const unordered = projects.filter((p) => !projectOrder.includes(p)).sort();
    return [...ordered, ...unordered];
  }

  return (
    <ProjectsOrderContext.Provider
      value={{ projectOrder, moveProjectUp, moveProjectDown, addProject, getSortedProjects }}
    >
      {children}
    </ProjectsOrderContext.Provider>
  );
}

export function useProjectsOrder() {
  const context = useContext(ProjectsOrderContext);
  if (!context) {
    throw new Error('useProjectsOrder debe usarse dentro de ProjectsOrderProvider');
  }
  return context;
}
