import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

// Regras da senha forte (req. 3) — espelham o backend (assertStrongPassword).
const PW_RULES: { label: string; ok: (p: string) => boolean }[] = [
  { label: 'no mínimo 8 caracteres', ok: (p) => p.length >= 8 },
  { label: 'uma letra minúscula', ok: (p) => /[a-z]/.test(p) },
  { label: 'uma letra maiúscula', ok: (p) => /[A-Z]/.test(p) },
  { label: 'um número', ok: (p) => /[0-9]/.test(p) },
  { label: 'um caractere especial (ex.: @ # ! $)', ok: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Aceite de convite: cria a senha e ativa o cadastro (req. 22-25).
export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pwUnmet = PW_RULES.filter((r) => !r.ok(password));
  const canSubmit = token && pwUnmet.length === 0 && password === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) { setError('Link inválido: token ausente.'); return; }
    if (pwUnmet.length) { setError('Senha fraca — ela deve ter ' + pwUnmet.map((r) => r.label).join(', ') + '.'); return; }
    if (password !== confirm) { setError('As senhas não conferem.'); return; }
    setLoading(true);
    try {
      await api.post('/invitations/accept', { token, password });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card">
        <h1>Ativar cadastro</h1>
        {done ? (
          <div className="card" style={{ borderColor: '#16a34a' }}>
            <p>✅ Cadastro ativado! Sua senha foi criada.</p>
            <Link to="/login">Entrar agora</Link>
          </div>
        ) : !token ? (
          <div className="error">Link inválido: token ausente. Solicite um novo convite ao administrador.</div>
        ) : (
          <form onSubmit={submit}>
            <p className="help" style={{ marginTop: 0 }}>Você foi convidado(a) a acessar o sistema. Crie sua senha para ativar o cadastro.</p>
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, listStyle: 'none' }}>
              {PW_RULES.map((r) => {
                const ok = r.ok(password);
                return (
                  <li key={r.label} style={{ color: !password ? '#6b7280' : ok ? '#16a34a' : '#b42318' }}>
                    {(!password ? '•' : ok ? '✓' : '✗') + ' ' + r.label}
                  </li>
                );
              })}
            </ul>
            <label style={{ marginTop: 8 }}>Confirmar senha</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              style={confirm && confirm !== password ? { borderColor: '#b42318' } : undefined} />
            {confirm && confirm !== password && <p className="help" style={{ color: '#b42318', marginTop: 2 }}>As senhas não conferem.</p>}
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            <div style={{ marginTop: 14 }}>
              <button disabled={loading || !canSubmit}>{loading ? 'Ativando...' : 'Criar senha e ativar'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
