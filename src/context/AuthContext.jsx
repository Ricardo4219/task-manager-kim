import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function checkPassword(pw) {
  return pw === atob('S2ltNjY0');
}

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(
    () => sessionStorage.getItem('tk_admin') === '1'
  );

  function login(password) {
    if (checkPassword(password)) {
      setIsAdmin(true);
      sessionStorage.setItem('tk_admin', '1');
      return true;
    }
    return false;
  }

  function logout() {
    setIsAdmin(false);
    sessionStorage.removeItem('tk_admin');
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
