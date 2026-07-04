import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, uploadFile } from './api';

interface Field {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  readonly?: boolean;
  options?: string[];
  acceptExtensions?: string[];
}
interface Situation { name: string; color: string }
interface DType {
  id: string;
  name: string;
  allowRequester: boolean;
  fields: Field[];
  situations?: Situation[];
}
interface Dispatch {
  id: string;
  title: string;
  situation?: string | null;
  values: Record<string, unknown>;
  adjustmentType?: string | null;
  justification?: string | null;
  adjusted: boolean;
  createdAt: string;
  dispatchType: { name: string };
  author: { name: string };
}

async function downloadIntegra(processId: string, ext: 'pdf' | 'zip', acts: string[]) {
  const qs = acts.length ? `?acts=${acts.join(',')}` : '';
  const res = await fetch(`/api/processes/${processId}/integra.${ext}${qs}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('Erro ao gerar a íntegra');
    return;
  }
  const blob = await res.blob();
  if (ext === 'pdf') {
    window.open(URL.createObjectURL(blob), '_blank');
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `integra-${processId}.zip`;
    a.click();
  }
}

export function DispatchTimeline({
  processId,
  isStaff,
}: {
  processId: string;
  isStaff: boolean;
}) {
  const [types, setTypes] = useState<DType[]>([]);
  const [items, setItems] = useState<Dispatch[]>([]);
  const [typeId, setTypeId] = useState('');
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [situation, setSituation] = useState('');
  const [error, setError] = useState('');
  const [agentOpen, setAgentOpen] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; description: string }[]>([]);
  const [agentContent, setAgentContent] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  // Ajuste de despacho com upload + confirmar/cancelar (req. 104).
  const [adjusting, setAdjusting] = useState<{ id: string; adjustmentType: string } | null>(null);
  const [adjJust, setAdjJust] = useState('');
  const [adjFile, setAdjFile] = useState<File | null>(null);
  // Seleção de atos para a íntegra (req. 113).
  const [integraOpen, setIntegraOpen] = useState(false);
  const [actTypes, setActTypes] = useState<{ type: string; label: string; count: number }[]>([]);
  const [selectedActs, setSelectedActs] = useState<string[]>([]);

  const load = useCallback(() => {
    api.get<DType[]>(`/processes/${processId}/dispatch-types`).then(setTypes);
    api.get<Dispatch[]>(`/processes/${processId}/dispatches`).then(setItems);
  }, [processId]);
  useEffect(load, [load]);
  useEffect(() => {
    if (agentOpen && agents.length === 0) api.get<any[]>('/ai/agents').then(setAgents).catch(() => {});
  }, [agentOpen, agents.length]);

  const selected = types.find((t) => t.id === typeId);

  async function runAgent(agentId: string) {
    setAgentBusy(true); setAgentContent('');
    try {
      const r: any = await api.post('/ai/agent/run', { agentId, processId });
      setAgentContent(r.content ?? '');
    } catch (e) {
      setAgentContent('Erro: ' + (e as Error).message);
    } finally {
      setAgentBusy(false);
    }
  }
  function applyToDispatch() {
    if (!selected) { alert('Selecione um tipo de despacho no formulário abaixo.'); return; }
    const target = selected.fields.find((f) => ['text', 'textarea', 'richtext'].includes(f.type));
    if (!target) { alert('O tipo selecionado não possui campo de texto.'); return; }
    setValues((v) => ({ ...v, [target.key]: agentContent }));
    alert(`Conteúdo aplicado ao campo "${target.label}" do novo despacho.`);
  }

  async function submit() {
    setError('');
    try {
      await api.post(`/processes/${processId}/dispatches`, {
        dispatchTypeId: typeId,
        values,
        situation: situation || undefined,
      });
      setTypeId('');
      setValues({});
      setSituation('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function advanceStatus(id: string) {
    try {
      await api.post(`/dispatches/${id}/advance-status`);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function confirmAdjust() {
    if (!adjusting) return;
    setError('');
    try {
      let anexo: { fileId: string; filename: string } | undefined;
      if (adjFile) {
        const up = await uploadFile(adjFile);
        anexo = { fileId: up.id, filename: up.filename };
      }
      await api.post(`/dispatches/${adjusting.id}/adjust`, {
        adjustmentType: adjusting.adjustmentType,
        justification: adjJust,
        values: anexo ? { anexo } : undefined,
      });
      setAdjusting(null); setAdjJust(''); setAdjFile(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function renderField(f: Field) {
    const v = values[f.key];
    const set = (val: unknown) => setValues((s) => ({ ...s, [f.key]: val }));
    const ro = !!f.readonly; // somente leitura (req. 100 iv)
    let control;
    if (f.type === 'richtext') {
      // Texto avançado com formatações (req. 97): negrito/itálico/sublinhado/lista/link.
      control = <DispatchRichText html={(v as string) ?? ''} readOnly={ro} onChange={(h) => set(h)} />;
    } else if (f.type === 'textarea') {
      control = <textarea rows={3} readOnly={ro} value={(v as string) ?? ''} onChange={(e) => set(e.target.value)} />;
    } else if (f.type === 'multiselect') {
      // Seleção múltipla em botões de opção (req. 97).
      const arr = (v as string[]) ?? [];
      control = (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {f.options?.map((o) => (
            <label key={o} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: 4 }} disabled={ro}
                checked={arr.includes(o)}
                onChange={(e) => set(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
              {o}
            </label>
          ))}
        </div>
      );
    } else if (f.type === 'select' || f.type === 'radio') {
      control = (
        <select value={(v as string) ?? ''} disabled={ro} onChange={(e) => set(e.target.value)}>
          <option value="">Selecione...</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else if (f.type === 'file') {
      control = (
        <input type="file" disabled={ro} accept={f.acceptExtensions?.map((e) => '.' + e).join(',')}
          onChange={(e) => set(e.target.files?.[0]?.name ?? '')} />
      );
    } else {
      control = <input value={(v as string) ?? ''} readOnly={ro} onChange={(e) => set(e.target.value)} />;
    }
    return (
      <div key={f.key} style={{ marginBottom: 8 }}>
        <label>{f.label}{f.required && <span style={{ color: '#b42318' }}> *</span>}</label>
        {control}
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Despachos (timeline)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {isStaff && <button onClick={() => setAgentOpen((o) => !o)}>🤖 Agente de IA</button>}
          <button className="secondary" onClick={() => {
            const next = !integraOpen;
            setIntegraOpen(next);
            if (next && actTypes.length === 0) {
              api.get<{ type: string; label: string; count: number }[]>(`/processes/${processId}/integra/act-types`)
                .then((t) => { setActTypes(t); setSelectedActs(t.map((x) => x.type)); })
                .catch(() => {});
            }
          }}>Íntegra do processo</button>
        </div>
      </div>

      {integraOpen && (
        <div style={{ border: '1px solid #1f7a3d', borderRadius: 8, padding: 12, marginTop: 10 }}>
          <h3 style={{ marginTop: 0 }}>Íntegra do processo (req. 109-114)</h3>
          <p className="help" style={{ marginTop: 0 }}>Selecione os atos a incluir. O ZIP acompanha os documentos emitidos.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {actTypes.map((t) => (
              <label key={t.type} style={{ fontWeight: 400 }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
                  checked={selectedActs.includes(t.type)}
                  onChange={(e) => setSelectedActs((s) => e.target.checked ? [...s, t.type] : s.filter((x) => x !== t.type))} />
                {t.label} <span className="help">({t.count})</span>
              </label>
            ))}
            {actTypes.length === 0 && <span className="help">Carregando atos…</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="secondary" onClick={() => setSelectedActs(actTypes.map((x) => x.type))}>Selecionar todos</button>
            <button className="secondary" onClick={() => setSelectedActs([])}>Limpar</button>
            <button style={{ marginLeft: 'auto' }} onClick={() => downloadIntegra(processId, 'pdf', selectedActs)}>Baixar PDF</button>
            <button onClick={() => downloadIntegra(processId, 'zip', selectedActs)}>Baixar ZIP</button>
          </div>
        </div>
      )}

      {agentOpen && (
        <div style={{ border: '1px solid #1f7a3d', borderRadius: 8, padding: 12, marginTop: 10 }}>
          <h3 style={{ marginTop: 0 }}>Agente de IA — sugestões de análises e tarefas</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {agents.map((a) => (
              <button key={a.id} className="secondary" title={a.description} disabled={agentBusy} onClick={() => runAgent(a.id)}>
                {a.name}
              </button>
            ))}
          </div>
          {agentBusy && <p className="help">Gerando conteúdo com IA...</p>}
          {agentContent && (
            <div style={{ marginTop: 10 }}>
              <textarea rows={8} value={agentContent} onChange={(e) => setAgentContent(e.target.value)} />
              <div style={{ marginTop: 6 }}>
                <button onClick={applyToDispatch}>Usar como despacho</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div style={{ marginTop: 12 }}>
        {items.map((d) => {
          const sit = selectedSituation(types, d);
          return (
            <div key={d.id} style={{ borderLeft: '3px solid #1f7a3d', paddingLeft: 12, marginBottom: 14 }}>
              <div>
                <strong>{d.title}</strong>{' '}
                {d.situation && (
                  <span className="badge" style={{ background: (sit?.color ?? '#ddd') + '33', color: sit?.color ?? '#333' }}>
                    {d.situation}
                  </span>
                )}
                {d.adjusted && <span className="badge INDEFERRED"> ajustado</span>}
              </div>
              <div className="help">
                {d.dispatchType.name} · {d.author.name} · {new Date(d.createdAt).toLocaleString('pt-BR')}
              </div>
              {Object.entries(d.values ?? {}).map(([k, v]) => (
                <div key={k} style={{ fontSize: 14 }}>{k}: {String(v ?? '')}</div>
              ))}
              {d.adjustmentType && (
                <div className="help">Ajuste: {d.adjustmentType} — {d.justification}</div>
              )}
              {isStaff && !d.adjusted && !d.adjustmentType && (
                <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['RETIFICACAO', 'REPUBLICACAO', 'ATUALIZACAO'].map((a) => (
                    <button key={a} className="secondary" style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => { setAdjusting({ id: d.id, adjustmentType: a }); setAdjJust(''); setAdjFile(null); }}>{a}</button>
                  ))}
                  <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }}
                    title="Evoluir para a próxima situação configurada"
                    onClick={() => advanceStatus(d.id)}>⏭ Avançar status</button>
                </div>
              )}
              {adjusting?.id === d.id && (
                <div style={{ border: '1px solid #1f7a3d', borderRadius: 6, padding: 8, marginTop: 6 }}>
                  <strong>{adjusting.adjustmentType}</strong>
                  <label>Justificativa</label>
                  <textarea rows={2} value={adjJust} onChange={(e) => setAdjJust(e.target.value)} />
                  <label>Anexo (opcional)</label>
                  <input type="file" onChange={(e) => setAdjFile(e.target.files?.[0] ?? null)} />
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <button style={{ padding: '4px 10px', fontSize: 12 }} disabled={!adjJust.trim()} onClick={confirmAdjust}>Confirmar</button>
                    <button className="secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setAdjusting(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="help">Nenhum despacho ainda.</p>}
      </div>

      {/* Novo despacho */}
      {types.length > 0 && (
        <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 12, marginTop: 8 }}>
          <h3 style={{ marginTop: 0 }}>Novo despacho</h3>
          {error && <div className="error">{error}</div>}
          <label>Tipo de despacho</label>
          <select value={typeId} onChange={(e) => { setTypeId(e.target.value); setValues({}); setSituation(''); }}>
            <option value="">Selecione...</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {selected && (
            <div style={{ marginTop: 10 }}>
              {selected.fields.map(renderField)}
              {selected.situations && selected.situations.length > 0 && (
                <div>
                  <label>Situação</label>
                  <select value={situation} onChange={(e) => setSituation(e.target.value)}>
                    <option value="">Selecione...</option>
                    {selected.situations.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button onClick={submit}>Lançar despacho</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function selectedSituation(types: DType[], d: Dispatch): Situation | undefined {
  for (const t of types) {
    const s = t.situations?.find((x) => x.name === d.situation);
    if (s) return s;
  }
  return undefined;
}

// Editor de texto avançado do despacho (req. 97): negrito, itálico, sublinhado,
// listas e hyperlink, via contentEditable.
function DispatchRichText({ html, onChange, readOnly }: { html: string; onChange: (h: string) => void; readOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (html ?? '')) ref.current.innerHTML = html ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const emit = () => ref.current && onChange(ref.current.innerHTML);
  const cmd = (c: string, val?: string) => { document.execCommand(c, false, val); emit(); };
  const btn: React.CSSProperties = { padding: '2px 8px', fontSize: 12, width: 'auto' };
  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
          <button type="button" className="secondary" style={btn} title="Negrito" onMouseDown={(e) => { e.preventDefault(); cmd('bold'); }}><b>N</b></button>
          <button type="button" className="secondary" style={btn} title="Itálico" onMouseDown={(e) => { e.preventDefault(); cmd('italic'); }}><i>I</i></button>
          <button type="button" className="secondary" style={btn} title="Sublinhado" onMouseDown={(e) => { e.preventDefault(); cmd('underline'); }}><u>S</u></button>
          <button type="button" className="secondary" style={btn} title="Lista" onMouseDown={(e) => { e.preventDefault(); cmd('insertUnorderedList'); }}>• Lista</button>
          <button type="button" className="secondary" style={btn} title="Lista numerada" onMouseDown={(e) => { e.preventDefault(); cmd('insertOrderedList'); }}>1. Lista</button>
          <button type="button" className="secondary" style={btn} title="Link" onMouseDown={(e) => { e.preventDefault(); const u = window.prompt('URL do link:'); if (u) cmd('createLink', u); }}>🔗</button>
        </div>
      )}
      <div ref={ref} contentEditable={!readOnly} suppressContentEditableWarning onInput={emit}
        style={{ border: '1px solid #d8dee4', borderRadius: 6, minHeight: 60, padding: '6px 8px', background: readOnly ? '#f3f4f6' : '#fff', fontSize: 14 }} />
    </div>
  );
}
