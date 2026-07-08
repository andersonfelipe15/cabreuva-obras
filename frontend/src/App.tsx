import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { api } from './api';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { ActivateAccount } from './pages/ActivateAccount';
import { AcceptInvite } from './pages/AcceptInvite';
import { ImportLegacy } from './pages/ImportLegacy';
import { Notifications } from './pages/Notifications';
import { AdminDispatchTypes } from './pages/AdminDispatchTypes';
import { Catalog } from './pages/Catalog';
import { Protocol } from './pages/Protocol';
import { MyProcesses } from './pages/MyProcesses';
import { Inbox } from './pages/Inbox';
import { ProcessDetail } from './pages/ProcessDetail';
import { Reports } from './pages/Reports';
import { Fees } from './pages/Fees';
import { PdfViewer } from './pages/PdfViewer';
import { Integrations } from './pages/Integrations';
import { Sisobra } from './pages/Sisobra';
import { Documents } from './pages/Documents';
import { FormBuilder } from './pages/FormBuilder';
import { AdminUsers } from './pages/AdminUsers';
import { AdminRoles } from './pages/AdminRoles';

function ProfileSwitcher() {
  const { user, switchProfile } = useAuth();
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    api.get<{ roles?: { role: { id: string; name: string } }[] }>('/users/me')
      .then((me) => setRoles((me.roles ?? []).map((r) => r.role)))
      .catch(() => {});
  }, []);
  // Só faz sentido quando o usuário acumula mais de um perfil (req. 15-16).
  if (roles.length < 2) return null;
  const active = user?.activeRoleId ?? '';
  return (
    <select
      value={active}
      title="Perfil ativo"
      onChange={(e) => switchProfile(e.target.value).catch((err) => alert((err as Error).message))}
      style={{ width: 'auto', padding: '4px 8px', marginRight: 12 }}
    >
      <option value="" disabled>Perfil ativo…</option>
      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isStaff = user?.roles.some((r) => r === 'Analista' || r === 'Administrador');
  const isAdmin = user?.roles.some((r) => r === 'Administrador');
  return (
    <div>
      <div className="topbar">
        <strong>Aprovação de Projetos · Cabreúva</strong>
        <nav>
          <Link to="/catalog">Carta de Serviços</Link>
          <Link to="/mine">Meus Processos</Link>
          {isStaff && <Link to="/inbox">Caixa de Entrada</Link>}
          {isStaff && <Link to="/reports">Relatórios</Link>}
          {isStaff && <Link to="/fees">Taxas</Link>}
          {isStaff && <Link to="/integrations">Integrações</Link>}
          {isStaff && <Link to="/documents">Documentos</Link>}
          {isStaff && <Link to="/sisobra">SISOBRA</Link>}
          {isAdmin && <Link to="/admin/forms">Assuntos</Link>}
          {isAdmin && <Link to="/admin/dispatch-types">Despachos</Link>}
          {isAdmin && <Link to="/admin/users">Usuários</Link>}
          {isAdmin && <Link to="/admin/roles">Perfis</Link>}
          {isAdmin && <Link to="/admin/import">Importar</Link>}
          {isAdmin && <Link to="/admin/notifications">Notificações</Link>}
          <ProfileSwitcher />
          <span style={{ marginRight: 16 }}>{user?.name}</span>
          <button className="secondary" onClick={() => { logout(); nav('/login'); }}>Sair</button>
        </nav>
      </div>
      <div className="container">{children}</div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/ativar-conta" element={<ActivateAccount />} />
      <Route path="/aceitar-convite" element={<AcceptInvite />} />
      <Route path="/catalog" element={<Protected><Catalog /></Protected>} />
      <Route path="/protocol/:id" element={<Protected><Protocol /></Protected>} />
      <Route path="/mine" element={<Protected><MyProcesses /></Protected>} />
      <Route path="/inbox" element={<Protected><Inbox /></Protected>} />
      <Route path="/process/:id" element={<Protected><ProcessDetail /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/fees" element={<Protected><Fees /></Protected>} />
      <Route path="/viewer/:fileId" element={<Protected><PdfViewer /></Protected>} />
      <Route path="/integrations" element={<Protected><Integrations /></Protected>} />
      <Route path="/sisobra" element={<Protected><Sisobra /></Protected>} />
      <Route path="/documents" element={<Protected><Documents /></Protected>} />
      <Route path="/admin/forms" element={<Protected><FormBuilder /></Protected>} />
      <Route path="/admin/users" element={<Protected><AdminUsers /></Protected>} />
      <Route path="/admin/roles" element={<Protected><AdminRoles /></Protected>} />
      <Route path="/admin/import" element={<Protected><ImportLegacy /></Protected>} />
      <Route path="/admin/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/admin/dispatch-types" element={<Protected><AdminDispatchTypes /></Protected>} />
      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}
