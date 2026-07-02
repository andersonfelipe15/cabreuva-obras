import { useEffect, useState } from 'react';
import { api } from '../api';

interface Role { id: string; name: string; description?: string; permissions: string[]; system: boolean }
interface Perm { key: string; label: string }

export function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [error, setError] = useState('');
  const [ed, setEd] = useState<any>(null); // role em edição/criação

  function load() {
    api.get<Role[]>('/roles').then(setRoles).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    api.get<Perm[]>('/roles/permissions').then(setPerms).catch(() => {});
  }, []);

  function toggle(p: string) {
    setEd((s: any) => ({
      ...s,
      permissions: s.permissions.includes(p) ? s.permissions.filter((x: string) => x !== p) : [...s.permissions, p],
    }));
  }

  async function save() {
    setError('');
    try {
      if (ed.id) await api.patch(`/roles/${ed.id}`, { name: ed.name, description: ed.description, permissions: ed.permissions });
      else await api.post('/roles', { name: ed.name, description: ed.description, permissions: ed.permissions });
      setEd(null); load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <h1>Perfis de Permissionamento</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <button onClick={() => setEd({ name: '', description: '', permissions: [] })}>+ Novo perfil</button>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Perfil</th><th>Descrição</th><th>Permissões</th><th></th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.name}{r.system && <span className="help"> (sistema)</span>}</td>
                <td>{r.description ?? '—'}</td>
                <td>{r.permissions.length}</td>
                <td><button className="secondary" style={{ padding: '2px 8px', fontSize: 12 }}
                  onClick={() => setEd({ ...r })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ed && (
        <div className="card">
          <h2>{ed.id ? 'Editar perfil' : 'Novo perfil'}</h2>
          <div className="row">
            <div style={{ flex: 1 }}><label>Nome</label><input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></div>
            <div style={{ flex: 2 }}><label>Descrição</label><input value={ed.description ?? ''} onChange={(e) => setEd({ ...ed, description: e.target.value })} /></div>
          </div>
          <label>Permissões</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {perms.map((p) => (
              <label key={p.key} style={{ fontWeight: 400 }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
                  checked={ed.permissions.includes(p.key)} onChange={() => toggle(p.key)} />
                {p.label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={!ed.name}>Salvar perfil</button>
            <button className="secondary" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
