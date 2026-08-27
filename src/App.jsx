import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TasksProvider } from './context/TasksContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectsOrderProvider } from './context/ProjectsOrderContext';
import { isFirebaseConfigured } from './firebase/config';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Tareas from './pages/Tareas';
import Proyectos from './pages/Proyectos';
import TareasTerminadas from './pages/TareasTerminadas';

function DemoBanner() {
  if (isFirebaseConfigured) return null;
  return (
    <div className="bg-amber-400 text-amber-900 text-xs text-center py-1.5 font-medium">
      ⚡ Modo Demo — Los datos se guardan localmente en este navegador. Conecta Firebase para sincronizar en la nube.
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <DemoBanner />
      <div className="flex flex-1 bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tareas" element={
              <ProtectedRoute><Tareas /></ProtectedRoute>
            } />
            <Route path="/proyectos" element={
              <ProtectedRoute><Proyectos /></ProtectedRoute>
            } />
            <Route path="/tareas-terminadas" element={
              <ProtectedRoute><TareasTerminadas /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TasksProvider>
          <ProjectsOrderProvider>
            <AppLayout />
          </ProjectsOrderProvider>
        </TasksProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

