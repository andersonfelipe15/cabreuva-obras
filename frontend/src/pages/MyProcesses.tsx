import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Proc {
  id: string;
  number: string;
  status: string;
  processType: { name: string };
  documents: { number: string; type: string; status: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  PROTOCOLED: 'Protocolado',
  IN_ANALYSIS: 'Em análise',
  RETURNED: 'Devolvido p/ correção',
  DEFERRED: 'Deferido',
  INDEFERRED: 'Indeferido',
  ARCHIVED: 'Arquivado',
};

export function MyProcesses() {
  const [procs, setProcs] = useState<Proc[]>([]);

  useEffect(() => {
    api.get<Proc[]>('/processes/mine').then(setProcs);
  }, []);

  return (
    <div>
      <h1>Meus Processos</h1>
      <div className="card">
        <table>
          <thead>
            <tr><th>Número</th><th>Assunto</th><th>Status</th><th>Documentos</th><th></th></tr>
          </thead>
          <tbody>
            {procs.map((p) => (
              <tr key={p.id}>
                <td>{p.number}</td>
                <td>{p.processType.name}</td>
                <td><span className={`badge ${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span></td>
                <td>{p.documents.map((d) => d.number).join(', ') || '—'}</td>
                <td><Link to={`/process/${p.id}`}>Abrir</Link></td>
              </tr>
            ))}
            {procs.length === 0 && <tr><td colSpan={5} className="help">Nenhum processo ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
