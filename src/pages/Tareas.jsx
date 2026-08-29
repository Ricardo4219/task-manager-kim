import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TasksContext';
import { useProjectsOrder } from '../context/ProjectsOrderContext';
import { updateTask, deleteTask } from '../firebase/dataService';
import TaskModal from '../components/TaskModal';

const ESTATUS_OPTIONS = ['En Proceso', 'Completado', 'Retrasado', 'No iniciado'];

const ESTATUS_COLORS = {
  'En Proceso': { bg: '#0066FF15', text: '#0066FF' },
  'Completado': { bg: '#00D08415', text: '#00D084' },
  'Retrasado': { bg: '#FF3B3015', text: '#FF3B30' },
  'No iniciado': { bg: '#94a3b820', text: '#6B7280' },
};

const PRIORIDAD_LABEL = { 1: 'Alto', 2: 'Mediano', 3: 'Bajo' };
const PRIORIDAD_COLORS = {
  1: { bg: '#FF3B3015', text: '#FF3B30' },
  2: { bg: '#F5A62315', text: '#F5A623' },
  3: { bg: '#00D08415', text: '#00D084' },
};

function diasRetraso(fechaCompletado) {
  if (!fechaCompletado) return 0;

  const fechaLimite = new Date(`${fechaCompletado}T00:00:00`);
  
  if (isNaN(fechaLimite.getTime())) {
    return 0;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (hoy > fechaLimite) {
    const diffTiempo = hoy.getTime() - fechaLimite.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
    return diffDias;
  }
  
  return 0;
}

export default function Tareas() {
  const { tasks, loading } = useTasks();
  const { getSortedProjects, moveProjectUp, moveProjectDown } = useProjectsOrder();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [saving, setSaving] = useState({});

  // Obtener proyectos ordenados
  const proyectosOrdenados = useMemo(() => {
    const uniqueProjects = [...new Set(tasks.map((t) => t.proyecto))];
    return getSortedProjects(uniqueProjects);
  }, [tasks, getSortedProjects]);

  async function handlePorcentajeChange(id, porcentaje, e) {
    e.stopPropagation();
    setSaving((s) => ({ ...s, [id]: true }));
    
    // Cálculo automático de estatus
    let nuevoEstatus = 'No iniciado';
    if (porcentaje > 0) nuevoEstatus = 'En Proceso';
    if (porcentaje === 100) nuevoEstatus = 'Completado';
    
    await updateTask(id, { porcentaje, estatus: nuevoEstatus });
    setSaving((s) => ({ ...s, [id]: false }));
  }

  async function handleDelete(id, numero, e) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la tarea #${numero}? Esta acción no se puede deshacer.`)) return;
    await deleteTask(id);
  }

  async function handleMarcarCompletada(id, porcentaje, e) {
    e.stopPropagation();
    setSaving((s) => ({ ...s, [id]: true }));
    await updateTask(id, { estatus: 'Completado', porcentaje: porcentaje || 100 });
    setSaving((s) => ({ ...s, [id]: false }));
  }

  const filtradas = tasks
    .filter((t) => t.estatus !== 'Completado')
    .filter((t) => {
      const matchBusqueda =
        !busqueda ||
        t.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.proyecto?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstatus = !filtroEstatus || t.estatus === filtroEstatus;
      const matchPrioridad = !filtroPrioridad || String(t.prioridad) === filtroPrioridad;
      const matchProyecto = !filtroProyecto || t.proyecto === filtroProyecto;
      return matchBusqueda && matchEstatus && matchPrioridad && matchProyecto;
    })
    .sort((a, b) => {
      // 1. Agrupar alfabéticamente por proyecto de forma predominante
      const projA = a.proyecto || 'z_Sin Proyecto';
      const projB = b.proyecto || 'z_Sin Proyecto';
      if (projA !== projB) return projA.localeCompare(projB);

      // Ahora estamos comparando tareas DENTRO del mismo proyecto:
      
      const aCompleto = a.estatus === 'Completado';
      const bCompleto = b.estatus === 'Completado';

      // 2. Mandar todas las completadas estrictamente hasta el final de ese proyecto
      if (aCompleto && !bCompleto) return 1;
      if (!aCompleto && bCompleto) return -1;

      // 3. Si ambas están completadas, ordenarlas de la fecha más antigua a la más reciente
      if (aCompleto && bCompleto) {
        const timeA = new Date(`${a.fechaCompletado}T00:00:00`).getTime() || Number.MAX_SAFE_INTEGER;
        const timeB = new Date(`${b.fechaCompletado}T00:00:00`).getTime() || Number.MAX_SAFE_INTEGER;
        if (timeA !== timeB) return timeA - timeB;
      }

      // 4. Tareas activas del proyecto: primero la más reciente (número más alto)
      return (b.numero || 0) - (a.numero || 0);
    });

  // Agrupador para renderizar filas de cabecera visual de proyectos
  let currentProject = null;

  function abrirNueva() {
    setTareaSeleccionada(null);
    setModalOpen(true);
  }

  function abrirEditar(tarea) {
    setTareaSeleccionada(tarea);
    setModalOpen(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-pink-50">
      <div className="p-8 max-w-full">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">Tareas</h1>
          <p className="text-sm text-gray-600 mt-2">{filtradas.length} tareas encontradas</p>
        </div>
        <button
          onClick={abrirNueva}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white text-sm font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          ➕ Nueva Tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 flex flex-wrap gap-4 border border-purple-100/50">
        <input
          type="text"
          placeholder="Buscar tarea o proyecto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-purple-300/50 rounded-xl px-4 py-3 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
        />
        <select
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
          className="border border-purple-300/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
        >
          <option value="">Todos los estatus</option>
          {ESTATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="border border-purple-300/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
        >
          <option value="">Todas las prioridades</option>
          <option value="1">Alto</option>
          <option value="2">Mediano</option>
          <option value="3">Bajo</option>
        </select>
        <select
          value={filtroProyecto}
          onChange={(e) => setFiltroProyecto(e.target.value)}
          className="border border-purple-300/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
        >
          <option value="">Todos los proyectos</option>
          {proyectosOrdenados.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-purple-100/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 sticky top-0 z-10">
              <tr className="text-left text-gray-700 text-xs uppercase tracking-wider font-semibold">
                <th className="px-4 py-3 font-semibold pb-3">#</th>
                <th className="px-4 py-3 font-semibold pb-3">Descripción</th>
                <th className="px-4 py-3 font-semibold pb-3">Fecha Inicio</th>
                <th className="px-4 py-3 font-semibold pb-3">Fecha Límite</th>
                <th className="px-4 py-3 font-semibold pb-3">Avance</th>
                <th className="px-4 py-3 font-semibold pb-3">Estatus</th>
                <th className="px-4 py-3 font-semibold pb-3">Días Atrasados</th>
                <th className="px-4 py-3 font-semibold pb-3">Prioridad</th>
                <th className="px-4 py-3 font-semibold text-center pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proyectosOrdenados.map((proyecto, proyectoIndex) => {
                // Tareas filtradas del proyecto actual
                const tareasDelProyecto = filtradas.filter(t => t.proyecto === proyecto);
                
                if (tareasDelProyecto.length === 0) return null;

                return (
                  <React.Fragment key={proyecto}>
                    {/* Header del proyecto con controles de orden */}
                    <tr className="bg-gradient-to-r from-purple-50 to-pink-50 border-t-2 border-purple-200 hover:bg-opacity-75 transition-colors">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveProjectUp(proyecto, proyectosOrdenados)}
                              disabled={proyectoIndex === 0}
                              title="Subir proyecto"
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition text-xs"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveProjectDown(proyecto, proyectosOrdenados)}
                              disabled={proyectoIndex === proyectosOrdenados.length - 1}
                              title="Bajar proyecto"
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition text-xs"
                            >
                              ▼
                            </button>
                          </div>
                          <div className="w-2 h-4 bg-blue-600 rounded-sm"></div>
                          <span className="font-bold tracking-tight text-gray-800 text-sm">{proyecto || 'Sin Proyecto'}</span>
                          <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">
                            {tareasDelProyecto.length} tareas
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Tareas del proyecto */}
                    {tareasDelProyecto.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => abrirEditar(t)}
                        className="hover:bg-purple-50 cursor-pointer transition-colors border-b border-purple-100"
                      >
                        <td className="px-4 py-4 text-gray-400 font-mono text-xs">{t.numero}</td>
                        <td className="px-4 py-4 text-gray-700">
                          <span className={`block max-w-sm ${t.estatus === 'Completado' ? 'text-gray-400' : 'font-medium'}`}>
                            {t.descripcion}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-sm">{t.fechaInicio || '—'}</td>
                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{t.fechaCompletado || '—'}</td>

                        {/* Avance inline */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <input
                              type="range" min={0} max={100} step={5}
                              value={t.porcentaje || 0}
                              onChange={(e) => handlePorcentajeChange(t.id, Number(e.target.value), e)}
                              className="w-20 accent-blue-500"
                            />
                            <span className="text-xs text-gray-500 w-8">{t.porcentaje || 0}%</span>
                            {saving[t.id] && <span className="text-blue-400 text-xs animate-pulse">💾</span>}
                          </div>
                        </td>

                        {/* Estatus inline */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: ESTATUS_COLORS[t.estatus]?.bg ?? '#f1f5f9',
                              color: ESTATUS_COLORS[t.estatus]?.text ?? '#64748b',
                            }}
                          >
                            {t.estatus}
                          </span>
                        </td>

                        {/* Días Atrasados */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          {t.estatus === 'Retrasado' ? (
                            <span className="px-1.5 py-0.5 rounded shadow-sm text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                              {diasRetraso(t.fechaCompletado)} {diasRetraso(t.fechaCompletado) === 1 ? 'día' : 'días'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: PRIORIDAD_COLORS[t.prioridad]?.bg,
                              color: PRIORIDAD_COLORS[t.prioridad]?.text,
                            }}
                          >
                            {PRIORIDAD_LABEL[t.prioridad]}
                          </span>
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => handleMarcarCompletada(t.id, t.porcentaje, e)}
                              disabled={saving[t.id]}
                              title="Marcar como cancelada"
                              className="p-1 text-gray-500 hover:text-gray-700 text-sm transition disabled:opacity-50"
                            >
                              🏁
                            </button>
                            <button
                              onClick={() => abrirEditar(t)}
                              className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => handleDelete(t.id, t.numero, e)}
                              className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded transition"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-10">
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
    </div>
  );
}
