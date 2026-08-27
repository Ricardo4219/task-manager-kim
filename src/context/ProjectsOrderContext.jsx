import { createContext, useContext, useState, useEffect } from 'react';

const ProjectsOrderContext = createContext(null);

const STORAGE_KEY = 'projectsOrder';

export function ProjectsOrderProvider({ children }) {
  const [projectOrder, setProjectOrder] = useState([]);

  // Cargar orden desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProjectOrder(JSON.parse(saved));
      } catch (e) {
        console.error('Error al cargar orden de proyectos:', e);
      }
    }
  }, []);

  // Guardar orden en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectOrder));
  }, [projectOrder]);

  function moveProjectUp(projectName) {
    setProjectOrder((prev) => {
      const index = prev.indexOf(projectName);
      if (index <= 0) return prev;
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  }

  function moveProjectDown(projectName) {
    setProjectOrder((prev) => {
      const index = prev.indexOf(projectName);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newOrder = [...prev];
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
