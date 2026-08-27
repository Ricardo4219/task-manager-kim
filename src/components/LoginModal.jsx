import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal({ onClose, onSuccess }) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (login(password)) {
      onSuccess?.();
      onClose();
    } else {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-80"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-lg font-bold text-gray-800">Acceso restringido</h2>
          <p className="text-sm text-gray-500 mt-1">Ingresa la contraseña de administrador</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Contraseña"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 ${
              error ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-200'
            }`}
          />
          {error && <p className="text-xs text-red-500">Contraseña incorrecta</p>}
          <button type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition">
            Entrar
          </button>
          <button type="button" onClick={onClose}
            className="w-full text-sm text-gray-400 hover:text-gray-600">
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
