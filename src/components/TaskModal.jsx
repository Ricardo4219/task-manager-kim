import { useState, useRef, useMemo, useEffect } from 'react';
import { addTask, updateTask } from '../firebase/dataService';
import { useTasks } from '../context/TasksContext';

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getNowStamp() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = MESES_CORTOS[now.getMonth()];
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return { display: `${d}-${m}-${y} ${hh}:${mm}`, storage: `${d}-${m}-${y} ${hh}:${mm}` };
}

/** Extrae { dateLabel, text, visible } de una línea del historial */
function parseUpdateLine(line) {
  const trimmed = line.trim();
  // Comprobar si la línea comienza con el marcador de no visible [ ]
  const visible = !trimmed.startsWith('[ ] ');
  // Eliminar el marcador para el resto del parseo
  const lineToParse = visible ? trimmed : trimmed.substring(4);

  const match = lineToParse.match(
    /^(\d{1,2}[-\s][A-Za-z]{3}[A-Za-z]*(?:[-\s]\d{4})?(?:\s+\d{1,2}:\d{2})?)\s*:\s*(.*)/
  );
  if (match) return { dateLabel: match[1], text: match[2] || '', visible, fullLine: lineToParse };
  return { dateLabel: '', text: lineToParse, visible, fullLine: lineToParse };
}

const ESTATUS_OPTIONS = ['En Proceso', 'Completado', 'No iniciado'];
const PROYECTOS_BASE = ['Particulado', 'CADD Refresh', 'Bivona', 'Gripper', 'Personal', 'Particulado/Refresh'];

export default function TaskModal({ tarea, onClose }) {
  const { tasks } = useTasks();
  const isEditing = Boolean(tarea);

  // Proyectos únicos de las tareas existentes + los base
  const proyectosExistentes = [...new Set([
    ...PROYECTOS_BASE,
    ...tasks.map((t) => t.proyecto).filter(Boolean),
  ])].sort();

  const [form, setForm] = useState({
    numero: tarea?.numero ?? (tasks.length > 0 ? Math.max(...tasks.map((t) => t.numero || 0)) + 1 : 1),
    proyecto: tarea?.proyecto ?? 'CADD Refresh',
    fechaInicio: tarea?.fechaInicio ?? new Date().toISOString().split('T')[0],
    fechaCompletado: tarea?.fechaCompletado ?? '',
    descripcion: tarea?.descripcion ?? '',
    updates: tarea?.updates ?? '',
    comentarios: tarea?.comentarios ?? '',
    porcentaje: tarea?.porcentaje ?? 0,
    estatus: tarea?.estatus === 'Retrasado' ? 'En Proceso' : (tarea?.estatus ?? 'No iniciado'),
    prioridad: tarea?.prioridad ?? 3,
    mostrarEnReporte: tarea?.mostrarEnReporte ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creandoProyecto, setCreandoProyecto] = useState(false);
  const [nuevoProyecto, setNuevoProyecto] = useState('');
  const [newUpdate, setNewUpdate] = useState('');
  const [newUpdateDate, setNewUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [newUpdateTime, setNewUpdateTime] = useState(new Date().toTimeString().slice(0, 5));
  const [editingUpdateIndex, setEditingUpdateIndex] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const nuevoProyectoRef = useRef(null);
  const newUpdateRef = useRef(null);

  // Efectos para validaciones en tiempo real y prioridad dinámica
  useEffect(() => {
    // 1. Validación de fechas
    if (form.fechaInicio && form.fechaCompletado) {
      if (form.fechaInicio > form.fechaCompletado) {
        setError('La fecha límite no puede ser anterior a la fecha de inicio.');
      } else {
        setError(''); // Limpia el error si es válido
      }
    }

    // 2. Cálculo de prioridad dinámica (sugiere cambio a Alto = 1)
    if (form.fechaCompletado && form.porcentaje < 100) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const limite = new Date(`${form.fechaCompletado}T00:00:00`);
      
      if (!isNaN(limite.getTime())) {
        const diffDias = (limite.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
        
        // Si falta 2 días o menos y el avance es menor a 50%, o si ya se venció
        if ((diffDias <= 2 && form.porcentaje < 50) || diffDias < 0) {
          if (form.prioridad !== 1) {
            setForm(prev => ({ ...prev, prioridad: 1 }));
          }
        }
      }
    }
  }, [form.fechaInicio, form.fechaCompletado, form.porcentaje, form.prioridad]);

  const parsedUpdates = useMemo(() => {
    if (!form.updates) return [];
    return form.updates
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map(parseUpdateLine);
  }, [form.updates]);

  function handleAddUpdate() {
    const text = newUpdate.trim();
    if (!text) return;
    
    // Convertir fecha de formato YYYY-MM-DD a DD-Mes-YYYY
    const [year, month, day] = newUpdateDate.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const monthName = months[parseInt(month) - 1];
    const formattedDate = `${parseInt(day)}-${monthName}-${year}`;
    const dateTimeStamp = `${formattedDate} ${newUpdateTime}`;
    
    const newLine = `${dateTimeStamp}: ${text}`;
    setForm((prev) => ({
      ...prev,
      updates: prev.updates ? `${prev.updates}\n${newLine}` : newLine,
    }));
    setNewUpdate('');
    setNewUpdateDate(new Date().toISOString().split('T')[0]);
    setNewUpdateTime(new Date().toTimeString().slice(0, 5));
    setTimeout(() => newUpdateRef.current?.focus(), 50);
  }

  function handleUpdateVisibilityChange(index, isVisible) {
    const updatesArray = form.updates.split('\n');
    const line = updatesArray[index];
    
    // Añadir o quitar el prefijo '[ ] '
    if (isVisible) {
      updatesArray[index] = line.startsWith('[ ] ') ? line.substring(4) : line;
    } else {
      updatesArray[index] = `[ ] ${line.replace('[ ] ', '')}`;
    }

    setForm(prev => ({ ...prev, updates: updatesArray.join('\n') }));
  }

  function handleDeleteUpdate(index) {
    const updatesArray = form.updates.split('\n').filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, updates: updatesArray.join('\n') }));
  }

  function handleEditUpdateDate(index) {
    const parsed = parsedUpdates[index];
    setEditingUpdateIndex(index);
    setEditingDate(parsed.dateLabel || '');
  }

  function handleSaveEditDate() {
    if (editingUpdateIndex === null) return;
    const updatesArray = form.updates.split('\n');
    const line = updatesArray[editingUpdateIndex];
    const parsed = parsedUpdates[editingUpdateIndex];
    
    // Reconstruir la línea con la nueva fecha
    const prefix = !parsed.visible ? '[ ] ' : '';
    const newLine = editingDate ? `${editingDate}: ${parsed.text}` : parsed.text;
    updatesArray[editingUpdateIndex] = prefix + newLine;
    
    setForm(prev => ({ ...prev, updates: updatesArray.join('\n') }));
    setEditingUpdateIndex(null);
    setEditingDate('');
  }

  function handleCancelEditDate() {
    setEditingUpdateIndex(null);
    setEditingDate('');
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePercentageChange(newPercentage) {
    let newStatus = 'No iniciado';
    if (newPercentage > 0) {
      newStatus = 'En Proceso';
    }
    if (newPercentage === 100) {
      newStatus = 'Completado';
    }
    
    setForm(prev => ({
      ...prev,
      porcentaje: newPercentage,
      estatus: newStatus,
    }));
  }

  function handleProyectoSelect(e) {
    const val = e.target.value;
    if (val === '__nuevo__') {
      setCreandoProyecto(true);
      setNuevoProyecto('');
      setTimeout(() => nuevoProyectoRef.current?.focus(), 50);
    } else {
      handleChange('proyecto', val);
    }
  }

  function confirmarNuevoProyecto() {
    const nombre = nuevoProyecto.trim();
    if (!nombre) return;
    handleChange('proyecto', nombre);
    setCreandoProyecto(false);
  }

  function cancelarNuevoProyecto() {
    setCreandoProyecto(false);
    setNuevoProyecto('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.descripcion.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    // Validación Antierrores
    if (form.fechaInicio && form.fechaCompletado && form.fechaInicio > form.fechaCompletado) {
      setError('Corrige las fechas: la fecha límite no puede ser anterior al inicio.');
      return;
    }
    if (form.porcentaje === 100 && !form.fechaCompletado) {
      setError('Una tarea completada al 100% debe tener una fecha límite especificada.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateTask(tarea.id, form);
      } else {
        await addTask(form);
      }
      onClose();
    } catch (err) {
      setError('Error al guardar. Verifica la conexión con Firebase.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-purple-100/30 bg-gradient-to-r from-purple-50 via-pink-50 to-white">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">
              {isEditing ? `Tarea #${tarea.numero}` : 'Nueva Tarea'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{isEditing ? 'Editar información' : 'Crear nueva actividad'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light transition">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200/50 text-red-700 text-sm px-5 py-3 rounded-xl font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Proyecto */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Proyecto *</label>
              {creandoProyecto ? (
                <div className="flex gap-2">
                  <input
                    ref={nuevoProyectoRef}
                    type="text"
                    value={nuevoProyecto}
                    onChange={(e) => setNuevoProyecto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); confirmarNuevoProyecto(); }
                      if (e.key === 'Escape') cancelarNuevoProyecto();
                    }}
                    placeholder="Nombre del proyecto..."
                    className="flex-1 border border-purple-300/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={confirmarNuevoProyecto}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 rounded-xl text-sm font-semibold shadow-sm transition-all"
                  >✓</button>
                  <button
                    type="button"
                    onClick={cancelarNuevoProyecto}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 rounded-xl text-sm font-semibold transition-all"
                  >✕</button>
                </div>
              ) : (
                <select
                  value={form.proyecto}
                  onChange={handleProyectoSelect}
                  className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm transition-all"
                >
                  {proyectosExistentes.map((p) => <option key={p} value={p}>{p}</option>)}
                  <option value="__nuevo__">➕ Crear nuevo proyecto...</option>
                </select>
              )}
              {!creandoProyecto && form.proyecto && (
                <p className="text-xs text-purple-600 mt-2.5 font-semibold">✓ {form.proyecto}</p>
              )}
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Prioridad *</label>
              <select
                value={form.prioridad}
                onChange={(e) => handleChange('prioridad', Number(e.target.value))}
                className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm transition-all"
              >
                <option value={1}>🔴 Alto</option>
                <option value={2}>🟠 Mediano</option>
                <option value={3}>🟢 Bajo</option>
              </select>
            </div>

            {/* Fecha inicio */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Fecha Inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => handleChange('fechaInicio', e.target.value)}
                className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm transition-all"
              />
            </div>

            {/* Fecha límite */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Fecha Límite</label>
              <input
                type="date"
                value={form.fechaCompletado ?? ''}
                onChange={(e) => handleChange('fechaCompletado', e.target.value)}
                className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Descripción *</label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Descripción de la tarea..."
              className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm transition-all"
            />
          </div>

          {/* Estatus (automático) + Porcentaje */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Estatus</label>
              <div className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm bg-gradient-to-r from-purple-50 to-pink-50 text-gray-700 font-semibold">
                {form.estatus}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">
                Avance: <span className="text-purple-600">{form.porcentaje}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.porcentaje}
                onChange={(e) => handlePercentageChange(Number(e.target.value))}
                className="w-full accent-purple-600 mt-2 h-2 rounded-lg"
              />
            </div>
          </div>

          {/* Updates — estructurado con fecha y hora */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              📝 Historial de Actualizaciones
            </label>

            {/* Lista de entradas existentes */}
            <div className="border border-purple-300/50 rounded-xl overflow-hidden bg-white shadow-sm">
              {parsedUpdates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 italic">
                  Sin actualizaciones registradas
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-purple-100/50">
                  {parsedUpdates.map((entry, i) => (
                    <div key={i}>
                      {editingUpdateIndex === i ? (
                        // Modo edición de fecha
                        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50">
                          <input
                            type="text"
                            value={editingDate}
                            onChange={(e) => setEditingDate(e.target.value)}
                            placeholder="dd-Mes-yyyy hh:mm"
                            className="flex-1 border border-purple-300/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={handleSaveEditDate}
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg text-xs transition"
                            title="Guardar"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditDate}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-xs transition"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        // Modo visualización
                        <div className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-purple-50/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={entry.visible}
                            onChange={(e) => handleUpdateVisibilityChange(i, e.target.checked)}
                            className="mt-1 cursor-pointer flex-shrink-0 w-4 h-4 accent-purple-600 rounded"
                            title="Mostrar en tablero"
                          />
                          <p className="text-xs text-gray-700 flex-1 leading-relaxed">
                            {entry.text || <span className="italic text-gray-400">(sin descripción)</span>}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {entry.dateLabel && (
                              <span className="text-xs text-purple-700 whitespace-nowrap bg-purple-100/50 px-3 py-1 rounded-full font-mono font-semibold">
                                {entry.dateLabel}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditUpdateDate(i)}
                              title="Editar fecha"
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg text-xs transition"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUpdate(i)}
                              title="Eliminar actualización"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input para nueva entrada con selectores de fecha y hora */}
            <div className="space-y-3 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-300/50 rounded-xl p-4">
              <div className="grid grid-cols-1 gap-2.5">
                <input
                  ref={newUpdateRef}
                  type="text"
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddUpdate(); }
                  }}
                  placeholder="Escribe la nueva actualización..."
                  className="border border-purple-300/50 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    value={newUpdateDate}
                    onChange={(e) => setNewUpdateDate(e.target.value)}
                    className="border border-purple-300/50 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm"
                  />
                  <input
                    type="time"
                    value={newUpdateTime}
                    onChange={(e) => setNewUpdateTime(e.target.value)}
                    className="border border-purple-300/50 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddUpdate}
                disabled={!newUpdate.trim()}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 text-white text-xs font-semibold rounded-lg transition shadow-sm hover:shadow-md"
              >
                ➕ Agregar Actualización
              </button>
              <p className="text-xs text-purple-700 font-medium text-center">
                📅 Selecciona cuándo ocurrió esta actualización
              </p>
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">Comentarios</label>
            <textarea
              rows={2}
              value={form.comentarios}
              onChange={(e) => handleChange('comentarios', e.target.value)}
              placeholder="Notas adicionales..."
              className="w-full border border-purple-300/50 rounded-xl px-4 py-3 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm transition-all"
            />
          </div>

          {/* Mostrar en Reporte y Tablero */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200/50 rounded-xl px-5 py-4 shadow-sm">
            <input
              type="checkbox"
              id="mostrarEnReporte"
              checked={form.mostrarEnReporte}
              onChange={(e) => handleChange('mostrarEnReporte', e.target.checked)}
              className="w-5 h-5 text-purple-600 cursor-pointer accent-purple-600 rounded"
            />
            <label htmlFor="mostrarEnReporte" className="flex-1 text-sm cursor-pointer">
              <span className="font-semibold text-gray-800">📊 Mostrar en Reportes</span>
              <p className="text-xs text-gray-600 mt-1">
                Aparecerá en el tablero y reporte semanal
              </p>
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-6 border-t border-purple-100/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm text-gray-700 font-semibold border border-gray-300/50 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 text-sm bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-60 shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {loading ? '⏳ Guardando...' : isEditing ? '💾 Guardar Cambios' : '➕ Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
