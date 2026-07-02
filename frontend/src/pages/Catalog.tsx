import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface ProcessType {
  id: string;
  name: string;
  description?: string;
  category: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  EDILICIO: 'Edilícios',
  USO_SOLO: 'Uso e Ocupação do Solo',
  AMBIENTAL: 'Ambiental',
  SERVICOS_GERAIS: 'Serviços Gerais',
};

export function Catalog() {
  const [types, setTypes] = useState<ProcessType[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get<ProcessType[]>('/process-types/catalog').then(setTypes).catch((e) => setError(e.message));
  }, []);

  // Busca por título do processo (req. 51).
  const filtered = q
    ? types.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    : types;
  const byCategory = filtered.reduce<Record<string, ProcessType[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <h1>Carta de Serviços</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <label>Buscar serviço por título</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: alvará, certidão, renovação..." />
      </div>
      {Object.entries(byCategory).map(([cat, list]) => (
        <div key={cat}>
          <div className="section-title">{CATEGORY_LABEL[cat] ?? cat}</div>
          {list.map((t) => (
            <div className="card" key={t.id}>
              <h2>{t.name}</h2>
              {t.description && <p className="help">{t.description}</p>}
              <Link to={`/protocol/${t.id}`}><button>Iniciar protocolo</button></Link>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
