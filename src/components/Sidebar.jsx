import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';

export default function Sidebar() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function handleAdminNav(e) {
    if (!isAdmin) {
      e.preventDefault();
      setShowLogin(true);
    }
  }

  const navBase = 'flex items-center rounded-lg text-sm font-medium transition-colors';
  const navActive = 'bg-blue-600 text-white';
  const navIdle = 'text-slate-300 hover:bg-slate-800 hover:text-white';

  return (
    <>
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => {}} />
      )}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } min-h-screen bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300`}
      >
        {/* Logo + toggle */}
        <div className="px-3 py-5 border-b border-slate-700 flex items-center justify-between min-h-[72px]">
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                📋
              </div>
              <p className="font-bold text-sm leading-tight whitespace-nowrap">Proyectos Kim</p>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-lg mx-auto">
              📋
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={`text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1 transition flex-shrink-0 ${
              collapsed ? 'hidden' : 'ml-2'
            }`}
          >
            ◀
          </button>
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menú"
            className="mx-auto mt-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition"
          >
            ▶
          </button>
        )}

        {/* Navegación */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {/* Tablero */}
          <NavLink
            to="/"
            end
            title="Tablero"
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navIdle} ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'
              }`
            }
          >
            <span className="text-base">🏠</span>
            {!collapsed && <span>Tablero</span>}
          </NavLink>

          {/* Tareas */}
          <NavLink
            to="/tareas"
            title="Tareas"
            onClick={handleAdminNav}
            className={({ isActive }) =>
              `${navBase} ${isActive && isAdmin ? navActive : navIdle} ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5 justify-between'
              }`
            }
          >
            <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
              <span className="text-base">📋</span>
              {!collapsed && <span>Tareas</span>}
            </span>
            {!collapsed && !isAdmin && <span className="text-slate-500 text-xs">🔒</span>}
          </NavLink>

          {/* Proyectos */}
          <NavLink
            to="/proyectos"
            title="Proyectos"
            onClick={handleAdminNav}
            className={({ isActive }) =>
              `${navBase} ${isActive && isAdmin ? navActive : navIdle} ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5 justify-between'
              }`
            }
          >
            <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
              <span className="text-base">📁</span>
              {!collapsed && <span>Proyectos</span>}
            </span>
            {!collapsed && !isAdmin && <span className="text-slate-500 text-xs">🔒</span>}
          </NavLink>

          {/* Tareas Terminadas */}
          <NavLink
            to="/tareas-terminadas"
            title="Tareas Terminadas"
            onClick={handleAdminNav}
            className={({ isActive }) =>
              `${navBase} ${isActive && isAdmin ? navActive : navIdle} ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5 justify-between'
              }`
            }
          >
            <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
              <span className="text-base">🏁</span>
              {!collapsed && <span>Completadas</span>}
            </span>
            {!collapsed && !isAdmin && <span className="text-slate-500 text-xs">🔒</span>}
          </NavLink>
        </nav>

        {/* Usuario */}
        <div className="px-3 py-4 border-t border-slate-700">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div
              className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              title={isAdmin ? 'Kim — Administrador' : 'Visitante'}
            >
              {isAdmin ? 'K' : '👤'}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{isAdmin ? 'Kim' : 'Visitante'}</p>
                  <p className="text-xs text-slate-400">{isAdmin ? 'Administrador' : 'Solo lectura'}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="text-slate-400 hover:text-white text-xs transition"
                    title="Cerrar sesión"
                  >
                    🚪
                  </button>
                )}
              </>
            )}
          </div>
          {!collapsed && !isAdmin && (
            <button
              onClick={() => setShowLogin(true)}
              className="mt-3 w-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg py-2 transition"
            >
              🔑 Iniciar sesión como admin
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
