import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { maskCpfCnpj, validateCpfCnpj, onlyDigits, maskPhone, validatePhone } from '../cpfcnpj';

// Regras da senha forte (req. 3) — espelham o backend (assertStrongPassword).
const PW_RULES: { label: string; ok: (p: string) => boolean }[] = [
  { label: 'no mínimo 8 caracteres', ok: (p) => p.length >= 8 },
  { label: 'uma letra minúscula', ok: (p) => /[a-z]/.test(p) },
  { label: 'uma letra maiúscula', ok: (p) => /[A-Z]/.test(p) },
  { label: 'um número', ok: (p) => /[0-9]/.test(p) },
  { label: 'um caractere especial (ex.: @ # ! $)', ok: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Auto-cadastro de requerente externo (req. 2).
export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', document: '', email: '', phone: '', address: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  // Validações em tempo real (só exibem erro depois que o campo é preenchido).
  const docError = f.document ? validateCpfCnpj(f.document) : null;
  const phoneError = f.phone ? validatePhone(f.phone) : null;
  const emailError = f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ? 'Informe um e-mail válido.' : null;
  const pwUnmet = PW_RULES.filter((r) => !r.ok(f.password));
  const formValid = f.name.trim() && f.document && !docError && f.email && !emailError
    && f.phone && !phoneError && f.address.trim() && f.password && pwUnmet.length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // Validação clara de campos vazios/ inválidos (req. 2).
    if (!f.name.trim()) { setError('Informe o nome ou razão social.'); return; }
    const dErr = validateCpfCnpj(f.document);
    if (dErr) { setError(dErr); return; }
    if (!f.email.trim()) { setError('Informe o e-mail.'); return; }
    if (emailError) { setError(emailError); return; }
    const phErr = validatePhone(f.phone);
    if (phErr) { setError(phErr); return; }
    if (!f.address.trim()) { setError('Informe o endereço.'); return; }
    if (pwUnmet.length) { setError('Senha fraca — ela deve ter ' + pwUnmet.map((r) => r.label).join(', ') + '.'); return; }
    setLoading(true);
    try {
      // Envia documento e telefone só com dígitos (consistente com a base e o login por CPF).
      await register({ ...f, document: onlyDigits(f.document), phone: onlyDigits(f.phone) });
      setDone(true); // exige confirmação de e-mail antes do acesso (req. 3)
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card">
        <h1>Criar conta</h1>
        {done ? (
          <div className="card" style={{ borderColor: '#16a34a' }}>
            <p>✅ Cadastro recebido! Enviamos um <strong>link de ativação</strong> para <strong>{f.email}</strong>.</p>
            <p className="help">Confirme seu e-mail para liberar o acesso (o acesso só é autorizado após a confirmação). Não recebeu? Veja em Spam ou use "Reenviar link" na tela de login.</p>
            <Link to="/login">Ir para o login</Link>
          </div>
        ) : (
        <form onSubmit={submit}>
          <label>Nome / Razão Social</label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} />
          <label>CPF / CNPJ</label>
          <input
            value={f.document}
            inputMode="numeric"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            onChange={(e) => set('document', maskCpfCnpj(e.target.value))}
            style={docError ? { borderColor: '#b42318' } : undefined}
          />
          {docError && <p className="help" style={{ color: '#b42318', marginTop: 2 }}>{docError}</p>}
          <label>E-mail</label>
          <input value={f.email} type="email" onChange={(e) => set('email', e.target.value)}
            style={emailError ? { borderColor: '#b42318' } : undefined} />
          {emailError && <p className="help" style={{ color: '#b42318', marginTop: 2 }}>{emailError}</p>}
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Telefone</label>
              <input value={f.phone} inputMode="numeric" placeholder="(11) 99494-9898"
                onChange={(e) => set('phone', maskPhone(e.target.value))}
                style={phoneError ? { borderColor: '#b42318' } : undefined} />
              {phoneError && <p className="help" style={{ color: '#b42318', marginTop: 2 }}>{phoneError}</p>}
            </div>
            <div style={{ flex: 2 }}><label>Endereço</label><input value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
          <label>Senha</label>
          <input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} />
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, listStyle: 'none' }}>
            {PW_RULES.map((r) => {
              const ok = r.ok(f.password);
              return (
                <li key={r.label} style={{ color: !f.password ? '#6b7280' : ok ? '#16a34a' : '#b42318' }}>
                  {(!f.password ? '•' : ok ? '✓' : '✗') + ' ' + r.label}
                </li>
              );
            })}
          </ul>
          {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button disabled={loading || !formValid}>{loading ? 'Criando...' : 'Criar conta'}</button>
            <Link to="/login">Já tenho conta</Link>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
