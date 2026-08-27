import { useState, useMemo } from 'react';
import { useTasks } from '../context/TasksContext';

const MESES_ES = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

const ESTATUS_COLORS = {
  'En Proceso': '#3b82f6',
  'Completado': '#22c55e',
  'Retrasado': '#ef4444',
  'No iniciado': '#94a3b8',
};

/** Parses a line that starts with a Spanish date like "13-Feb:", "03-Dic-2025:", "10-Mar-2026 14:30:" */
function parseUpdateDate(line) {
  const clean = line.trim().toLowerCase();
  // Matches: DD-Mon[-YYYY][ HH:MM]:
  const match = clean.match(/^(\d{1,2})[-\s]([a-záéíóú]{3,})(?:[-\s](\d{4}))?/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monStr = match[2].substring(0, 3);
  const yearExplicit = match[3] ? parseInt(match[3], 10) : null;
  const monthIndex = MESES_ES[monStr];
  if (monthIndex === undefined) return null;

  // Year inference: Nov/Dic → 2025, rest → 2026
  const year = yearExplicit ?? (monthIndex >= 10 ? 2025 : 2026);
  return new Date(year, monthIndex, day);
}

/** Extracts the activity text from a line, handling optional time like "DD-Mes-YYYY HH:MM: text" */
function extractUpdateText(line) {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^\d{1,2}[-\s][A-Za-z]{3}[A-Za-z]*(?:[-\s]\d{4})?(?:\s+\d{1,2}:\d{2})?\s*:\s*(.*)/
  );
  if (match) return match[1].trim();
  const colonIdx = trimmed.indexOf(':');
  return colonIdx >= 0 ? trimmed.substring(colonIdx + 1).trim() : trimmed;
}

/** Returns Monday and Sunday of the week containing `date` */
function getWeekBounds(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

function fmt(d, opts) {
  return d.toLocaleDateString('es-MX', opts);
}

function toInputValue(d) {
  // Returns YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

export default function WeeklyReport() {
  const { tasks } = useTasks();

  // Default to current week (today = March 10 2026)
  const [selectedDate, setSelectedDate] = useState(() => toInputValue(new Date()));

  const { start, end } = useMemo(
    () => getWeekBounds(new Date(selectedDate + 'T12:00:00')),
    [selectedDate],
  );

  const weekActivities = useMemo(() => {
    const results = [];
    tasks.forEach((task) => {
      // Filtrar tareas que no deben mostrarse en reporte
      if (task.mostrarEnReporte === false) return;
      if (!task.updates) return;
      task.updates.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const date = parseUpdateDate(trimmed);
        if (!date || date < start || date > end) return;
        const text = extractUpdateText(trimmed);
        results.push({ task, date, text });
      });
    });
    return results.sort((a, b) => a.date - b.date);
  }, [tasks, start, end]);

  // Unique projects with activity this week
  const proyectosActivos = [...new Set(weekActivities.map((a) => a.task.proyecto))];

  function shiftWeek(delta) {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(toInputValue(d));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-700">📅 Reporte Semanal</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Actividades registradas en el historial de actualizaciones
          </p>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition text-sm"
            title="Semana anterior"
          >
            ◀
          </button>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 hidden sm:inline">Del</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs text-gray-700 bg-transparent border-none outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => shiftWeek(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition text-sm"
            title="Semana siguiente"
          >
            ▶
          </button>
          <button
            onClick={() => setSelectedDate(toInputValue(new Date()))}
            className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Week range badge + summary */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
          {fmt(start, { day: '2-digit', month: 'short' })} — {fmt(end, { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-xs text-gray-400">
          {weekActivities.length} actividad{weekActivities.length !== 1 ? 'es' : ''} ·{' '}
          {proyectosActivos.length} proyecto{proyectosActivos.length !== 1 ? 's' : ''}
        </span>
        {proyectosActivos.map((p) => (
          <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {p}
          </span>
        ))}
      </div>

      {weekActivities.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">Sin actividades registradas esta semana</p>
          <p className="text-xs mt-1">Navega a otra semana o revisa el historial de actualizaciones</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                <th className="pb-2 pr-3 font-medium">Fecha</th>
                <th className="pb-2 pr-3 font-medium">Proyecto</th>
                <th className="pb-2 pr-3 font-medium">Tarea</th>
                <th className="pb-2 pr-3 font-medium">Actividad registrada</th>
                <th className="pb-2 pr-3 font-medium">Avance</th>
                <th className="pb-2 font-medium">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {weekActivities.map((item, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50 align-top">
                  <td className="py-2.5 pr-3 text-xs text-gray-500 whitespace-nowrap">
                    {fmt(item.date, { weekday: 'short', day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2.5 pr-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {item.task.proyecto}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-gray-600 max-w-[180px] truncate" title={item.task.descripcion}>
                    {item.task.descripcion}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-gray-700 max-w-[260px]">
                    {item.text}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-200 rounded-full h-1.5 w-14">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${item.task.porcentaje || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-7 text-right">
                        {item.task.porcentaje || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: (ESTATUS_COLORS[item.task.estatus] ?? '#94a3b8') + '22',
                          color: ESTATUS_COLORS[item.task.estatus] ?? '#94a3b8',
                        }}
                      >
                        {item.task.estatus}
                      </span>
                      {item.task.estatus === 'Retrasado' && (
                        <span className="px-1.5 py-0.5 rounded shadow-sm text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                          {diasRetraso(item.task.fechaCompletado)} {diasRetraso(item.task.fechaCompletado) === 1 ? 'día' : 'días'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
