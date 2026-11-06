import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, setCsrfToken } from '@/api/http';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  useEffect(() => {
    // O painel do proprietário possui autenticação própria: não consultar
    // auth/me (usuário da empresa) ao abrir /plataforma/.
    if (
      /\/plataforma\/(?:login|empresas)(?:\/|$)/.test(window.location.pathname)
    ) {
      setIsLoadingAuth(false);
      return;
    }
    api('auth/me', { warehouse: false })
      .then((r) => {
        setCsrfToken(r.csrf);
        localStorage.removeItem('ykire_warehouse_id');
        setUser(r.user);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAuth(false));
  }, []);
  async function login(username, password, companyCode = '') {
    const r = await api('auth/login', {
      data: { username, password, company_code: companyCode },
      warehouse: false,
    });
    setCsrfToken(r.csrf);
    localStorage.removeItem('ykire_warehouse_id');
    setUser(r.user);
  }
  async function logout(shouldRedirect = true) {
    await api('auth/logout', { data: {}, warehouse: false }).catch(() => {});
    setUser(null);
    setCsrfToken('');
    localStorage.removeItem('ykire_warehouse_id');
    if (shouldRedirect) location.assign(`${import.meta.env.BASE_URL}login`);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        authChecked: !isLoadingAuth,
        login,
        logout,
        navigateToLogin: () =>
          location.assign(`${import.meta.env.BASE_URL}login`),
        checkUserAuth: () => {},
        checkAppState: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider ausente');
  return ctx;
}
