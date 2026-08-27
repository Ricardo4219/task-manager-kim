import { useMemo } from 'react';
import { useTasks } from '../context/TasksContext';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';
import WeeklyReport from '../components/WeeklyReport';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const ESTATUS_COLORS = {
  'En Proceso': '#7C3AED',
  'Completado': '#10B981',
  'Retrasado': '#EF4444',
  'No iniciado': '#9CA3AF',
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function StatCard({ title, value, sub, subColor, icon, iconBg }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between border border-purple-100/50 hover:shadow-md hover:border-purple-200/50 transition-all duration-300">
      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
        <p className="text-4xl font-bold text-gray-800 mt-3">{value}</p>
        <p className={`text-xs mt-2 font-semibold ${subColor}`}>{sub}</p>
      </div>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

function AvanceCirculo({ porcentaje }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const color = porcentaje >= 70 ? '#22c55e' : porcentaje >= 40 ? '#3b82f6' : '#ef4444';
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${circ * porcentaje / 100} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-gray-800">{porcentaje}%</span>
      </div>
    </div>
  );
}

function diasRetraso(fechaCompletado) {
  if (!fechaCompletado) return 0;

  // Corregir el problema de la zona horaria para fechas 'YYYY-MM-DD'
  // Agregando 'T00:00:00' se asegura que se interprete en la zona horaria local
  const fechaLimite = new Date(`${fechaCompletado}T00:00:00`);
  
  if (isNaN(fechaLimite.getTime())) {
    return 0; // Retorna 0 si la fecha no es válida
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Normalizar la fecha de hoy a medianoche

  if (hoy > fechaLimite) {
    const diffTiempo = hoy.getTime() - fechaLimite.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
    return diffDias;
  }
  
  return 0;
}

export default function Dashboard() {
  const { tasks, loading } = useTasks();
  const { isAdmin } = useAuth();

  // Filtrar tareas que deben mostrarse en el tablero
  const visibleTasks = useMemo(() => 
    tasks.filter((t) => t.mostrarEnReporte !== false),
    [tasks]
  );

  // Filtrar solo tareas del mes actual (abril 2026)
  const getCurrentMonthTasks = (allTasks) => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    return allTasks.filter((t) => {
      // Usar fechaCompletado si existe (para tareas completadas), sino fechaInicio
      const fechaKey = t.fechaCompletado || t.fechaInicio;
      if (!fechaKey) return false;

      const fecha = new Date(`${fechaKey}T00:00:00`);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    });
  };

  const tareasDelMes = useMemo(() => getCurrentMonthTasks(visibleTasks), [visibleTasks]);

  const total = tareasDelMes.length;
  const enProceso = tareasDelMes.filter((t) => t.estatus === 'En Proceso').length;
  const completadas = tareasDelMes.filter((t) => t.estatus === 'Completado').length;
  const retrasadas = tareasDelMes.filter((t) => t.estatus === 'Retrasado').length;

  const avanceGeneral = tareasDelMes.length
    ? Math.round(tareasDelMes.reduce((s, t) => s + (t.porcentaje || 0), 0) / tareasDelMes.length)
    : 0;

  const pieData = useMemo(() =>
    Object.keys(ESTATUS_COLORS)
      .map((key) => ({ name: key, value: visibleTasks.filter((t) => t.estatus === key).length }))
      .filter((d) => d.value > 0),
    [visibleTasks]
  );

  const barData = useMemo(() => {
    const proyectos = [...new Set(visibleTasks.map((t) => t.proyecto))];
    return proyectos.map((p) => {
      const tp = visibleTasks.filter((t) => t.proyecto === p);
      return { proyecto: p, avance: Math.round(tp.reduce((s, t) => s + (t.porcentaje || 0), 0) / tp.length) };
    });
  }, [visibleTasks]);

  const criticas = useMemo(() =>
    visibleTasks
      .filter((t) => t.estatus === 'Retrasado' || (t.estatus === 'En Proceso' && (t.porcentaje || 0) < 50))
      .sort((a, b) => a.prioridad - b.prioridad)
      .slice(0, 5),
    [visibleTasks]
  );

  const ESTATUS_ORDEN = { 'Retrasado': 0, 'En Proceso': 1, 'No iniciado': 2 };
  const pendientes = useMemo(() =>
    visibleTasks
      .filter((t) => t.estatus !== 'Completado')
      .sort((a, b) => {
        const ea = ESTATUS_ORDEN[a.estatus] ?? 3;
        const eb = ESTATUS_ORDEN[b.estatus] ?? 3;
        if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
        if (ea !== eb) return ea - eb;
        return (a.numero || 0) - (b.numero || 0);
      }),
    [visibleTasks]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="text-gray-400 text-lg">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-pink-50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">Tablero</h1>
          <p className="text-sm text-gray-600 mt-2">Resumen de tus actividades y tareas</p>
        </div>

        {/* Banner Firebase */}
        {isAdmin && isFirebaseConfigured && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-blue-900">☁️ Firebase Conectado</p>
            <p className="text-xs text-blue-700 mt-1">Los datos se sincronizan en la nube automáticamente.</p>
          </div>
        )}

      {/* Avance general + tarjetas */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
        {/* Círculo de avance general */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-5 xl:col-span-1 border border-purple-100/50 hover:shadow-md transition-all">
          <AvanceCirculo porcentaje={avanceGeneral} />
          <div>
            <p className="text-sm font-semibold text-gray-700">Avance General</p>
            <p className="text-xs text-gray-500 mt-2">{visibleTasks.length} tareas visibles</p>
          </div>
        </div>
        {/* 4 tarjetas */}
        <div className="xl:col-span-4 grid grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard title="Total Tareas" value={total} sub="Este mes" subColor="text-purple-600 font-semibold" icon="📋" iconBg="bg-gradient-to-br from-purple-100 to-purple-50" />
          <StatCard title="En Proceso" value={enProceso} sub="Activas" subColor="text-purple-700 font-semibold" icon="🕐" iconBg="bg-gradient-to-br from-purple-100 to-purple-50" />
          <StatCard title="Completadas" value={completadas} sub="Finalizadas" subColor="text-green-600 font-semibold" icon="✅" iconBg="bg-gradient-to-br from-green-100 to-green-50" />
          <StatCard title="Retrasadas" value={retrasadas} sub="Atención" subColor="text-red-600 font-semibold" icon="⚠️" iconBg="bg-gradient-to-br from-red-100 to-red-50" />
        </div>
      </div>

      {/* Reporte Semanal */}
      <WeeklyReport />

      {/* Gráficas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-purple-100/50">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Tareas por Estado</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Sin datos para este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => <Cell key={entry.name} fill={ESTATUS_COLORS[entry.name]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-purple-100/50">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Avance por Proyecto (%)</h2>
          {barData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Sin datos para este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="proyecto" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="avance" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tareas críticas */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-sm p-6 mb-8 border border-red-200/50">
        <h2 className="text-lg font-bold text-gray-800 mb-5">⚠️ Tareas Críticas Pendientes</h2>
        {criticas.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8 font-medium">¡Sin tareas críticas! 🎉</p>
        ) : (
          <div className="space-y-3">
            {criticas.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-red-100/50 hover:shadow-md transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.descripcion}</p>
                  <p className="text-xs text-gray-600 mt-1">{t.proyecto} · Límite: {t.fechaCompletado || 'Sin fecha'}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${t.porcentaje || 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{t.porcentaje || 0}%</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: ESTATUS_COLORS[t.estatus] + '20', color: ESTATUS_COLORS[t.estatus] }}>
                      {t.estatus}
                    </span>
                    {t.estatus === 'Retrasado' && (
                      <span className="px-1.5 py-0.5 rounded shadow-sm text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                        {diasRetraso(t.fechaCompletado)} {diasRetraso(t.fechaCompletado) === 1 ? 'día' : 'días'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Todas las tareas pendientes — todos los años */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-purple-100/50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">📋 Tareas Pendientes</h2>
          <span className="text-xs text-gray-700 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full font-semibold border border-purple-200/50">
            {pendientes.length} {pendientes.length !== 1 ? 'tareas' : 'tarea'} activa{pendientes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b-2 border-purple-100 text-xs font-bold uppercase tracking-wide">
                <th className="pb-3 pr-3">#</th>
                <th className="pb-3 pr-3">Proyecto</th>
                <th className="pb-3 pr-3">Descripción</th>
                <th className="pb-3 pr-3">Fecha límite</th>
                <th className="pb-3 pr-3">Avance</th>
                <th className="pb-3">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 text-gray-400 text-xs">{t.numero}</td>
                  <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{t.proyecto}</td>
                  <td className="py-2 pr-3 text-gray-600 max-w-xs truncate">{t.descripcion}</td>
                  <td className="py-2 pr-3 text-gray-500 text-xs whitespace-nowrap">
                    {t.fechaCompletado && t.fechaCompletado !== 'N/A' ? t.fechaCompletado : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-200 rounded-full h-1.5 w-16">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${t.porcentaje || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{t.porcentaje || 0}%</span>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: ESTATUS_COLORS[t.estatus] + '20', color: ESTATUS_COLORS[t.estatus] }}>
                        {t.estatus}
                      </span>
                      {t.estatus === 'Retrasado' && (
                        <span className="px-1.5 py-0.5 rounded shadow-sm text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                          {diasRetraso(t.fechaCompletado)} {diasRetraso(t.fechaCompletado) === 1 ? 'día' : 'días'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pendientes.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">¡Sin tareas pendientes! 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
