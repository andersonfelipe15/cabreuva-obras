import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Proc {
  id: string;
  number: string;
  status: string;
  processType: { name: string };
  requester: { name: string };
  protocoledAt: string;
}
interface PType { id: string; name: string }
interface Sector { id: string; name: string }

const STATUS_LABEL: Record<string, string> = {
  PROTOCOLED: 'Novo',
  IN_ANALYSIS: 'Em análise',
  RETURNED: 'Devolvido',
  DEFERRED: 'Deferido',
  INDEFERRED: 'Indeferido',
};

// Colunas e estilos disponíveis para as visualizações personalizadas (req. 90-94).
const ALL_COLUMNS = [
  { key: 'number', label: 'Número' },
  { key: 'processType', label: 'Assunto' },
  { key: 'requester', label: 'Requerente' },
  { key: 'protocoledAt', label: 'Protocolo' },
  { key: 'status', label: 'Status' },
];
const ALL_STYLES = [
  { key: 'zebra', label: 'Zebrado' },
  { key: 'compact', label: 'Compacto (tabular)' },
  { key: 'bordered', label: 'Com bordas' },
  { key: 'hover', label: 'Destaque ao passar' },
];
const DEFAULT_COLUMNS = ALL_COLUMNS.map((c) => c.key);

interface View { id: string; name: string; columns: string[]; styles: string[] }

function renderCell(p: Proc, key: string) {
  switch (key) {
    case 'number': return p.number;
    case 'processType': return p.processType.name;
    case 'requester': return p.requester?.name;
    case 'protocoledAt': return p.protocoledAt ? new Date(p.protocoledAt).toLocaleString('pt-BR') : '—';
    case 'status': return <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>;
    default: return '';
  }
}

export function Inbox() {
  const [procs, setProcs] = useState<Proc[]>([]);
  const [types, setTypes] = useState<PType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [status, setStatus] = useState('');
  const [processTypeId, setProcessTypeId] = useState('');
  const [q, setQ] = useState('');
  const [orderBy, setOrderBy] = useState('protocoledAt');
  const [order, setOrder] = useState('desc');
  // Caixa de entrada padrão por setor, lembrada entre sessões (req. 85).
  const [sectorId, setSectorId] = useState(() => localStorage.getItem('inbox-default-sector') ?? '');
  // Caixas: recebidos / enviados / rascunhos (req. 75/84).
  const [box, setBox] = useState<'received' | 'sent' | 'drafts'>('received');
  const [drafts, setDrafts] = useState<{ typeId: string; count: number }[]>([]);

  // Visualizações personalizadas: colunas + estilos, salvas sem programação (req. 90-94).
  const [views, setViews] = useState<View[]>(() => {
    try { return JSON.parse(localStorage.getItem('inbox-views') || '[]'); } catch { return []; }
  });
  const [viewId, setViewId] = useState(() => localStorage.getItem('inbox-view-current') || '');
  const [editing, setEditing] = useState<View | null>(null);
  const current = views.find((v) => v.id === viewId) || null;
  const columns = current && current.columns.length ? current.columns : DEFAULT_COLUMNS;
  const styles = current?.styles ?? [];
  const tableClass = styles.map((s) => 'tbl-' + s).join(' ');

  useEffect(() => { localStorage.setItem('inbox-views', JSON.stringify(views)); }, [views]);
  function pickView(v: string) {
    setViewId(v);
    if (v) localStorage.setItem('inbox-view-current', v); else localStorage.removeItem('inbox-view-current');
  }
  function newView() {
    setEditing({ id: '', name: '', columns: [...DEFAULT_COLUMNS], styles: [] });
  }
  function toggle(list: string[], key: string): string[] {
    return list.includes(key) ? list.filter((x) => x !== key) : [...list, key];
  }
  function saveView() {
    if (!editing) return;
    if (!editing.name.trim()) { alert('Dê um nome à visualização.'); return; }
    if (!editing.columns.length) { alert('Selecione ao menos uma coluna.'); return; }
    const id = editing.id || 'v' + Date.now();
    const saved = { ...editing, id };
    setViews((vs) => (editing.id ? vs.map((v) => (v.id === id ? saved : v)) : [...vs, saved]));
    pickView(id);
    setEditing(null);
  }
  function delView(id: string) {
    if (!confirm('Excluir esta visualização?')) return;
    setViews((vs) => vs.filter((v) => v.id !== id));
    if (viewId === id) pickView('');
  }

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (processTypeId) params.set('processTypeId', processTypeId);
    if (q) params.set('q', q);
    if (sectorId) params.set('sectorId', sectorId);
    if (box === 'sent') params.set('box', 'sent');
    params.set('orderBy', orderBy);
    params.set('order', order);
    if (box === 'drafts') { setProcs([]); return; }
    api.get<Proc[]>(`/processes/inbox?${params}`).then(setProcs);
  }, [status, processTypeId, q, orderBy, order, sectorId, box]);
  useEffect(load, [status, processTypeId, orderBy, order, sectorId, box]);
  // Rascunhos salvos localmente (req. 75).
  useEffect(() => {
    if (box !== 'drafts') return;
    const found: { typeId: string; count: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('process-draft:')) {
        try {
          const v = JSON.parse(localStorage.getItem(k) || '{}');
          found.push({ typeId: k.slice('process-draft:'.length), count: Object.keys(v).length });
        } catch { /* ignora */ }
      }
    }
    setDrafts(found);
  }, [box]);
  useEffect(() => { api.get<PType[]>('/process-types/catalog').then(setTypes); }, []);
  // Setores do próprio usuário para a lista suspensa (req. 82).
  useEffect(() => {
    api.get<{ sectors?: { sector: Sector }[] }>('/users/me')
      .then((me) => setSectors((me.sectors ?? []).map((s) => s.sector)))
      .catch(() => {});
  }, []);

  function pickSector(v: string) {
    setSectorId(v);
    if (v) localStorage.setItem('inbox-default-sector', v);
    else localStorage.removeItem('inbox-default-sector');
  }

  return (
    <div>
      <h1>Caixa de Entrada</h1>

      {/* Caixas: recebidos / enviados / rascunhos (req. 75/84) */}
      <div className="card">
        <div style={{ display: 'flex', gap: 8 }}>
          {([['received', '📥 Recebidos'], ['sent', '📤 Enviados'], ['drafts', '📝 Rascunhos']] as [typeof box, string][]).map(([b, label]) => (
            <button key={b} className={box === b ? '' : 'secondary'} onClick={() => setBox(b)}>{label}</button>
          ))}
        </div>
      </div>

      {box === 'drafts' && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Rascunhos de protocolo</h2>
          {drafts.length === 0 && <p className="help">Nenhum rascunho salvo neste navegador.</p>}
          {drafts.map((d) => {
            const t = types.find((x) => x.id === d.typeId);
            return (
              <div key={d.typeId} className="row" style={{ alignItems: 'center', marginBottom: 6 }}>
                <div style={{ flex: 1 }}>{t?.name ?? d.typeId} <span className="help">({d.count} campos preenchidos)</span></div>
                <Link to={`/protocol/${d.typeId}`}><button className="secondary" style={{ padding: '2px 10px', fontSize: 12 }}>Retomar</button></Link>
                <button className="danger" style={{ padding: '2px 10px', fontSize: 12 }}
                  onClick={() => { localStorage.removeItem(`process-draft:${d.typeId}`); setDrafts((s) => s.filter((x) => x.typeId !== d.typeId)); }}>
                  Descartar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {box !== 'drafts' && (
      <>
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>Buscar (nº ou requerente)</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <div style={{ width: 180 }}>
            <label>Assunto</label>
            <select value={processTypeId} onChange={(e) => setProcessTypeId(e.target.value)}>
              <option value="">Todos</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ width: 150 }}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="PROTOCOLED">Novos</option>
              <option value="IN_ANALYSIS">Em análise</option>
              <option value="RETURNED">Devolvidos</option>
              <option value="DEFERRED">Deferidos</option>
            </select>
          </div>
          {sectors.length > 0 && (
            <div style={{ width: 180 }}>
              <label>Setor (minha caixa)</label>
              <select value={sectorId} onChange={(e) => pickSector(e.target.value)}>
                <option value="">Todos os meus setores</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={load}>Filtrar</button>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', marginTop: 8 }}>
          <div style={{ width: 180 }}>
            <label>Ordenar por</label>
            <select value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
              <option value="protocoledAt">Data do protocolo</option>
              <option value="number">Número</option>
            </select>
          </div>
          <div style={{ width: 150 }}>
            <label>Ordem</label>
            <select value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="desc">Mais recente / Z–A</option>
              <option value="asc">Mais antiga / A–Z</option>
            </select>
          </div>
        </div>
      </div>
      {/* Visualizações personalizadas (req. 90-94) */}
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ width: 260 }}>
            <label>Visualização</label>
            <select value={viewId} onChange={(e) => pickView(e.target.value)}>
              <option value="">Padrão (todas as colunas)</option>
              {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <button className="secondary" onClick={newView}>+ Nova visualização</button>
          {current && (
            <>
              <button className="secondary" onClick={() => setEditing(current)}>Editar</button>
              <button className="danger" onClick={() => delView(current.id)}>Excluir</button>
            </>
          )}
        </div>

        {editing && (
          <div style={{ border: '1px solid #1f7a3d', borderRadius: 8, padding: 12, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Editar' : 'Nova'} visualização</h3>
            <label>Nome</label>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="ex.: Só novos, compacto" />
            <div className="row" style={{ marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label>Colunas exibidas</label>
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} style={{ fontWeight: 400, display: 'block' }}>
                    <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
                      checked={editing.columns.includes(c.key)}
                      onChange={() => setEditing({ ...editing, columns: toggle(editing.columns, c.key) })} />
                    {c.label}
                  </label>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <label>Estilos (combináveis livremente)</label>
                {ALL_STYLES.map((s) => (
                  <label key={s.key} style={{ fontWeight: 400, display: 'block' }}>
                    <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
                      checked={editing.styles.includes(s.key)}
                      onChange={() => setEditing({ ...editing, styles: toggle(editing.styles, s.key) })} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={saveView}>Salvar visualização</button>
              <button className="secondary" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <table className={tableClass}>
          <thead>
            <tr>
              {ALL_COLUMNS.filter((c) => columns.includes(c.key)).map((c) => <th key={c.key}>{c.label}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procs.map((p) => (
              <tr key={p.id}>
                {ALL_COLUMNS.filter((c) => columns.includes(c.key)).map((c) => (
                  <td key={c.key} style={c.key === 'protocoledAt' ? { fontSize: 13 } : undefined}>{renderCell(p, c.key)}</td>
                ))}
                <td><Link to={`/process/${p.id}`}>Analisar</Link></td>
              </tr>
            ))}
            {procs.length === 0 && <tr><td colSpan={columns.length + 1} className="help">Nenhum processo.</td></tr>}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
