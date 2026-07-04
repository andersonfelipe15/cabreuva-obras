import { createContext, useContext, useState, ReactNode } from 'react';
import { api, setToken } from './api';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  activeRoleId?: string | null;
  authMethod?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  login: (email: string, password: string) => Promise<void>;
  loginFederated: (document: string, provider: string) => Promise<void>;
  loginCertificate: (pfxBase64: string, password: string) => Promise<any>;
  register: (data: Record<string, string>) => Promise<{ pendingConfirmation?: boolean }>;
  switchProfile: (roleId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: SessionUser }>(
      '/auth/login',
      { email, password },
    );
    setToken(res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  }

  // Autenticação avançada gov.br / certificado ICP-Brasil (req. 6) — simulada.
  async function loginFederated(document: string, provider: string) {
    const res = await api.post<{ accessToken: string; user: SessionUser }>(
      '/auth/federated',
      { document, provider },
    );
    setToken(res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  }

  // Login por certificado ICP-Brasil A1 (req. 6).
  async function loginCertificate(pfxBase64: string, password: string) {
    const res = await api.post<{ accessToken: string; user: SessionUser; certificate?: any }>(
      '/auth/certificate',
      { pfxBase64, password },
    );
    setToken(res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    return res.certificate;
  }

  // Auto-cadastro de requerente externo (req. 2-4). Não loga: exige confirmação de e-mail.
  async function register(data: Record<string, string>) {
    return api.post<{ ok: boolean; pendingConfirmation?: boolean }>('/auth/register', data);
  }

  // Troca de perfil ativo sem novo login (req. 15-16).
  async function switchProfile(roleId: string) {
    const res = await api.post<{ accessToken: string; user: SessionUser }>(
      '/auth/switch-profile',
      { roleId },
    );
    setToken(res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, loginFederated, loginCertificate, register, switchProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
