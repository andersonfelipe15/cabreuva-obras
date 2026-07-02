import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

// Auto-cadastro de requerente externo (req. 2).
export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', document: '', email: '', phone: '', address: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(f);
      nav('/catalog');
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
        <form onSubmit={submit}>
          <label>Nome / Razão Social</label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} />
          <label>CPF / CNPJ</label>
          <input value={f.document} onChange={(e) => set('document', e.target.value)} />
          <label>E-mail</label>
          <input value={f.email} onChange={(e) => set('email', e.target.value)} />
          <div className="row">
            <div style={{ flex: 1 }}><label>Telefone</label><input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div style={{ flex: 2 }}><label>Endereço</label><input value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
          <label>Senha</label>
          <input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} />
          <p className="help">Mín. 8 caracteres, com maiúscula, minúscula e número.</p>
          {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button disabled={loading || !f.name || !f.document || !f.email || !f.password}>{loading ? 'Criando...' : 'Criar conta'}</button>
            <Link to="/login">Já tenho conta</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
