import { useState } from 'react';
import { useTasks } from '../context/TasksContext';
import { updateTask, deleteTask } from '../firebase/dataService';
import TaskModal from '../components/TaskModal';

const ESTATUS_OPTIONS = ['En Proceso', 'Completado', 'Retrasado', 'No iniciado'];
const ESTATUS_COLORS = {
  'En Proceso': { bg: '#3b82f620', text: '#3b82f6' },
  'Completado': { bg: '#22c55e20', text: '#22c55e' },
  'Retrasado': { bg: '#ef444420', text: '#ef4444' },
  'No iniciado': { bg: '#94a3b820', text: '#94a3b8' },
};

function InlineSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
    >
      {ESTATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function InlinePercent({ value, onChange }) {
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 accent-blue-500"
      />
      <span className="text-xs text-gray-500 w-8">{value}%</span>
    </div>
  );
}

export default function Administrador() {
  const { tasks, loading } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [saving, setSaving] = useState({});

  const filtradas = tasks.filter((t) =>
    !busqueda ||
    t.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.proyecto?.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function handleEstatusChange(id, estatus) {
    setPendingUpdates((p) => ({ ...p, [id]: { ...p[id], estatus } }));
    setSaving((s) => ({ ...s, [id]: true }));
    await updateTask(id, { estatus });
    setSaving((s) => ({ ...s, [id]: false }));
  }

  async function handlePorcentajeChange(id, porcentaje) {
    setPendingUpdates((p) => ({ ...p, [id]: { ...p[id], porcentaje } }));
    setSaving((s) => ({ ...s, [id]: true }));
    await updateTask(id, { porcentaje });
    setSaving((s) => ({ ...s, [id]: false }));
  }

  async function handleDelete(id, numero) {
    if (!confirm(`¿Eliminar la tarea #${numero}? Esta acción no se puede deshacer.`)) return;
    await deleteTask(id);
  }

  function abrirEditar(tarea) {
    setTareaSeleccionada(tarea);
    setModalOpen(true);
  }

  function abrirNueva() {
    setTareaSeleccionada(null);
    setModalOpen(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Administrador</h1>
          <p className="text-sm text-gray-500">Gestión completa de tareas — edita estatus y avance directamente</p>
        </div>
        <button
          onClick={abrirNueva}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          + Nueva Tarea
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Buscar por descripción o proyecto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-md"
        />
      </div>

      {/* Tabla editable */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Fecha Límite</th>
                <th className="px-4 py-3">Avance</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3">Guardando</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((t) => {
                const pct = pendingUpdates[t.id]?.porcentaje ?? t.porcentaje ?? 0;
                const est = pendingUpdates[t.id]?.estatus ?? t.estatus;
                return (
                  <tr
                    key={t.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400">{t.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{t.proyecto}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <span className="line-clamp-2">{t.descripcion}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.fechaCompletado || '—'}</td>
                    <td className="px-4 py-3 min-w-40">
                      <InlinePercent
                        value={pct}
                        onChange={(v) => handlePorcentajeChange(t.id, v)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InlineSelect
                        value={est}
                        onChange={(v) => handleEstatusChange(t.id, v)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {saving[t.id] ? (
                        <span className="text-blue-400 text-xs animate-pulse">💾 guardando...</span>
                      ) : (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirEditar(t)}
                          className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.numero)}
                          className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-10">
                    No se encontraron tareas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <TaskModal
          tarea={tareaSeleccionada}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
