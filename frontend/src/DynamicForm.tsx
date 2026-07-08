import { useEffect, useRef, useState } from 'react';
import { uploadFile, api } from './api';
import { maskCpfCnpj, validateCpfCnpj } from './cpfcnpj';

// Tipos espelham o form-schema do backend.
interface Field {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  help?: string;
  column?: number;
  options?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
  forbiddenChars?: string; // caracteres proibidos (req. 40)
  maxAttachmentMB?: number; // limite de tamanho do anexo (req. 40)
  acceptExtensions?: string[];
  // Preenchimento automático via integração (req. 36/180).
  autofill?: { integrationId: string; paramKey?: string; map: Record<string, string> };
  // Validação de campo via webservice (req. 176).
  validate?: { integrationId: string; paramKey?: string; requiredField?: string; message?: string };
  // Extração por IA para preencher campos a partir do anexo (req. 208).
  aiExtract?: { expectedType?: string; map: Record<string, string> };
  // Campo dinâmico por gatilho: só aparece quando outro campo tem determinado valor (req. 37).
  showIf?: { field: string; equals: string };
  // Fórmula de cálculo a partir de outros campos numéricos (req. 38).
  formula?: string;
  // Validação por cruzamento entre campos (req. 35).
  crossCheck?: { field: string; op: 'equals' | 'notEquals'; message?: string };
  // Subcampos do grupo repetível (req. 39).
  subfields?: { key: string; label: string; type: string }[];
  // Latitude/longitude por quadro de área (req. 65).
  geoPerQuadro?: boolean;
}
interface Section {
  title: string;
  fields: Field[];
}
export interface FormDefinition {
  sections: Section[];
}

type Values = Record<string, unknown>;

// Avalia uma fórmula aritmética (+ - * / e parênteses), substituindo as chaves de
// campos pelos respectivos valores numéricos (req. 38).
function evalFormula(expr: string, vals: Values): number {
  if (!expr) return 0;
  let s = expr;
  for (const [k, v] of Object.entries(vals)) {
    s = s.replace(new RegExp('\\b' + k + '\\b', 'g'), String(Number(v) || 0));
  }
  if (!/^[0-9+\-*/(). ]*$/.test(s)) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict"; return (${s || 0});`)();
    return typeof r === 'number' && isFinite(r) ? r : 0;
  } catch {
    return 0;
  }
}

// Renderiza o texto de ajuda com links e imagens em markdown simples (req. 34).
function helpHtml(text: string): string {
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;max-height:120px;display:block;margin-top:4px"/>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');
  return s;
}

// Um campo com gatilho só é visível/exigido quando a condição é satisfeita (req. 37).
function isVisible(f: Field, vals: Values): boolean {
  if (f.hidden) return false;
  if (f.showIf) return String(vals[f.showIf.field] ?? '') === String(f.showIf.equals);
  return true;
}

export function DynamicForm({
  definition,
  onSubmit,
  submitLabel = 'Protocolar',
  initialValues,
  onChange,
}: {
  definition: FormDefinition;
  onSubmit: (values: Values) => void;
  submitLabel?: string;
  initialValues?: Values;
  onChange?: (values: Values) => void;
}) {
  const [values, setValues] = useState<Values>(initialValues ?? {});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  // Rascunho: notifica o pai a cada mudança para salvamento automático (req. 56).
  useEffect(() => {
    onChange?.(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  // Autofill + validação via integração (executados no blur do campo).
  async function runFieldServices(f: Field, val: unknown) {
    if (!val) return;
    if (f.autofill?.integrationId) {
      try {
        const r: any = await api.post(`/integrations/${f.autofill.integrationId}/execute`, {
          params: { [f.autofill.paramKey || f.key]: String(val) },
        });
        const data = r?.data ?? {};
        setValues((s) => {
          const next = { ...s };
          for (const [resp, formKey] of Object.entries(f.autofill!.map || {})) next[formKey] = data[resp];
          return next;
        });
      } catch {
        /* silencioso */
      }
    }
    if (f.validate?.integrationId) {
      try {
        const r: any = await api.post(`/integrations/${f.validate.integrationId}/execute`, {
          params: { [f.validate.paramKey || f.key]: String(val) },
        });
        const valid = r?.status === 200 && (!f.validate.requiredField || r?.data?.[f.validate.requiredField]);
        setFieldErrors((s) => ({ ...s, [f.key]: valid ? '' : (f.validate!.message || 'Valor não validado no serviço externo') }));
      } catch {
        setFieldErrors((s) => ({ ...s, [f.key]: f.validate!.message || 'Falha na validação externa' }));
      }
    }
  }

  function renderField(f: Field) {
    if (!isVisible(f, values)) return null;
    const width = `${((f.column ?? 12) / 12) * 100}%`;
    const val = values[f.key];

    let control;
    switch (f.type) {
      case 'textarea':
      case 'richtext':
        control = (
          <textarea rows={3} value={(val as string) ?? ''} readOnly={f.readonly}
            onChange={(e) => set(f.key, e.target.value)} />
        );
        break;
      case 'select':
        control = (
          <select value={(val as string) ?? ''} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">Selecione...</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
        break;
      case 'multiselect':
        control = (
          <div>
            {f.options?.map((o) => {
              const arr = (val as string[]) ?? [];
              return (
                <label key={o} style={{ fontWeight: 400 }}>
                  <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
                    checked={arr.includes(o)}
                    onChange={(e) =>
                      set(f.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))
                    } />
                  {o}
                </label>
              );
            })}
          </div>
        );
        break;
      case 'number':
        control = (
          <input type="number" value={(val as number) ?? ''} min={f.min} max={f.max}
            onChange={(e) => set(f.key, e.target.value === '' ? '' : Number(e.target.value))} />
        );
        break;
      case 'date':
        control = <input type="date" value={(val as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} />;
        break;
      case 'file': {
        const fileVal = val as { fileId?: string; filename?: string } | undefined;
        control = (
          <div>
            <input type="file" accept={f.acceptExtensions?.map((e) => '.' + e).join(',')}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Limite de tamanho do anexo por campo (req. 40).
                if (f.maxAttachmentMB && file.size > f.maxAttachmentMB * 1024 * 1024) {
                  alert(`O anexo excede o limite de ${f.maxAttachmentMB} MB para "${f.label}".`);
                  e.target.value = '';
                  return;
                }
                try {
                  const up = await uploadFile(file);
                  set(f.key, { fileId: up.id, filename: up.filename });
                  // Extração por IA para preencher campos (req. 208).
                  if (f.aiExtract?.map) {
                    try {
                      const res: any = await api.post(`/files/${up.id}/analyze`, { expectedType: f.aiExtract.expectedType });
                      setValues((s) => {
                        const next = { ...s };
                        for (const [resp, formKey] of Object.entries(f.aiExtract!.map)) next[formKey] = res?.[resp];
                        return next;
                      });
                    } catch {
                      /* precisa de ANTHROPIC_API_KEY */
                    }
                  }
                } catch (err) {
                  alert((err as Error).message);
                }
              }} />
            {fileVal?.filename && <div className="help">📎 {fileVal.filename} (enviado)</div>}
          </div>
        );
        break;
      }
      case 'geo':
        control = (
          <div className="row">
            <input placeholder="Latitude" style={{ flex: 1 }}
              onChange={(e) => set(f.key, { ...(val as object), lat: e.target.value })} />
            <input placeholder="Longitude" style={{ flex: 1 }}
              onChange={(e) => set(f.key, { ...(val as object), lng: e.target.value })} />
          </div>
        );
        break;
      case 'arealist':
        control = <AreaList value={(val as any[]) ?? []} onChange={(v) => set(f.key, v)} geo={f.geoPerQuadro} />;
        break;
      case 'partes':
        control = (
          <div className="row">
            <input placeholder="Remetente" style={{ flex: 1 }}
              value={(val as any)?.remetente ?? ''} onChange={(e) => set(f.key, { ...(val as object), remetente: e.target.value })} />
            <input placeholder="Destinatário" style={{ flex: 1 }}
              value={(val as any)?.destinatario ?? ''} onChange={(e) => set(f.key, { ...(val as object), destinatario: e.target.value })} />
          </div>
        );
        break;
      case 'repeater':
        control = <Repeater value={(val as any[]) ?? []} subfields={f.subfields ?? []} onChange={(v) => set(f.key, v)} />;
        break;
      case 'formula': {
        const result = evalFormula(f.formula ?? '', values);
        control = <input value={String(result)} readOnly style={{ background: '#f3f4f6' }} />;
        break;
      }
      case 'cpfcnpj': {
        const dErr = val ? validateCpfCnpj(val as string) : null;
        control = (
          <>
            <input value={(val as string) ?? ''} readOnly={f.readonly}
              inputMode="numeric" placeholder="000.000.000-00 ou 00.000.000/0000-00"
              style={dErr ? { borderColor: '#b42318' } : undefined}
              onChange={(e) => set(f.key, maskCpfCnpj(e.target.value))}
              onBlur={() => runFieldServices(f, values[f.key])} />
            {dErr && <div style={{ color: '#b42318', fontSize: 12 }}>{dErr}</div>}
          </>
        );
        break;
      }
      default: // text, cep
        control = (
          <input value={(val as string) ?? ''} readOnly={f.readonly}
            onChange={(e) => set(f.key, e.target.value)}
            onBlur={() => runFieldServices(f, values[f.key])} />
        );
    }

    return (
      <div key={f.key} style={{ flexBasis: width, minWidth: 200, flexGrow: 1 }}>
        <label>{f.label}{f.required && <span style={{ color: '#b42318' }}> *</span>}</label>
        {control}
        {fieldErrors[f.key] && <div style={{ color: '#b42318', fontSize: 12 }}>{fieldErrors[f.key]}</div>}
        {f.help && <div className="help" dangerouslySetInnerHTML={{ __html: helpHtml(f.help) }} />}
      </div>
    );
  }

  function handleSubmit() {
    // Validação de obrigatórios no cliente (o backend revalida).
    const missing: string[] = [];
    const areaErrors: string[] = [];
    const ruleErrors: string[] = [];
    const finalValues: Values = { ...values };
    for (const s of definition.sections)
      for (const f of s.fields) {
        // Campos ocultos por gatilho não são exigidos (req. 37).
        if (!isVisible(f, values)) continue;
        // Fórmulas são recalculadas e persistidas no envio (req. 38).
        if (f.type === 'formula') {
          finalValues[f.key] = evalFormula(f.formula ?? '', values);
          continue;
        }
        if (f.required && !f.readonly) {
          const v = values[f.key];
          if (v === undefined || v === '' || v === null) missing.push(f.label);
        }
        // Regras de máx/mín caracteres e caracteres proibidos (req. 40).
        const sv = values[f.key];
        if (typeof sv === 'string' && sv !== '' && !f.readonly) {
          if (f.maxLength && sv.length > f.maxLength) ruleErrors.push(`"${f.label}" excede ${f.maxLength} caracteres.`);
          if (f.minLength && sv.length < f.minLength) ruleErrors.push(`"${f.label}" tem menos de ${f.minLength} caracteres.`);
          if (f.forbiddenChars) {
            const bad = [...new Set([...f.forbiddenChars])].filter((c) => sv.includes(c));
            if (bad.length) ruleErrors.push(`"${f.label}" contém caracteres não permitidos: ${bad.join(' ')}`);
          }
        }
        // Cruzamento entre campos (req. 35).
        if (f.crossCheck?.field) {
          const eq = String(values[f.key] ?? '') === String(values[f.crossCheck.field] ?? '');
          const okCross = f.crossCheck.op === 'notEquals' ? !eq : eq;
          if (!okCross) ruleErrors.push(f.crossCheck.message || `"${f.label}" não confere com o campo relacionado.`);
        }
        // Validação por quadro de área: cada linha precisa de descrição e área > 0 (req. 62).
        if (f.type === 'arealist' && Array.isArray(values[f.key])) {
          for (const row of values[f.key] as any[]) {
            if (!row?.descricao || !(Number(row?.area) > 0)) {
              areaErrors.push(f.label);
              break;
            }
          }
        }
      }
    if (missing.length) {
      alert('Preencha os campos obrigatórios:\n' + missing.join('\n'));
      return;
    }
    if (areaErrors.length) {
      alert('Corrija os quadros de área (descrição e área > 0 em cada linha):\n' + areaErrors.join('\n'));
      return;
    }
    if (ruleErrors.length) {
      alert('Corrija as regras de preenchimento:\n' + ruleErrors.join('\n'));
      return;
    }
    const svcErr = Object.entries(fieldErrors).find(([, v]) => v);
    if (svcErr) {
      alert('Corrija a validação do campo: ' + svcErr[1]);
      return;
    }
    onSubmit(finalValues);
  }

  return (
    <div>
      {definition.sections.map((s) => (
        <div key={s.title}>
          <div className="section-title">{s.title}</div>
          <div className="row">{s.fields.map(renderField)}</div>
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <button onClick={handleSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}

// Quadro de áreas (req. 57-58): várias edificações/glebas, com busca (req. 59),
// validação por linha (req. 62), unidade/gleba + total (req. 57) e geo por quadro (req. 65).
function AreaList({ value, onChange, geo }: { value: any[]; onChange: (v: any[]) => void; geo?: boolean }) {
  const [q, setQ] = useState('');
  const add = () => onChange([...value, { descricao: '', area: '' }]);
  const upd = (i: number, k: string, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [k]: v };
    onChange(copy);
  };
  const rem = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const ql = q.trim().toLowerCase();
  const total = value.reduce((acc, r) => acc + (Number(r.area) || 0), 0);
  return (
    <div>
      {value.length >= 2 && (
        <input placeholder="🔎 Buscar quadro por descrição..." value={q}
          onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
      )}
      {value.map((row, i) => {
        if (ql && !String(row.descricao ?? '').toLowerCase().includes(ql)) return null;
        const invalid = !row.descricao || !(Number(row.area) > 0);
        return (
          <div key={i} style={{ marginBottom: 10, borderBottom: '1px dashed #e4e8ec', paddingBottom: 8 }}>
            <div className="row">
              <input placeholder="Descrição (ex.: Bloco A)" style={{ flex: 2 }}
                value={row.descricao} onChange={(e) => upd(i, 'descricao', e.target.value)} />
              <input placeholder="Unidade/Gleba" style={{ flex: 1 }}
                value={row.unidade ?? ''} onChange={(e) => upd(i, 'unidade', e.target.value)} />
              <input placeholder="Área (m²)" type="number"
                style={{ flex: 1, borderColor: invalid ? '#b42318' : undefined }}
                value={row.area} onChange={(e) => upd(i, 'area', e.target.value)} />
              <button type="button" className="danger" onClick={() => rem(i)}>×</button>
            </div>
            {geo && (
              <div className="row" style={{ marginTop: 4 }}>
                <input placeholder="Latitude" style={{ flex: 1 }}
                  value={row.lat ?? ''} onChange={(e) => upd(i, 'lat', e.target.value)} />
                <input placeholder="Longitude" style={{ flex: 1 }}
                  value={row.lng ?? ''} onChange={(e) => upd(i, 'lng', e.target.value)} />
              </div>
            )}
            {/* Texto formatado por quadro: negrito, itálico e listas (req. 64). */}
            <RichText html={row.obs ?? ''} onChange={(h) => upd(i, 'obs', h)} />
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <button type="button" className="secondary" onClick={add}>+ Adicionar quadro de área</button>
        {value.length > 0 && <strong>Área total: {total.toLocaleString('pt-BR')} m²</strong>}
      </div>
    </div>
  );
}

// Grupo de campos repetível genérico (req. 39).
function Repeater({ value, subfields, onChange }: { value: any[]; subfields: { key: string; label: string; type: string }[]; onChange: (v: any[]) => void }) {
  const add = () => onChange([...value, {}]);
  const upd = (i: number, k: string, v: any) => {
    const copy = [...value]; copy[i] = { ...copy[i], [k]: v }; onChange(copy);
  };
  const rem = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  if (!subfields.length) return <p className="help">Configure os subcampos deste grupo repetível no editor.</p>;
  return (
    <div>
      {value.map((row, i) => (
        <div className="row" key={i} style={{ marginBottom: 6, alignItems: 'flex-end' }}>
          {subfields.map((sf) => (
            <div key={sf.key} style={{ flex: 1 }}>
              <label style={{ fontSize: 12 }}>{sf.label}</label>
              <input type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                value={row[sf.key] ?? ''} onChange={(e) => upd(i, sf.key, e.target.value)} />
            </div>
          ))}
          <button type="button" className="danger" onClick={() => rem(i)}>×</button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={add}>+ Adicionar item</button>
    </div>
  );
}

// Editor de texto formatado (negrito, itálico, listas) por quadro de área (req. 64).
function RichText({ html, onChange }: { html: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (html ?? '')) ref.current.innerHTML = html ?? '';
    // Inicializa apenas uma vez; edições posteriores vêm do próprio contentEditable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const emit = () => ref.current && onChange(ref.current.innerHTML);
  const cmd = (c: string) => { document.execCommand(c, false); emit(); };
  const btn: React.CSSProperties = { padding: '2px 8px', fontSize: 12, width: 'auto' };
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
        <button type="button" className="secondary" style={btn} title="Negrito"
          onMouseDown={(e) => { e.preventDefault(); cmd('bold'); }}><b>N</b></button>
        <button type="button" className="secondary" style={btn} title="Itálico"
          onMouseDown={(e) => { e.preventDefault(); cmd('italic'); }}><i>I</i></button>
        <button type="button" className="secondary" style={btn} title="Lista"
          onMouseDown={(e) => { e.preventDefault(); cmd('insertUnorderedList'); }}>• Lista</button>
        <span className="help" style={{ alignSelf: 'center' }}>Observações do quadro (texto formatado)</span>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit}
        style={{ border: '1px solid #d8dee4', borderRadius: 6, minHeight: 38, padding: '6px 8px', background: '#fff', fontSize: 14 }} />
    </div>
  );
}
