import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

interface Header { key: string; value: string }
interface Integration {
  id: string;
  name: string;
  description?: string;
  url: string;
  method: string;
  authType: string;
  enabled: boolean;
  titleProp?: string;
  keyProp?: string;
}

const empty = {
  name: '', description: '', url: '', method: 'GET',
  authType: 'NONE', bodyType: 'NONE', body: '', titleProp: '', keyProp: '',
};

export function Integrations() {
  const [list, setList] = useState<Integration[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...empty });
  const [headers, setHeaders] = useState<Header[]>([]);
  const [auth, setAuth] = useState<Record<string, string>>({});

  // Painel de consulta
  const [testId, setTestId] = useState('');
  const [params, setParams] = useState<Header[]>([{ key: 'cep', value: '13315000' }]);
  const [result, setResult] = useState<any>(null);

  const load = useCallback(() => {
    api.get<Integration[]>('/integrations').then(setList).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const setAuthField = (k: string, v: string) => setAuth((s) => ({ ...s, [k]: v }));

  async function create() {
    setError('');
    try {
      await api.post('/integrations', {
        name: form.name, description: form.description, url: form.url, method: form.method,
        authType: form.authType,
        authConfig: form.authType === 'NONE' ? undefined : auth,
        headers: headers.filter((h) => h.key),
        bodyType: form.bodyType, body: form.body || undefined,
        titleProp: form.titleProp || undefined, keyProp: form.keyProp || undefined,
      });
      setForm({ ...empty }); setHeaders([]); setAuth({});
      load();
    } catch (e) { setError((e as Error).message); }
  }

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  async function consult() {
    setResult(null);
    try {
      const p: Record<string, string> = {};
      params.forEach((x) => { if (x.key) p[x.key] = x.value; });
      const r = await api.post('/integrations/' + testId + '/execute', { params: p });
      setResult(r);
    } catch (e) { setResult({ erro: (e as Error).message }); }
  }

  return (
    <div>
      <h1>Integrações Externas / Webservices</h1>
      {error && <div className="error">{error}</div>}

      {/* Consulta em tempo real (req. 170, 180) */}
      <div className="card">
        <h2>Consultar (tempo real)</h2>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label>Integração</label>
            <select value={testId} onChange={(e) => setTestId(e.target.value)}>
              <option value="">Selecione...</option>
              {list.filter((i) => i.enabled).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <button onClick={consult} disabled={!testId}>Consultar</button>
        </div>
        <label style={{ marginTop: 10 }}>Parâmetros (query)</label>
        {params.map((p, i) => (
          <div className="row" key={i} style={{ marginBottom: 4 }}>
            <input placeholder="chave" style={{ flex: 1 }} value={p.key}
              onChange={(e) => setParams((s) => s.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} />
            <input placeholder="valor" style={{ flex: 2 }} value={p.value}
              onChange={(e) => setParams((s) => s.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
          </div>
        ))}
        <button className="secondary" onClick={() => setParams((s) => [...s, { key: '', value: '' }])}>+ parâmetro</button>
        {result && (
          <pre style={{ background: '#f5f7f9', padding: 12, borderRadius: 6, marginTop: 12, overflow: 'auto', fontSize: 13 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      {/* Lista / gerenciamento (req. 177-178) */}
      <div className="card">
        <h2>Integrações cadastradas</h2>
        <table>
          <thead><tr><th>Nome</th><th>Método</th><th>URL</th><th>Auth</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td><td>{i.method}</td>
                <td style={{ fontSize: 12 }}>{i.url}</td><td>{i.authType}</td>
                <td><span className={`badge ${i.enabled ? 'DEFERRED' : 'INDEFERRED'}`}>{i.enabled ? 'Ativa' : 'Inativa'}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }}
                    onClick={() => run(() => api.patch(`/integrations/${i.id}/enabled`, { enabled: !i.enabled }))}>
                    {i.enabled ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="help">Nenhuma integração.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Cadastro (req. 171-178) */}
      <div className="card">
        <h2>Nova integração</h2>
        <div className="row">
          <div style={{ flex: 2 }}><label>Nome</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div style={{ flex: 1 }}>
            <label>Método</label>
            <select value={form.method} onChange={(e) => set('method', e.target.value)}>
              <option>GET</option><option>POST</option>
            </select>
          </div>
        </div>
        <label>Descrição</label>
        <input value={form.description} onChange={(e) => set('description', e.target.value)} />
        <label>URL</label>
        <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
        <div className="row">
          <div style={{ flex: 1 }}><label>Propriedade de título</label><input value={form.titleProp} onChange={(e) => set('titleProp', e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Propriedade chave</label><input value={form.keyProp} onChange={(e) => set('keyProp', e.target.value)} /></div>
        </div>

        <label>Autenticação</label>
        <select value={form.authType} onChange={(e) => set('authType', e.target.value)}>
          <option value="NONE">Sem autenticação</option>
          <option value="BASIC">Basic Auth</option>
          <option value="OAUTH2">OAuth 2.0 (senha)</option>
        </select>

        {form.authType === 'BASIC' && (
          <div className="row">
            <div style={{ flex: 1 }}><label>Usuário</label><input onChange={(e) => setAuthField('username', e.target.value)} /></div>
            <div style={{ flex: 1 }}><label>Senha</label><input type="password" onChange={(e) => setAuthField('password', e.target.value)} /></div>
          </div>
        )}
        {form.authType === 'OAUTH2' && (
          <div>
            <div className="row">
              <div style={{ flex: 1 }}><label>Header Prefix</label><input placeholder="Bearer" onChange={(e) => setAuthField('headerPrefix', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label>Grant Type</label><input placeholder="password" onChange={(e) => setAuthField('grantType', e.target.value)} /></div>
              <div style={{ flex: 2 }}><label>URL do Token</label><input onChange={(e) => setAuthField('tokenUrl', e.target.value)} /></div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}><label>Client ID</label><input onChange={(e) => setAuthField('clientId', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label>Client Secret</label><input type="password" onChange={(e) => setAuthField('clientSecret', e.target.value)} /></div>
              <div style={{ flex: 1 }}>
                <label>Auth do cliente</label>
                <select onChange={(e) => setAuthField('clientAuthType', e.target.value)}>
                  <option value="body">No corpo</option><option value="basic">Header Basic</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}><label>Usuário</label><input onChange={(e) => setAuthField('username', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label>Senha</label><input type="password" onChange={(e) => setAuthField('password', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label>Scope</label><input onChange={(e) => setAuthField('scope', e.target.value)} /></div>
            </div>
          </div>
        )}

        <label>Headers</label>
        {headers.map((h, i) => (
          <div className="row" key={i} style={{ marginBottom: 4 }}>
            <input placeholder="chave" style={{ flex: 1 }} value={h.key}
              onChange={(e) => setHeaders((s) => s.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} />
            <input placeholder="valor" style={{ flex: 2 }} value={h.value}
              onChange={(e) => setHeaders((s) => s.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
          </div>
        ))}
        <button className="secondary" onClick={() => setHeaders((s) => [...s, { key: '', value: '' }])}>+ header</button>

        <div style={{ marginTop: 10 }}>
          <label>Corpo</label>
          <select value={form.bodyType} onChange={(e) => set('bodyType', e.target.value)} style={{ maxWidth: 220 }}>
            <option value="NONE">Nenhum</option><option value="RAW_JSON">Raw (JSON)</option>
          </select>
          {form.bodyType === 'RAW_JSON' && (
            <textarea rows={3} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder='{"exemplo": true}' />
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <button disabled={!form.name || !form.url} onClick={create}>Cadastrar integração</button>
        </div>
      </div>
    </div>
  );
}
