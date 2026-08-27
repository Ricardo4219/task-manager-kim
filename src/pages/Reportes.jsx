import { useMemo } from 'react';
import { useTasks } from '../context/TasksContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';

const ESTATUS_COLORS = {
  'En Proceso': '#3b82f6',
  'Completado': '#22c55e',
  'Retrasado': '#ef4444',
  'No iniciado': '#94a3b8',
};

export default function Reportes() {
  const { tasks, loading } = useTasks();

  const { byProyecto, byEstatus, porcentajeGeneral, topPendientes } = useMemo(() => {
    // Avance por proyecto
    const grupos = {};
    tasks.forEach((t) => {
      if (!grupos[t.proyecto]) grupos[t.proyecto] = [];
      grupos[t.proyecto].push(t);
    });
    const byProyecto = Object.entries(grupos).map(([nombre, tareas]) => ({
      proyecto: nombre,
      avance: Math.round(tareas.reduce((s, t) => s + (t.porcentaje || 0), 0) / tareas.length),
      total: tareas.length,
    }));

    // Distribución por estatus
    const estatusCount = {};
    tasks.forEach((t) => {
      estatusCount[t.estatus] = (estatusCount[t.estatus] || 0) + 1;
    });
    const byEstatus = Object.entries(estatusCount).map(([name, value]) => ({ name, value }));

    // Porcentaje general
    const porcentajeGeneral = tasks.length
      ? Math.round(tasks.reduce((s, t) => s + (t.porcentaje || 0), 0) / tasks.length)
      : 0;

    // Top pendientes (retrasadas y en proceso con porcentaje bajo)
    const topPendientes = tasks
      .filter((t) => t.estatus === 'Retrasado' || (t.estatus === 'En Proceso' && (t.porcentaje || 0) < 50))
      .sort((a, b) => a.prioridad - b.prioridad)
      .slice(0, 5);

    return { byProyecto, byEstatus, porcentajeGeneral, topPendientes };
  }, [tasks]);

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <p className="text-sm text-gray-500">Análisis de avance general</p>
      </div>

      {/* Tarjeta de avance general */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4 flex items-center gap-6">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={porcentajeGeneral >= 70 ? '#22c55e' : porcentajeGeneral >= 40 ? '#3b82f6' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 40 * porcentajeGeneral / 100} ${2 * Math.PI * 40}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-800">{porcentajeGeneral}%</span>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Avance General del Proyecto</h2>
          <p className="text-gray-500 text-sm">Promedio de todas las tareas ({tasks.length} en total)</p>
          <div className="flex gap-4 mt-3">
            {Object.entries(ESTATUS_COLORS).map(([k, color]) => (
              <div key={k} className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {k}: {tasks.filter((t) => t.estatus === k).length}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Avance por proyecto */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Avance por Proyecto (%)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byProyecto} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="proyecto" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="avance" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {byProyecto.map((entry) => (
                  <Cell
                    key={entry.proyecto}
                    fill={entry.avance >= 80 ? '#22c55e' : entry.avance >= 50 ? '#3b82f6' : entry.avance >= 20 ? '#f97316' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie estatus */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Distribución por Estatus</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byEstatus}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {byEstatus.map((entry) => (
                  <Cell key={entry.name} fill={ESTATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top pendientes críticos */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">⚠️ Tareas Críticas Pendientes</h2>
        {topPendientes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">¡Sin tareas críticas! 🎉</p>
        ) : (
          <div className="space-y-3">
            {topPendientes.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg bg-red-50 border border-red-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{t.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.proyecto} · Fecha límite: {t.fechaCompletado || 'Sin fecha'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-400" style={{ width: `${t.porcentaje || 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{t.porcentaje || 0}%</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: ESTATUS_COLORS[t.estatus] + '20',
                      color: ESTATUS_COLORS[t.estatus],
                    }}
                  >
                    {t.estatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
