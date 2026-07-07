import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

interface Role { id: string; name: string }
interface Sector { id: string; name: string }
interface User {
  id: string; name: string; document: string; email: string;
  cargo?: string; status: string;
  roles: { role: { name: string } }[];
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  // Mensagens temporárias (somem após 3s) exibidas abaixo dos respectivos botões.
  const [roleMsg, setRoleMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [createMsg, setCreateMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [stForm, setStForm] = useState<{ status: string; substituteId: string }>({ status: 'ACTIVE', substituteId: '' });
  const [hist, setHist] = useState<any[]>([]);
  // Perfil (permissão) de um usuário já cadastrado — apenas UM por usuário.
  const [roleEdit, setRoleEdit] = useState<string>('');
  const [newSector, setNewSector] = useState('');
  const [form, setForm] = useState<any>({ name: '', document: '', email: '', cargo: '', password: '', roleIds: [], sectorIds: [] });

  // Convites internos/externos (req. 22-25).
  const [invites, setInvites] = useState<any[]>([]);
  const [invForm, setInvForm] = useState<any>({ id: '', name: '', document: '', email: '', type: 'EXTERNAL' });

  const loadInvites = () => api.get<any[]>('/invitations').then(setInvites).catch(() => {});

  const load = useCallback(() => {
    const p = new URLSearchParams(); if (q) p.set('q', q);
    api.get<User[]>(`/users?${p}`).then(setUsers).catch((e) => setError(e.message));
  }, [q]);
  useEffect(() => {
    load();
    api.get<Role[]>('/roles').then(setRoles).catch(() => {});
    api.get<Sector[]>('/sectors').then(setSectors).catch(() => {});
    loadInvites();
  }, [load]);

  async function saveInvite() {
    try {
      const editing = !!invForm.id;
      const nome = invForm.name;
      if (editing) {
        await api.patch(`/invitations/${invForm.id}`, { name: invForm.name, document: invForm.document, email: invForm.email, type: invForm.type });
      } else {
        const r: any = await api.post('/invitations', { name: invForm.name, document: invForm.document, email: invForm.email, type: invForm.type });
        alert('Convite enviado (simulado).\nLink de aceite:\n' + r.inviteLink);
      }
      setInvForm({ id: '', name: '', document: '', email: '', type: 'EXTERNAL' });
      loadInvites();
      flash(setInviteMsg, editing ? `Convite de ${nome} atualizado com sucesso.` : `Convite enviado para ${nome} com sucesso.`, true);
    } catch (e) {
      flash(setInviteMsg, `Não foi possível salvar o convite: ${(e as Error).message}`, false);
    }
  }
  async function resendInvite(id: string) {
    try {
      const r: any = await api.post(`/invitations/${id}/resend`, {});
      alert('Convite reenviado (simulado).\nNovo link:\n' + r.inviteLink);
      loadInvites();
      flash(setInviteMsg, 'Convite reenviado com sucesso.', true);
    } catch (e) {
      flash(setInviteMsg, `Não foi possível reenviar: ${(e as Error).message}`, false);
    }
  }
  async function cancelInvite(id: string) {
    if (!confirm('Cancelar este convite?')) return;
    try {
      await api.delete(`/invitations/${id}`);
      loadInvites();
      flash(setInviteMsg, 'Convite cancelado.', true);
    } catch (e) {
      flash(setInviteMsg, `Não foi possível cancelar: ${(e as Error).message}`, false);
    }
  }

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }
  // Exibe uma mensagem e a remove após 3 segundos.
  function flash(setter: (m: { text: string; ok: boolean } | null) => void, text: string, ok: boolean) {
    setter({ text, ok });
    setTimeout(() => setter(null), 3000);
  }
  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function create() {
    try {
      await api.post('/users', form);
      const nome = form.name;
      setForm({ name: '', document: '', email: '', cargo: '', password: '', roleIds: [], sectorIds: [] });
      load();
      flash(setCreateMsg, `Usuário "${nome}" cadastrado com sucesso.`, true);
    } catch (e) {
      flash(setCreateMsg, `Não foi possível cadastrar: ${(e as Error).message}`, false);
    }
  }

  // keepMsg=true preserva a mensagem (usado no refresh após salvar o perfil).
  function openDetail(id: string, keepMsg = false) {
    api.get<any>(`/users/${id}`).then((d) => {
      setDetail(d);
      setStForm({ status: d.status, substituteId: d.substituteId ?? '' });
      // Um perfil por usuário: usa o primeiro (ou vazio).
      setRoleEdit(d.roles?.[0]?.role.id ?? '');
      if (!keepMsg) setRoleMsg(null);
    });
    api.get<any[]>(`/users/${id}/history`).then(setHist).catch(() => setHist([]));
  }
  async function saveStatus() {
    await run(async () => {
      await api.patch(`/users/${detail.id}/status`, stForm);
      openDetail(detail.id);
      load();
    });
  }
  // Salva o perfil (admin/analista/requerente) do usuário — apenas um.
  async function saveRoles() {
    if (!roleEdit) { flash(setRoleMsg, 'Selecione um perfil para o usuário.', false); return; }
    const roleName = roles.find((r) => r.id === roleEdit)?.name ?? 'novo perfil';
    try {
      await api.patch(`/users/${detail.id}/roles`, { roleIds: [roleEdit] });
      openDetail(detail.id, true); // atualiza mantendo a mensagem
      load();
      flash(setRoleMsg, `Perfil de ${detail.name} atualizado para "${roleName}" com sucesso. O usuário verá a mudança ao recarregar a página.`, true);
    } catch (e) {
      flash(setRoleMsg, `Não foi possível alterar o perfil: ${(e as Error).message}`, false);
    }
  }

  return (
    <div>
      <h1>Gestão de Usuários</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <label>Buscar (nome, CPF, e-mail, cargo)</label>
        <div className="row">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} style={{ flex: 1 }} />
          <button onClick={load}>Buscar</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>E-mail</th><th>Cargo</th><th>Perfis</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.document}</td><td>{u.email}</td><td>{u.cargo ?? '—'}</td>
                <td>{u.roles.map((r) => r.role.name).join(', ')}</td>
                <td><span className={`badge ${u.status === 'ACTIVE' ? 'DEFERRED' : 'INDEFERRED'}`}>{u.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }}
                    onClick={() => openDetail(u.id)}>Detalhes</button>
                  <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }}
                    onClick={() => run(() => api.patch(`/users/${u.id}/block`, { blocked: u.status !== 'BLOCKED' }))}>
                    {u.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card">
          <h2>{detail.name}</h2>
          <p className="help">{detail.email} · {detail.document} · {detail.cargo ?? 'sem cargo'} · {detail.status}</p>
          <p>Telefone: {detail.phone || '—'} · Endereço: {detail.address || '—'}</p>
          <p>Setores: {detail.sectors?.map((s: any) => s.sector.name).join(', ') || '—'}</p>
          <p>Perfis: {detail.roles?.map((r: any) => r.role.name).join(', ') || '—'}</p>
          <p>Permissões: <span className="help">{detail.permissions?.join(', ') || '—'}</span></p>
          <p>Processos na caixa de entrada: {detail.processosNaCaixaEntrada ?? 0} · Protocolados: {detail.processosProtocolados} · Acessados: {detail.processosAcessados}</p>

          <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 10, marginTop: 4 }}>
            <h3 style={{ marginTop: 0 }}>Perfil / permissões (req. 14-17)</h3>
            <p className="help" style={{ marginTop: 0 }}>Selecione o perfil deste usuário. Cada usuário tem apenas <strong>um</strong> perfil (Administrador, Analista ou Requerente).</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
              {roles.map((r) => (
                <label key={r.id} style={{ fontWeight: 400 }}>
                  <input type="radio" name="roleEdit" style={{ width: 'auto', marginRight: 5 }}
                    checked={roleEdit === r.id}
                    onChange={() => setRoleEdit(r.id)} />
                  {r.name}
                </label>
              ))}
            </div>
            <button onClick={saveRoles} disabled={!roleEdit || roleEdit === detail.roles?.[0]?.role.id}>Salvar perfil</button>
            {roleMsg && (
              <div style={{
                marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 13,
                border: `1px solid ${roleMsg.ok ? '#1f7a3d' : '#b42318'}`,
                background: roleMsg.ok ? '#f0f9f2' : '#fdf2f2',
                color: roleMsg.ok ? '#14532d' : '#b42318',
              }}>
                {roleMsg.text}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 10, marginTop: 10 }}>
            <h3 style={{ marginTop: 0 }}>Status e substituto (req. 13)</h3>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Status</label>
                <select value={stForm.status} onChange={(e) => setStForm({ ...stForm, status: e.target.value })}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="VACATION">Férias</option>
                  <option value="TRAVEL">Viagem</option>
                  <option value="LEAVE">Licença</option>
                  <option value="DISABLED">Desativado</option>
                </select>
              </div>
              {['VACATION', 'TRAVEL', 'LEAVE'].includes(stForm.status) && (
                <div style={{ flex: 2 }}>
                  <label>Substituto (recebe os processos)</label>
                  <select value={stForm.substituteId} onChange={(e) => setStForm({ ...stForm, substituteId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {users.filter((u) => u.id !== detail.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <button onClick={saveStatus}>Salvar status</button>
            </div>
            {detail.substitute && <p className="help">Substituto atual: {detail.substitute.name}</p>}
          </div>

          <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 10, marginTop: 10 }}>
            <h3 style={{ marginTop: 0 }}>Histórico do usuário (req. 26)</h3>
            <table>
              <thead><tr><th>Data</th><th>Ação</th><th>Detalhe</th></tr></thead>
              <tbody>
                {hist.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 12 }}>{new Date(h.createdAt).toLocaleString('pt-BR')}</td>
                    <td>{h.action}</td>
                    <td style={{ fontSize: 12 }}>{h.detail ? JSON.stringify(h.detail) : '—'}</td>
                  </tr>
                ))}
                {hist.length === 0 && <tr><td colSpan={3} className="help">Sem registros de histórico.</td></tr>}
              </tbody>
            </table>
          </div>

          <button className="secondary" style={{ marginTop: 10 }} onClick={() => setDetail(null)}>Fechar</button>
        </div>
      )}

      <div className="card">
        <h2>Pré-cadastro de usuário interno</h2>
        <div className="row">
          <div style={{ flex: 2 }}><label>Nome</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div style={{ flex: 1 }}><label>CPF</label><input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
        </div>
        <div className="row">
          <div style={{ flex: 2 }}><label>E-mail</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div style={{ flex: 1 }}><label>Cargo</label><input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
          <div style={{ flex: 1 }}><label>Senha</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </div>
        <label>Perfil</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {roles.map((r) => (
            <label key={r.id} style={{ fontWeight: 400 }}>
              <input type="radio" name="newUserRole" style={{ width: 'auto', marginRight: 4 }} checked={form.roleIds[0] === r.id}
                onChange={() => setForm({ ...form, roleIds: [r.id] })} />{r.name}
            </label>
          ))}
        </div>
        <label>Setores</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {sectors.map((s) => (
            <label key={s.id} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: 4 }} checked={form.sectorIds.includes(s.id)}
                onChange={() => setForm({ ...form, sectorIds: toggle(form.sectorIds, s.id) })} />{s.name}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={!form.name || !form.document || !form.email || !form.password} onClick={create}>Cadastrar usuário</button>
          {createMsg && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${createMsg.ok ? '#1f7a3d' : '#b42318'}`,
              background: createMsg.ok ? '#f0f9f2' : '#fdf2f2',
              color: createMsg.ok ? '#14532d' : '#b42318',
            }}>
              {createMsg.text}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Convites (internos / externos)</h2>
        <div className="row">
          <div style={{ flex: 2 }}><label>Nome</label><input value={invForm.name} onChange={(e) => setInvForm({ ...invForm, name: e.target.value })} /></div>
          <div style={{ flex: 1 }}><label>CPF/CNPJ</label><input value={invForm.document} onChange={(e) => setInvForm({ ...invForm, document: e.target.value })} /></div>
        </div>
        <div className="row">
          <div style={{ flex: 2 }}><label>E-mail</label><input value={invForm.email} onChange={(e) => setInvForm({ ...invForm, email: e.target.value })} /></div>
          <div style={{ flex: 1 }}>
            <label>Tipo</label>
            <select value={invForm.type} onChange={(e) => setInvForm({ ...invForm, type: e.target.value })}>
              <option value="EXTERNAL">Externo (Requerente)</option>
              <option value="INTERNAL">Interno (Analista)</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button disabled={!invForm.name || !invForm.document || !invForm.email} onClick={saveInvite}>
            {invForm.id ? 'Salvar convite' : 'Enviar convite'}
          </button>
          {invForm.id && <button className="secondary" onClick={() => setInvForm({ id: '', name: '', document: '', email: '', type: 'EXTERNAL' })}>Cancelar edição</button>}
        </div>
        {inviteMsg && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 13,
            border: `1px solid ${inviteMsg.ok ? '#1f7a3d' : '#b42318'}`,
            background: inviteMsg.ok ? '#f0f9f2' : '#fdf2f2',
            color: inviteMsg.ok ? '#14532d' : '#b42318',
          }}>
            {inviteMsg.text}
          </div>
        )}
        {invites.length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Status</th><th>Envios</th><th></th></tr></thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td><td>{i.email}</td>
                  <td>{i.type === 'INTERNAL' ? 'Interno' : 'Externo'}</td>
                  <td><span className={`badge ${i.status === 'ACCEPTED' ? 'DEFERRED' : i.status === 'CANCELLED' ? 'INDEFERRED' : 'IN_ANALYSIS'}`}>{i.status}</span></td>
                  <td>{i.sentCount}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {i.status === 'PENDING' && (
                      <>
                        <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => setInvForm({ id: i.id, name: i.name, document: i.document, email: i.email, type: i.type })}>Editar</button>
                        <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => resendInvite(i.id)}>Reenviar</button>
                        <button className="danger" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => cancelInvite(i.id)}>Cancelar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Setores</h2>
        <div className="row">
          <input placeholder="Novo setor" value={newSector} onChange={(e) => setNewSector(e.target.value)} style={{ flex: 1 }} />
          <button className="secondary" disabled={!newSector}
            onClick={() => run(async () => { await api.post('/sectors', { name: newSector }); setNewSector(''); api.get<Sector[]>('/sectors').then(setSectors); })}>
            + Setor
          </button>
        </div>
        <p className="help">{sectors.map((s) => s.name).join(' · ')}</p>
      </div>
    </div>
  );
}
