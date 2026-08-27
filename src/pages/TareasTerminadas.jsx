import React, { useState } from 'react';
import { useTasks } from '../context/TasksContext';
import { updateTask, deleteTask } from '../firebase/dataService';
import TaskModal from '../components/TaskModal';

const PRIORIDAD_LABEL = { 1: 'Alto', 2: 'Mediano', 3: 'Bajo' };
const PRIORIDAD_COLORS = {
  1: { bg: '#EF444415', text: '#EF4444' },
  2: { bg: '#F5A62315', text: '#F5A623' },
  3: { bg: '#10B98115', text: '#10B981' },
};

export default function TareasTerminadas() {
  const { tasks, loading } = useTasks();
  const [busqueda, setBusqueda] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [saving, setSaving] = useState({});

  const proyectos = [...new Set(tasks
    .filter(t => t.estatus === 'Completado')
    .map((t) => t.proyecto))].sort();

  async function handleReactivate(id, e) {
    e.stopPropagation();
    setSaving((s) => ({ ...s, [id]: true }));
    await updateTask(id, { estatus: 'En Proceso', porcentaje: 99 });
    setSaving((s) => ({ ...s, [id]: false }));
  }

  async function handleDelete(id, numero, e) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la tarea #${numero}? Esta acción no se puede deshacer.`)) return;
    await deleteTask(id);
  }

  const filtradas = tasks
    .filter((t) => t.estatus === 'Completado')
    .filter((t) => {
      const matchBusqueda =
        !busqueda ||
        t.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.proyecto?.toLowerCase().includes(busqueda.toLowerCase());
      const matchProyecto = !filtroProyecto || t.proyecto === filtroProyecto;
      return matchBusqueda && matchProyecto;
    })
    .sort((a, b) => {
      // Agrupar por proyecto
      const projA = a.proyecto || 'z_Sin Proyecto';
      const projB = b.proyecto || 'z_Sin Proyecto';
      if (projA !== projB) return projA.localeCompare(projB);
      // Dentro de proyecto, por fecha más reciente primero
      return new Date(b.fechaCompletado || 0) - new Date(a.fechaCompletado || 0);
    });

  const tareasTerminadasCount = tasks.filter(t => t.estatus === 'Completado').length;

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-pink-50">
      <div className="p-8 max-w-full">
      {modalOpen && (
        <TaskModal
          tarea={tareaSeleccionada}
          onClose={() => {
            setModalOpen(false);
            setTareaSeleccionada(null);
          }}
        />
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">Tareas Terminadas</h1>
        <p className="text-sm text-gray-600 mt-2">{tareasTerminadasCount} tareas completadas</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 space-y-4 border border-purple-100/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-3 border border-purple-300/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
          />
          <select
            value={filtroProyecto}
            onChange={(e) => setFiltroProyecto(e.target.value)}
            className="px-4 py-3 border border-purple-300/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de tareas */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-purple-100">
          <p className="text-gray-500 text-sm">No hay tareas completadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((tarea) => (
            <div
              key={tarea.id}
              onClick={() => {
                setTareaSeleccionada(tarea);
                setModalOpen(true);
              }}
              className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all duration-200 cursor-pointer border border-green-200 bg-gradient-to-r from-white to-green-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">#{tarea.numero}</span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      ✓ Completada
                    </span>
                    <span
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{
                        backgroundColor: PRIORIDAD_COLORS[tarea.prioridad]?.bg,
                        color: PRIORIDAD_COLORS[tarea.prioridad]?.text,
                      }}
                    >
                      {PRIORIDAD_LABEL[tarea.prioridad]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium break-words">{tarea.descripcion}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">{tarea.proyecto}</p>
                  {tarea.fechaCompletado && (
                    <p className="text-xs text-gray-500 mt-1">Terminada: {tarea.fechaCompletado}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => handleReactivate(tarea.id, e)}
                    disabled={saving[tarea.id]}
                    title="Reactivar tarea"
                    className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 active:bg-purple-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {saving[tarea.id] ? '...' : '↺ Reactivar'}
                  </button>
                  <button
                    onClick={(e) => handleDelete(tarea.id, tarea.numero, e)}
                    title="Eliminar tarea"
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
