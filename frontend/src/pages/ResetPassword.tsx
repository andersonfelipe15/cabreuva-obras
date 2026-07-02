import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

// Tela de redefinição de senha, acessada pelo link do e-mail (item 5 do checklist).
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw !== pw2) { setError('As senhas não conferem.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: pw });
      setOk(true);
      setTimeout(() => nav('/login'), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h1>Redefinir senha</h1>
        {!token && <div className="error">Link inválido: token ausente. Solicite um novo em "Esqueci minha senha".</div>}
        {ok ? (
          <div className="card" style={{ borderColor: '#16a34a' }}>
            Senha redefinida com sucesso! Redirecionando para o login... <Link to="/login">Entrar agora</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>Nova senha</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <label>Confirmar nova senha</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <p className="help">Mín. 8 caracteres, com maiúscula, minúscula e número.</p>
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button disabled={loading || !token || !pw}>{loading ? 'Salvando...' : 'Redefinir senha'}</button>
              <Link to="/login">Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
