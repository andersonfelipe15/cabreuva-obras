import { useEffect, useState } from 'react';
import { api } from '../api';

interface Situation { name: string; color: string }
interface DField { key: string; label: string; type: string; required?: boolean; readonly?: boolean; options?: string[]; acceptExtensions?: string[] }
interface DType {
  id?: string; name: string; allowRequester: boolean;
  enabled: boolean; fields: DField[]; situations?: Situation[];
}

const FIELD_TYPES = ['text', 'textarea', 'richtext', 'select', 'multiselect', 'number', 'date', 'file'];
// Extensões mínimas exigidas para anexo de despacho (req. 97).
const DISPATCH_EXTS = ['xlsx', 'xls', 'doc', 'docx', 'odt', 'csv', 'pdf', 'png', 'jpg', 'dwg', 'mp3', 'mp4', 'rar', 'zip', '7z'];
const blank = (): DType => ({ name: 'Novo tipo de despacho', allowRequester: false, enabled: true, fields: [], situations: [] });

// Construtor no-code de tipos de despacho: nome, uso, habilitar, campos e situações (req. 96-97).
export function AdminDispatchTypes() {
  const [types, setTypes] = useState<DType[]>([]);
  const [ed, setEd] = useState<DType | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get<DType[]>('/dispatch-types').then(setTypes).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function open(t: DType) {
    setMsg('');
    setEd({ ...t, fields: [...(t.fields ?? [])], situations: [...(t.situations ?? [])] });
  }
  const patch = (p: Partial<DType>) => setEd((e) => (e ? { ...e, ...p } : e));

  // Campos
  const fields = () => ed?.fields ?? [];
  const setFields = (f: DField[]) => patch({ fields: f });
  const addField = () => setFields([...fields(), { key: 'campo' + Date.now(), label: 'Novo campo', type: 'text' }]);
  const updField = (i: number, p: Partial<DField>) => setFields(fields().map((f, j) => j === i ? { ...f, ...p } : f));
  const remField = (i: number) => setFields(fields().filter((_, j) => j !== i));

  // Situações
  const sit = () => ed?.situations ?? [];
  const setSit = (s: Situation[]) => patch({ situations: s });
  const updSit = (i: number, p: Partial<Situation>) => setSit(sit().map((s, j) => j === i ? { ...s, ...p } : s));
  const addSit = () => setSit([...sit(), { name: 'Novo status', color: '#1f7a3d' }]);
  const remSit = (i: number) => setSit(sit().filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...sit()]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; setSit(arr);
  };

  async function save() {
    if (!ed) return;
    setError(''); setMsg('');
    const payload = { name: ed.name, allowRequester: ed.allowRequester, enabled: ed.enabled, fields: ed.fields, situations: ed.situations };
    try {
      if (ed.id) await api.patch(`/dispatch-types/${ed.id}`, payload);
      else await api.post('/dispatch-types', payload);
      setMsg('Tipo de despacho salvo.'); setEd(null); load();
    } catch (e) { setError((e as Error).message); }
  }

  // Exclui um tipo de despacho (o backend recusa se já houver despachos com ele).
  async function remove(t: DType) {
    if (!t.id) return;
    if (!confirm(`Excluir o tipo de despacho "${t.name}"?`)) return;
    setError(''); setMsg('');
    try {
      await api.delete(`/dispatch-types/${t.id}`);
      setMsg(`Tipo de despacho "${t.name}" excluído.`);
      if (ed?.id === t.id) setEd(null);
      load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <h1>Tipos de Despacho</h1>
      {error && <div className="error">{error}</div>}
      {msg && <div className="card" style={{ borderColor: '#16a34a' }}>{msg}</div>}

      <div className="card">
        <button onClick={() => open(blank())}>+ Novo tipo de despacho</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Nome</th><th>Uso</th><th>Situação</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.allowRequester ? 'Requerente + interno' : 'Interno'}</td>
                <td>
                  {(t.situations ?? []).map((s) => (
                    <span key={s.name} className="badge" style={{ background: (s.color ?? '#ddd') + '33', color: s.color ?? '#333', marginRight: 4 }}>{s.name}</span>
                  ))}
                  {(t.situations ?? []).length === 0 && <span className="help">—</span>}
                </td>
                <td><span className={`badge ${t.enabled ? 'DEFERRED' : 'INDEFERRED'}`}>{t.enabled ? 'Ativo' : 'Inativo'}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => open(t)}>Editar</button>
                  <button className="danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => remove(t)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ed && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{ed.id ? 'Editar' : 'Novo'} tipo de despacho</h2>
          <div className="row">
            <div style={{ flex: 2 }}><label>Nome</label><input value={ed.name} onChange={(e) => patch({ name: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={ed.allowRequester} onChange={(e) => patch({ allowRequester: e.target.checked })} /> Disponível ao requerente</label>
            <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={ed.enabled} onChange={(e) => patch({ enabled: e.target.checked })} /> Habilitado</label>
          </div>

          <h3>Campos do formulário do despacho</h3>
          {fields().map((f, i) => (
            <div key={i} style={{ background: '#f5f7f9', borderRadius: 6, padding: 8, marginBottom: 6 }}>
              <div className="row">
                <div style={{ flex: 1 }}><label>Chave</label><input value={f.key} onChange={(e) => updField(i, { key: e.target.value })} /></div>
                <div style={{ flex: 2 }}><label>Rótulo</label><input value={f.label} onChange={(e) => updField(i, { label: e.target.value })} /></div>
                <div style={{ flex: 1 }}>
                  <label>Tipo</label>
                  <select value={f.type} onChange={(e) => updField(i, { type: e.target.value })}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {(f.type === 'select' || f.type === 'multiselect') && (
                <><label>Opções (vírgula)</label>
                <input value={(f.options ?? []).join(', ')} onChange={(e) => updField(i, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></>
              )}
              {f.type === 'file' && (
                <div style={{ marginTop: 4 }}>
                  <label>Extensões permitidas</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="secondary" style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => updField(i, { acceptExtensions: [...DISPATCH_EXTS] })}>Usar mínimas do edital</button>
                    {DISPATCH_EXTS.map((ext) => {
                      const cur = f.acceptExtensions ?? [];
                      return (
                        <label key={ext} style={{ fontWeight: 400, fontSize: 12 }}>
                          <input type="checkbox" style={{ width: 'auto', marginRight: 3 }} checked={cur.includes(ext)}
                            onChange={(e) => updField(i, { acceptExtensions: e.target.checked ? [...cur, ext] : cur.filter((x) => x !== ext) })} />
                          {ext}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.required} onChange={(e) => updField(i, { required: e.target.checked })} /> Obrigatório</label>
                <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.readonly} onChange={(e) => updField(i, { readonly: e.target.checked })} /> Somente leitura</label>
                <button className="danger" style={{ padding: '2px 8px', fontSize: 12, marginLeft: 'auto' }} onClick={() => remField(i)}>Remover</button>
              </div>
            </div>
          ))}
          <button className="secondary" onClick={addField}>+ Campo</button>

          <h3 style={{ marginTop: 16 }}>Situações (status)</h3>
          <p className="help">A ordem define a coluna "Status" e a evolução na timeline (req. 146-148).</p>
          {sit().map((s, i) => (
            <div className="row" key={i} style={{ alignItems: 'center', marginBottom: 6 }}>
              <input style={{ flex: 2 }} value={s.name} onChange={(e) => updSit(i, { name: e.target.value })} />
              <input type="color" style={{ width: 48, padding: 0 }} value={s.color ?? '#1f7a3d'} onChange={(e) => updSit(i, { color: e.target.value })} />
              <button className="secondary" style={{ padding: '2px 8px' }} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button className="secondary" style={{ padding: '2px 8px' }} disabled={i === sit().length - 1} onClick={() => move(i, 1)}>↓</button>
              <button className="danger" style={{ padding: '2px 8px' }} onClick={() => remSit(i)}>×</button>
            </div>
          ))}
          <button className="secondary" onClick={addSit}>+ Adicionar status</button>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={!ed.name}>Salvar</button>
            <button className="secondary" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
