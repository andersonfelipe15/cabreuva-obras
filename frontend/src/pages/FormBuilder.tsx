import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { DynamicForm, FormDefinition } from '../DynamicForm';

interface Sector { id: string; name: string }
interface Integration { id: string; name: string }
interface Role { id: string; name: string }
interface DispatchType { id: string; name: string; enabled: boolean }
interface PType {
  id: string; code: string; name: string; description?: string;
  category: string; enabled: boolean; responsibleSectorId?: string;
  formDefinition: FormDefinition;
}

const FIELD_TYPES = [
  'text', 'textarea', 'richtext', 'select', 'multiselect', 'number',
  'cpfcnpj', 'cep', 'date', 'file', 'arealist', 'geo', 'formula', 'partes', 'repeater',
];
const CATEGORIES = [
  { v: 'EDILICIO', l: 'Edilício' },
  { v: 'USO_SOLO', l: 'Uso do Solo' },
  { v: 'AMBIENTAL', l: 'Ambiental' },
  { v: 'SERVICOS_GERAIS', l: 'Serviços Gerais' },
];

const ACCESS_LEVELS = [
  { v: 'COMPLETO', l: 'Completo — todas as ações (análise, despacho e decisão)' },
  { v: 'INTERMEDIARIO', l: 'Intermediário — análise e despacho, sem decisão final' },
  { v: 'VISUALIZACAO', l: 'Somente visualização — nenhuma ação processual' },
];

const PROCESS_ACTIONS = [
  { v: 'FORWARD', l: 'Encaminhar' },
  { v: 'RETURN', l: 'Devolver p/ correção' },
  { v: 'DEFER', l: 'Deferir' },
  { v: 'INDEFER', l: 'Indeferir' },
  { v: 'ARCHIVE', l: 'Encerrar/Arquivar' },
];

const blank = (): any => ({
  code: '', name: '', description: '', category: 'EDILICIO',
  responsibleSectorId: '', enabled: true, accessLevel: 'COMPLETO', processActions: [], protocolRoleIds: [], triggers: [], dispatchTypeIds: [], requiredAuth: 'NONE',
  documentTemplate: { title: '', prefix: 'ALV', docType: 'ALVARA', orgao: '', secretaria: '', font: 'Helvetica' },
  formDefinition: { sections: [{ title: 'Nova seção', fields: [] }] },
});

export function FormBuilder() {
  const [types, setTypes] = useState<PType[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dispatchTypes, setDispatchTypes] = useState<DispatchType[]>([]);
  const [ed, setEd] = useState<any>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get<PType[]>('/process-types/all').then(setTypes).catch((e) => setError(e.message));
    api.get<Sector[]>('/sectors').then(setSectors);
    api.get<Integration[]>('/integrations').then(setIntegrations).catch(() => {});
    api.get<Role[]>('/roles').then(setRoles).catch(() => {});
    api.get<DispatchType[]>('/dispatch-types').then(setDispatchTypes).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const setField = (k: string, v: any) => setEd((s: any) => ({ ...s, [k]: v }));
  const setSections = (sections: any[]) => setEd((s: any) => ({ ...s, formDefinition: { sections } }));
  const toggleAction = (v: string) => {
    const cur: string[] = ed.processActions ?? [];
    setField('processActions', cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const toggleProtocolRole = (v: string) => {
    const cur: string[] = ed.protocolRoleIds ?? [];
    setField('protocolRoleIds', cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const setTpl = (k: string, v: any) => setEd((s: any) => ({ ...s, documentTemplate: { ...(s.documentTemplate || {}), [k]: v } }));

  function addSection() {
    setSections([...ed.formDefinition.sections, { title: 'Nova seção', fields: [] }]);
  }
  function updSection(i: number, patch: any) {
    setSections(ed.formDefinition.sections.map((s: any, j: number) => j === i ? { ...s, ...patch } : s));
  }
  function delSection(i: number) {
    setSections(ed.formDefinition.sections.filter((_: any, j: number) => j !== i));
  }
  function addField(si: number) {
    const f = { key: 'campo' + Date.now(), label: 'Novo campo', type: 'text', required: false, column: 12 };
    updSection(si, { fields: [...ed.formDefinition.sections[si].fields, f] });
  }
  function updField(si: number, fi: number, patch: any) {
    const fields = ed.formDefinition.sections[si].fields.map((f: any, j: number) => j === fi ? { ...f, ...patch } : f);
    updSection(si, { fields });
  }
  function delField(si: number, fi: number) {
    updSection(si, { fields: ed.formDefinition.sections[si].fields.filter((_: any, j: number) => j !== fi) });
  }

  async function save() {
    setError(''); setMsg('');
    const payload = {
      code: ed.code, name: ed.name, description: ed.description, category: ed.category,
      responsibleSectorId: ed.responsibleSectorId || null,
      enabled: ed.enabled, accessLevel: ed.accessLevel || 'COMPLETO',
      processActions: ed.processActions ?? [],
      protocolRoleIds: ed.protocolRoleIds ?? [],
      dispatchTypeIds: ed.dispatchTypeIds ?? [],
      requiredAuth: ed.requiredAuth || 'NONE',
      triggers: ed.triggers ?? [],
      documentTemplate: ed.documentTemplate ?? undefined,
      formDefinition: ed.formDefinition,
    };
    try {
      if (ed.id) await api.patch(`/process-types/${ed.id}`, payload);
      else await api.post('/process-types', payload);
      setMsg('Assunto salvo com sucesso.');
      setEd(null); load();
    } catch (e) { setError((e as Error).message); }
  }

  if (!ed) {
    return (
      <div>
        <h1>Editor de Formulários (Assuntos)</h1>
        {error && <div className="error">{error}</div>}
        {msg && <div className="card" style={{ borderColor: '#16a34a' }}>{msg}</div>}
        <div className="card">
          <button onClick={() => setEd(blank())}>+ Novo assunto</button>
        </div>
        <div className="card">
          <table>
            <thead><tr><th>Código</th><th>Nome</th><th>Categoria</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td>{t.code}</td><td>{t.name}</td><td>{t.category}</td>
                  <td><span className={`badge ${t.enabled ? 'DEFERRED' : 'INDEFERRED'}`}>{t.enabled ? 'Ativo' : 'Inativo'}</span></td>
                  <td><button className="secondary" style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => setEd({ ...t, responsibleSectorId: t.responsibleSectorId ?? '' })}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>{ed.id ? 'Editar assunto' : 'Novo assunto'}</h1>
      {error && <div className="error">{error}</div>}

      {/* Passo 1 — dados básicos */}
      <div className="card">
        <h2>1. Dados básicos</h2>
        <div className="row">
          <div style={{ flex: 1 }}><label>Código</label><input value={ed.code} onChange={(e) => setField('code', e.target.value)} /></div>
          <div style={{ flex: 2 }}><label>Nome</label><input value={ed.name} onChange={(e) => setField('name', e.target.value)} /></div>
        </div>
        <label>Descrição</label>
        <input value={ed.description ?? ''} onChange={(e) => setField('description', e.target.value)} />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Categoria</label>
            <select value={ed.category} onChange={(e) => setField('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Setor responsável</label>
            <select value={ed.responsibleSectorId} onChange={(e) => setField('responsibleSectorId', e.target.value)}>
              <option value="">—</option>
              {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <label>Nível de acesso do destinatário (protocolo)</label>
        <select value={ed.accessLevel ?? 'COMPLETO'} onChange={(e) => setField('accessLevel', e.target.value)}>
          {ACCESS_LEVELS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
        <p className="help">
          Define, sem programação, o que o servidor destinatário pode fazer neste assunto (req. 42-47).
          A alteração vale imediatamente inclusive para processos já protocolados (req. 48).
        </p>

        <label>Ações processuais habilitadas (req. 44)</label>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {PROCESS_ACTIONS.map((a) => (
            <label key={a.v} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: 4 }}
                checked={(ed.processActions ?? []).includes(a.v)} onChange={() => toggleAction(a.v)} />
              {a.l}
            </label>
          ))}
        </div>
        <p className="help">Nenhuma marcada = todas as ações habilitadas. Marque para restringir.</p>

        <label>Perfis autorizados a protocolar (req. 7)</label>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {roles.map((r) => (
            <label key={r.id} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: 4 }}
                checked={(ed.protocolRoleIds ?? []).includes(r.id)} onChange={() => toggleProtocolRole(r.id)} />
              {r.name}
            </label>
          ))}
        </div>
        <p className="help">Nenhum marcado = qualquer usuário com permissão de protocolar. Marque para restringir por perfil.</p>

        {/* Tipos de despacho habilitados por assunto (req. 98) */}
        <label>Tipos de despacho habilitados neste assunto</label>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {dispatchTypes.map((d) => (
            <label key={d.id} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: 4 }}
                checked={(ed.dispatchTypeIds ?? []).includes(d.id)}
                onChange={() => { const cur: string[] = ed.dispatchTypeIds ?? []; setField('dispatchTypeIds', cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id]); }} />
              {d.name}
            </label>
          ))}
          {dispatchTypes.length === 0 && <span className="help">Nenhum tipo cadastrado — crie em "Despachos".</span>}
        </div>
        <p className="help">Sem nenhum marcado, o formulário de "Novo despacho" não aparece nos processos deste assunto (req. 98).</p>

        {/* Autenticação avançada exigida para protocolar (req. 6) */}
        <label>Autenticação avançada exigida para protocolar (req. 6)</label>
        <select value={ed.requiredAuth ?? 'NONE'} onChange={(e) => setField('requiredAuth', e.target.value)} style={{ maxWidth: 340 }}>
          <option value="NONE">Nenhuma (login normal)</option>
          <option value="ICP">Certificado digital ICP-Brasil (A1)</option>
          <option value="GOVBR">Login gov.br</option>
        </select>
        <p className="help">Para "classes específicas de processos": exige que o requerente tenha entrado com o método escolhido para poder protocolar este assunto.</p>

        {/* Gatilhos de integração SIG por evento (req. 181) */}
        <label>Gatilhos de integração (SIG)</label>
        {(ed.triggers ?? []).map((t: any, i: number) => (
          <div className="row" key={i} style={{ alignItems: 'flex-end', marginBottom: 4 }}>
            <div style={{ flex: 1 }}>
              <select value={t.event ?? 'PROTOCOL'} onChange={(e) => setField('triggers', (ed.triggers ?? []).map((x: any, j: number) => j === i ? { ...x, event: e.target.value } : x))}>
                <option value="PROTOCOL">Ao protocolar</option>
                <option value="DEFER">Ao deferir</option>
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <select value={t.integrationId ?? ''} onChange={(e) => setField('triggers', (ed.triggers ?? []).map((x: any, j: number) => j === i ? { ...x, integrationId: e.target.value } : x))}>
                <option value="">Selecione a integração...</option>
                {integrations.map((ig) => <option key={ig.id} value={ig.id}>{ig.name}</option>)}
              </select>
            </div>
            <button className="danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setField('triggers', (ed.triggers ?? []).filter((_: any, j: number) => j !== i))}>×</button>
          </div>
        ))}
        <button className="secondary" style={{ marginTop: 4 }} onClick={() => setField('triggers', [...(ed.triggers ?? []), { event: 'PROTOCOL', integrationId: '' }])}>+ Gatilho</button>
        <p className="help">Dispara a integração escolhida (ex.: SIG) automaticamente no evento do processo (req. 181).</p>
      </div>

      {/* Passo 2 — campos */}
      <div className="card">
        <h2>2. Campos do formulário</h2>
        {ed.formDefinition.sections.map((sec: any, si: number) => (
          <div key={si} style={{ border: '1px solid #d8dee4', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <input style={{ flex: 1, fontWeight: 600 }} value={sec.title}
                onChange={(e) => updSection(si, { title: e.target.value })} />
              <button className="danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => delSection(si)}>Excluir seção</button>
            </div>
            {sec.fields.map((f: any, fi: number) => (
              <div key={fi} style={{ background: '#f5f7f9', borderRadius: 6, padding: 8, marginTop: 8 }}>
                <div className="row">
                  <div style={{ flex: 1 }}><label>Chave</label><input value={f.key} onChange={(e) => updField(si, fi, { key: e.target.value })} /></div>
                  <div style={{ flex: 2 }}><label>Rótulo</label><input value={f.label} onChange={(e) => updField(si, fi, { label: e.target.value })} /></div>
                  <div style={{ flex: 1 }}>
                    <label>Tipo</label>
                    <select value={f.type} onChange={(e) => updField(si, fi, { type: e.target.value })}>
                      {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ width: 70 }}><label>Colunas</label><input type="number" value={f.column ?? 12} onChange={(e) => updField(si, fi, { column: Number(e.target.value) })} /></div>
                </div>
                {(f.type === 'select' || f.type === 'multiselect') && (
                  <><label>Opções (separadas por vírgula)</label>
                  <input value={(f.options ?? []).join(', ')} onChange={(e) => updField(si, fi, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></>
                )}
                <label>Ajuda</label>
                <input value={f.help ?? ''} onChange={(e) => updField(si, fi, { help: e.target.value })} />
                <div style={{ display: 'flex', gap: 14, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.required} onChange={(e) => updField(si, fi, { required: e.target.checked })} /> Obrigatório</label>
                  <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.hidden} onChange={(e) => updField(si, fi, { hidden: e.target.checked })} /> Oculto</label>
                  <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.readonly} onChange={(e) => updField(si, fi, { readonly: e.target.checked })} /> Somente leitura</label>
                  <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.sensitive} onChange={(e) => updField(si, fi, { sensitive: e.target.checked })} /> Sigiloso</label>
                  <button className="danger" style={{ padding: '2px 8px', fontSize: 12, marginLeft: 'auto' }} onClick={() => delField(si, fi)}>Remover campo</button>
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#1f7a3d' }}>Regras de validação (req. 40)</summary>
                  <div style={{ marginTop: 6 }}>
                    <div className="row">
                      <div style={{ flex: 1 }}><label>Mín. caracteres</label><input type="number" value={f.minLength ?? ''} onChange={(e) => updField(si, fi, { minLength: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
                      <div style={{ flex: 1 }}><label>Máx. caracteres</label><input type="number" value={f.maxLength ?? ''} onChange={(e) => updField(si, fi, { maxLength: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
                      {f.type === 'number' && (
                        <>
                          <div style={{ flex: 1 }}><label>Mín. (valor)</label><input type="number" value={f.min ?? ''} onChange={(e) => updField(si, fi, { min: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
                          <div style={{ flex: 1 }}><label>Máx. (valor)</label><input type="number" value={f.max ?? ''} onChange={(e) => updField(si, fi, { max: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
                        </>
                      )}
                    </div>
                    <div className="row">
                      <div style={{ flex: 2 }}><label>Caracteres proibidos</label><input placeholder="ex.: @#$%" value={f.forbiddenChars ?? ''} onChange={(e) => updField(si, fi, { forbiddenChars: e.target.value || undefined })} /></div>
                      {f.type === 'file' && (
                        <div style={{ flex: 1 }}><label>Limite do anexo (MB)</label><input type="number" value={f.maxAttachmentMB ?? ''} onChange={(e) => updField(si, fi, { maxAttachmentMB: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
                      )}
                    </div>
                    {/* Cruzamento entre campos (req. 35) */}
                    <div className="row">
                      <div style={{ flex: 1 }}>
                        <label>Cruzar com o campo (chave)</label>
                        <input placeholder="ex.: email" value={f.crossCheck?.field ?? ''}
                          onChange={(e) => updField(si, fi, { crossCheck: e.target.value ? { field: e.target.value, op: f.crossCheck?.op ?? 'equals', message: f.crossCheck?.message } : undefined })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Operador</label>
                        <select value={f.crossCheck?.op ?? 'equals'} onChange={(e) => updField(si, fi, { crossCheck: { field: f.crossCheck?.field ?? '', op: e.target.value, message: f.crossCheck?.message } })}>
                          <option value="equals">deve ser igual</option>
                          <option value="notEquals">deve ser diferente</option>
                        </select>
                      </div>
                      <div style={{ flex: 2 }}>
                        <label>Mensagem</label>
                        <input value={f.crossCheck?.message ?? ''} onChange={(e) => updField(si, fi, { crossCheck: { field: f.crossCheck?.field ?? '', op: f.crossCheck?.op ?? 'equals', message: e.target.value } })} />
                      </div>
                    </div>
                    {f.type === 'arealist' && (
                      <label style={{ fontWeight: 400 }}>
                        <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={!!f.geoPerQuadro} onChange={(e) => updField(si, fi, { geoPerQuadro: e.target.checked })} />
                        Coletar latitude/longitude por quadro (req. 65)
                      </label>
                    )}
                    {f.type === 'repeater' && (
                      <div style={{ marginTop: 6 }}>
                        <label>Subcampos do grupo repetível — JSON [{'{'}"key","label","type"{'}'}] (req. 39)</label>
                        <input value={JSON.stringify(f.subfields ?? [])}
                          onChange={(e) => { try { updField(si, fi, { subfields: JSON.parse(e.target.value) }); } catch { /* json parcial */ } }} />
                      </div>
                    )}
                  </div>
                </details>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#1f7a3d' }}>Integração / IA (autofill, validação)</summary>
                  <div style={{ marginTop: 6 }}>
                    <div className="row">
                      <div style={{ flex: 1 }}>
                        <label>Autofill — integração</label>
                        <select value={f.autofill?.integrationId ?? ''} onChange={(e) => updField(si, fi, { autofill: { ...(f.autofill || { map: {} }), integrationId: e.target.value || undefined } })}>
                          <option value="">—</option>
                          {integrations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Param enviado</label>
                        <input value={f.autofill?.paramKey ?? ''} onChange={(e) => updField(si, fi, { autofill: { ...(f.autofill || { map: {} }), paramKey: e.target.value } })} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label>Mapa resposta→campo (JSON)</label>
                        <input value={JSON.stringify(f.autofill?.map ?? {})} onChange={(e) => { try { updField(si, fi, { autofill: { ...(f.autofill || {}), map: JSON.parse(e.target.value) } }); } catch { /* json parcial */ } }} />
                      </div>
                    </div>
                    <div className="row">
                      <div style={{ flex: 1 }}>
                        <label>Validação — integração</label>
                        <select value={f.validate?.integrationId ?? ''} onChange={(e) => updField(si, fi, { validate: { ...(f.validate || {}), integrationId: e.target.value || undefined } })}>
                          <option value="">—</option>
                          {integrations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Campo esperado</label>
                        <input value={f.validate?.requiredField ?? ''} onChange={(e) => updField(si, fi, { validate: { ...(f.validate || {}), requiredField: e.target.value } })} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label>Mensagem de erro</label>
                        <input value={f.validate?.message ?? ''} onChange={(e) => updField(si, fi, { validate: { ...(f.validate || {}), message: e.target.value } })} />
                      </div>
                    </div>
                    {f.type === 'file' && (
                      <div className="row">
                        <div style={{ flex: 1 }}>
                          <label>IA — documento esperado</label>
                          <input value={f.aiExtract?.expectedType ?? ''} onChange={(e) => updField(si, fi, { aiExtract: { ...(f.aiExtract || { map: {} }), expectedType: e.target.value } })} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label>IA — mapa extraído→campo (JSON)</label>
                          <input value={JSON.stringify(f.aiExtract?.map ?? {})} onChange={(e) => { try { updField(si, fi, { aiExtract: { ...(f.aiExtract || {}), map: JSON.parse(e.target.value) } }); } catch { /* json parcial */ } }} />
                        </div>
                      </div>
                    )}
                  </div>
                </details>
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#1f7a3d' }}>Regras dinâmicas (gatilho, fórmula)</summary>
                  <div style={{ marginTop: 6 }}>
                    <div className="row">
                      <div style={{ flex: 1 }}>
                        <label>Gatilho — chave do campo</label>
                        <input placeholder="ex.: tipoObra" value={f.showIf?.field ?? ''}
                          onChange={(e) => updField(si, fi, { showIf: e.target.value ? { field: e.target.value, equals: f.showIf?.equals ?? '' } : undefined })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Gatilho — igual a</label>
                        <input placeholder="ex.: Reforma" value={f.showIf?.equals ?? ''}
                          onChange={(e) => updField(si, fi, { showIf: { field: f.showIf?.field ?? '', equals: e.target.value } })} />
                      </div>
                    </div>
                    <p className="help" style={{ margin: '2px 0' }}>Campo só aparece quando o campo-gatilho tiver o valor informado (req. 37).</p>
                    {f.type === 'formula' && (
                      <>
                        <label>Fórmula (use as chaves dos campos)</label>
                        <input placeholder="ex.: areaConstruida * 2 + areaTerreno" value={f.formula ?? ''}
                          onChange={(e) => updField(si, fi, { formula: e.target.value })} />
                        <p className="help" style={{ margin: '2px 0' }}>Operadores + − * / e parênteses. Calculado automaticamente (req. 38).</p>
                      </>
                    )}
                  </div>
                </details>
              </div>
            ))}
            <button className="secondary" style={{ marginTop: 8 }} onClick={() => addField(si)}>+ Campo</button>
          </div>
        ))}
        <button className="secondary" onClick={addSection}>+ Seção</button>
        <div style={{ marginTop: 12 }}>
          <button className="secondary" onClick={() => setPreview((p) => !p)}>{preview ? 'Ocultar' : 'Ver'} prévia</button>
        </div>
        {preview && (
          <div style={{ border: '1px dashed #1f7a3d', borderRadius: 8, padding: 12, marginTop: 12 }}>
            <DynamicForm definition={ed.formDefinition} submitLabel="(prévia — não envia)" onSubmit={() => {}} />
          </div>
        )}
      </div>

      {/* Documento oficial — personalização (req. 190) */}
      <div className="card">
        <h2>Documento oficial (personalização)</h2>
        <div className="row">
          <div style={{ flex: 2 }}><label>Título do documento</label><input value={ed.documentTemplate?.title ?? ''} onChange={(e) => setTpl('title', e.target.value)} placeholder="ex.: ALVARÁ DE CONSTRUÇÃO" /></div>
          <div style={{ flex: 1 }}><label>Prefixo da numeração</label><input value={ed.documentTemplate?.prefix ?? ''} onChange={(e) => setTpl('prefix', e.target.value)} placeholder="ex.: ALV" /></div>
          <div style={{ flex: 1 }}><label>Tipo (docType)</label><input value={ed.documentTemplate?.docType ?? ''} onChange={(e) => setTpl('docType', e.target.value)} placeholder="ex.: ALVARA" /></div>
        </div>
        <div className="row">
          <div style={{ flex: 2 }}><label>Órgão (cabeçalho/emblema)</label><input value={ed.documentTemplate?.orgao ?? ''} onChange={(e) => setTpl('orgao', e.target.value)} placeholder="PREFEITURA MUNICIPAL DE CABREÚVA" /></div>
          <div style={{ flex: 2 }}><label>Secretaria</label><input value={ed.documentTemplate?.secretaria ?? ''} onChange={(e) => setTpl('secretaria', e.target.value)} /></div>
          <div style={{ flex: 1 }}>
            <label>Fonte</label>
            <select value={ed.documentTemplate?.font ?? 'Helvetica'} onChange={(e) => setTpl('font', e.target.value)}>
              <option value="Helvetica">Helvetica</option>
              <option value="TimesRoman">Times New Roman</option>
              <option value="Courier">Courier</option>
            </select>
          </div>
        </div>
        <p className="help">Emblema, fonte, título e numeração do documento oficial emitido (req. 190).</p>
      </div>

      {/* Passo 3 — habilitar e salvar */}
      <div className="card">
        <h2>3. Habilitar e salvar</h2>
        <label style={{ fontWeight: 400 }}>
          <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={ed.enabled} onChange={(e) => setField('enabled', e.target.checked)} />
          Assunto habilitado (aparece na Carta de Serviços)
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={!ed.code || !ed.name}>Salvar assunto</button>
          <button className="secondary" onClick={() => setEd(null)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
