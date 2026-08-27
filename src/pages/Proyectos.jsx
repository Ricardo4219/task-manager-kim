import { useMemo } from 'react';
import { useTasks } from '../context/TasksContext';
import { useProjectsOrder } from '../context/ProjectsOrderContext';

const ESTATUS_COLORS = {
  'En Proceso': '#7C3AED',
  'Completado': '#10B981',
  'Retrasado': '#EF4444',
  'No iniciado': '#9CA3AF',
};

const PROYECTO_ICONS = {
  'Particulado': '🧪',
  'CADD Refresh': '🔄',
  'Bivona': '🏥',
  'Gripper': '🔧',
  'Personal': '👤',
  'Particulado/Refresh': '⚗️',
};

function ProgressBar({ value, color = '#3b82f6' }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Proyectos() {
  const { tasks, loading } = useTasks();
  const { getSortedProjects, moveProjectUp, moveProjectDown } = useProjectsOrder();

  const proyectosData = useMemo(() => {
    const grupos = {};
    tasks.forEach((t) => {
      if (!grupos[t.proyecto]) grupos[t.proyecto] = [];
      grupos[t.proyecto].push(t);
    });

    const allProjects = Object.entries(grupos).map(([nombre, tareas]) => {
      const avgPct = tareas.length
        ? Math.round(tareas.reduce((s, t) => s + (t.porcentaje || 0), 0) / tareas.length)
        : 0;
      const enProceso = tareas.filter((t) => t.estatus === 'En Proceso').length;
      const completadas = tareas.filter((t) => t.estatus === 'Completado').length;
      const retrasadas = tareas.filter((t) => t.estatus === 'Retrasado').length;
      const noIniciado = tareas.filter((t) => t.estatus === 'No iniciado').length;
      return { nombre, tareas, avance: avgPct, enProceso, completadas, retrasadas, noIniciado };
    });

    const sortedNames = getSortedProjects(allProjects.map((p) => p.nombre));
    return sortedNames.map((name) => allProjects.find((p) => p.nombre === name));
  }, [tasks, getSortedProjects]);

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-pink-50">
      <div className="p-8 max-w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">Proyectos</h1>
        <p className="text-sm text-gray-600 mt-2">{proyectosData.length} proyectos activos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {proyectosData.map((p, index) => (
          <div key={p.nombre} className="bg-white rounded-2xl shadow-sm hover:shadow-md p-6 transition-all duration-300 border border-purple-100/50 hover:border-purple-200/50">
            {/* Encabezado de tarjeta */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => moveProjectUp(p.nombre)}
                  disabled={index === 0}
                  title="Subir proyecto"
                  className="p-1 text-gray-500 hover:text-purple-700 disabled:opacity-20 disabled:cursor-not-allowed transition text-xs font-semibold"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveProjectDown(p.nombre)}
                  disabled={index === proyectosData.length - 1}
                  title="Bajar proyecto"
                  className="p-1 text-gray-500 hover:text-purple-700 disabled:opacity-20 disabled:cursor-not-allowed transition text-xs font-semibold"
                >
                  ▼
                </button>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
                {PROYECTO_ICONS[p.nombre] || '📌'}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800 text-sm leading-tight">{p.nombre}</h2>
                <p className="text-xs text-gray-500">{p.tareas.length} tareas</p>
              </div>
              <span className="text-2xl font-bold text-purple-600">{p.avance}%</span>
            </div>

            {/* Barra de progreso */}
            <ProgressBar
              value={p.avance}
              color={p.avance >= 80 ? '#10B981' : p.avance >= 50 ? '#7C3AED' : p.avance >= 20 ? '#F59E0B' : '#EF4444'}
            />
            <p className="text-xs text-gray-500 mt-1.5 mb-4 font-medium">Avance promedio</p>

            {/* Contadores de estatus */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'En Proceso', value: p.enProceso, color: '#7C3AED' },
                { label: 'Completadas', value: p.completadas, color: '#10B981' },
                { label: 'Retrasadas', value: p.retrasadas, color: '#EF4444' },
                { label: 'No iniciado', value: p.noIniciado, color: '#9CA3AF' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: s.color + '10', borderColor: s.color + '30' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-gray-700 font-medium">{s.label}</span>
                  <span className="ml-auto text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Lista de tareas */}
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tareas del proyecto</p>
              {p.tareas.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ESTATUS_COLORS[t.estatus] }}
                  />
                  <span className="flex-1">{t.descripcion}</span>
                  <span className="text-gray-400 flex-shrink-0">{t.porcentaje || 0}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
