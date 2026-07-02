import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getToken } from '../api';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

type Pt = { x: number; y: number }; // em coordenadas do PDF (escala 1)
type Tool = 'calibrate' | 'distance' | 'area' | 'pen' | 'comment' | 'pan';
type Annot =
  | { type: 'distance'; a: Pt; b: Pt; color: string }
  | { type: 'area'; pts: Pt[]; color: string }
  | { type: 'pen'; pts: Pt[]; color: string }
  | { type: 'comment'; p: Pt; text: string; n: number; color: string };

interface Calibration { unitsPerVp: number; unit: string; context: string }

export function PdfViewer() {
  const { fileId } = useParams();
  const nav = useNavigate();
  const mainRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);
  const drawing = useRef<Pt[] | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [tool, setTool] = useState<Tool>('distance');
  const [color, setColor] = useState('#dc2626');
  const [context, setContext] = useState('Situação');
  const [calib, setCalib] = useState<Calibration | null>(null);
  const [annots, setAnnots] = useState<Annot[]>([]);
  const [buffer, setBuffer] = useState<Pt[]>([]);
  const [error, setError] = useState('');

  // Carrega o PDF (fetch autenticado).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error('Não foi possível carregar o arquivo');
        const buf = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [fileId]);

  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const areaOf = (pts: Pt[]) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      s += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(s) / 2;
  };
  const fmtLen = (vp: number) =>
    calib ? `${(vp * calib.unitsPerVp).toFixed(2)} ${calib.unit}` : `${vp.toFixed(0)} px`;
  const fmtArea = (vp: number) =>
    calib ? `${(vp * calib.unitsPerVp ** 2).toFixed(2)} ${calib.unit}²` : `${vp.toFixed(0)} px²`;

  const redraw = useCallback(() => {
    const c = overlayRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const S = (p: Pt) => ({ x: p.x * scale, y: p.y * scale });

    const drawPoly = (pts: Pt[], col: string, close: boolean) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = S(p);
        i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
      });
      if (close) ctx.closePath();
      ctx.stroke();
    };
    const label = (p: Pt, text: string, col: string) => {
      const s = S(p);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x + 4, s.y - 14, ctx.measureText(text).width + 8, 16);
      ctx.fillStyle = col;
      ctx.font = '12px sans-serif';
      ctx.fillText(text, s.x + 8, s.y - 2);
    };

    for (const a of annots) {
      if (a.type === 'distance') {
        drawPoly([a.a, a.b], a.color, false);
        label({ x: (a.a.x + a.b.x) / 2, y: (a.a.y + a.b.y) / 2 }, fmtLen(dist(a.a, a.b)), a.color);
      } else if (a.type === 'area') {
        drawPoly(a.pts, a.color, true);
        const cx = a.pts.reduce((s, p) => s + p.x, 0) / a.pts.length;
        const cy = a.pts.reduce((s, p) => s + p.y, 0) / a.pts.length;
        label({ x: cx, y: cy }, fmtArea(areaOf(a.pts)), a.color);
      } else if (a.type === 'pen') {
        drawPoly(a.pts, a.color, false);
      } else if (a.type === 'comment') {
        const s = S(a.p);
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(a.n), s.x - 3, s.y + 4);
      }
    }
    // buffer em progresso
    if (buffer.length) drawPoly(buffer, color, tool === 'area');
  }, [annots, buffer, scale, color, tool, calib]);

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    if (!pdf || !mainRef.current) return;
    const pg = await pdf.getPage(page);
    const viewport = pg.getViewport({ scale });
    const main = mainRef.current;
    const overlay = overlayRef.current!;
    main.width = overlay.width = viewport.width;
    main.height = overlay.height = viewport.height;
    await pg.render({ canvasContext: main.getContext('2d')!, viewport }).promise;
    redraw();
  }, [page, scale, redraw]);

  useEffect(() => { renderPage(); }, [renderPage]);
  useEffect(() => { redraw(); }, [redraw]);

  // Converte evento → coordenadas do PDF (escala 1).
  const toPt = (e: React.MouseEvent): Pt => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  function onDown(e: React.MouseEvent) {
    const p = toPt(e);
    if (tool === 'pen') { drawing.current = [p]; return; }
    const buf = [...buffer, p];
    if (tool === 'calibrate' && buf.length === 2) {
      const real = Number(window.prompt(`Comprimento real do segmento (${context}), em metros:`));
      if (real > 0) setCalib({ unitsPerVp: real / dist(buf[0], buf[1]), unit: 'm', context });
      setBuffer([]);
      return;
    }
    if (tool === 'distance' && buf.length === 2) {
      setAnnots((a) => [...a, { type: 'distance', a: buf[0], b: buf[1], color }]);
      setBuffer([]);
      return;
    }
    if (tool === 'comment') {
      const text = window.prompt('Comentário referenciado:');
      if (text) setAnnots((a) => [...a, { type: 'comment', p, text, n: a.filter((x) => x.type === 'comment').length + 1, color }]);
      setBuffer([]);
      return;
    }
    setBuffer(buf);
  }
  function onMove(e: React.MouseEvent) {
    if (tool === 'pen' && drawing.current) {
      drawing.current.push(toPt(e));
      // feedback imediato
      setBuffer([...drawing.current]);
    }
  }
  function onUp() {
    if (tool === 'pen' && drawing.current) {
      if (drawing.current.length > 1) {
        setAnnots((a) => [...a, { type: 'pen', pts: drawing.current!, color }]);
      }
      drawing.current = null;
      setBuffer([]);
    }
  }
  function finishArea() {
    if (buffer.length >= 3) setAnnots((a) => [...a, { type: 'area', pts: buffer, color }]);
    setBuffer([]);
  }

  const comments = annots.filter((a) => a.type === 'comment') as Extract<Annot, { type: 'comment' }>[];

  return (
    <div>
      <div className="topbar">
        <strong>Visualizador de PDF · Medição</strong>
        <button className="secondary" onClick={() => nav(-1)}>Voltar</button>
      </div>
      <div className="container" style={{ maxWidth: 1100 }}>
        {error && <div className="error">{error}</div>}

        <div className="card" style={{ position: 'sticky', top: 0, zIndex: 5 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>◀</button>
            <span className="help">Pág. {page}/{numPages}</span>
            <button className="secondary" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>▶</button>
            <button className="secondary" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>−</button>
            <span className="help">{Math.round(scale * 100)}%</span>
            <button className="secondary" onClick={() => setScale((s) => s + 0.2)}>+</button>
            <span style={{ width: 12 }} />
            {(['calibrate', 'distance', 'area', 'pen', 'comment'] as Tool[]).map((t) => (
              <button key={t} className={tool === t ? '' : 'secondary'}
                style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setTool(t); setBuffer([]); }}>
                {{ calibrate: 'Calibrar', distance: 'Distância', area: 'Área', pen: 'Caneta', comment: 'Comentário', pan: 'Mover' }[t]}
              </button>
            ))}
            <select value={context} onChange={(e) => setContext(e.target.value)} style={{ width: 130 }}>
              <option>Situação</option><option>Planta Baixa</option><option>Cobertura</option>
            </select>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, padding: 0 }} />
            {tool === 'area' && <button style={{ padding: '4px 8px', fontSize: 12 }} onClick={finishArea}>Fechar área</button>}
            <button className="danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setAnnots([])}>Limpar</button>
          </div>
          <div className="help" style={{ marginTop: 6 }}>
            {calib ? `Escala calibrada (${calib.context}): 1 px ≈ ${calib.unitsPerVp.toFixed(4)} m` : 'Sem escala — use "Calibrar" clicando 2 pontos de medida conhecida.'}
          </div>
        </div>

        <div className="card" style={{ overflow: 'auto', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas ref={mainRef} style={{ display: 'block' }} />
            <canvas ref={overlayRef}
              style={{ position: 'absolute', left: 0, top: 0, cursor: 'crosshair' }}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} />
          </div>
        </div>

        {comments.length > 0 && (
          <div className="card">
            <h2>Comentários</h2>
            {comments.map((c) => (
              <div key={c.n}><strong>{c.n}.</strong> {c.text}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
