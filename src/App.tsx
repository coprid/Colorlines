import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const G = 9;          // grid size
const LINE = 5;       // balls needed in a line
const SPAWN = 3;      // balls added per turn
const INIT = 5;       // initial balls on board

const PALETTE = [
  { h: '#ef4444', l: '#fecaca', d: '#7f1d1d', name: 'Red' },
  { h: '#3b82f6', l: '#bfdbfe', d: '#1e3a8a', name: 'Blue' },
  { h: '#22c55e', l: '#bbf7d0', d: '#14532d', name: 'Green' },
  { h: '#facc15', l: '#fef08a', d: '#713f12', name: 'Желтый' },
  { h: '#ec4899', l: '#fbcfe8', d: '#831843', name: 'Pink' },
  { h: '#06b6d4', l: '#a5f3fc', d: '#164e63', name: 'Cyan' },
  { h: '#f97316', l: '#fed7aa', d: '#7c2d12', name: 'Orange' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Cell = number | null;
type Grid = Cell[][];
type Pos = [number, number];
type NextBall = { pos: Pos; color: number };

// ── Pure helpers ──────────────────────────────────────────────────────────────
const key = (r: number, c: number) => `${r},${c}`;
const parseKey = (k: string): Pos => k.split(',').map(Number) as Pos;
const rndColor = () => Math.floor(Math.random() * PALETTE.length);

function emptyGrid(): Grid {
  return Array.from({ length: G }, () => Array<Cell>(G).fill(null));
}

function emptyPositions(grid: Grid): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < G; r++)
    for (let c = 0; c < G; c++)
      if (grid[r][c] === null) out.push([r, c]);
  return out;
}

function bfs(grid: Grid, from: Pos, to: Pos): boolean {
  const [fr, fc] = from, [tr, tc] = to;
  if (grid[tr][tc] !== null) return false;
  if (fr === tr && fc === tc) return true;
  const vis = Array.from({ length: G }, () => Array(G).fill(false));
  vis[fr][fc] = true;
  const q: Pos[] = [from];
  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === tr && c === tc) return true;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < G && nc >= 0 && nc < G && !vis[nr][nc] && grid[nr][nc] === null) {
        vis[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
  }
  return false;
}

function findLines(grid: Grid, r: number, c: number): Set<string> {
  const color = grid[r][c];
  if (color === null) return new Set();
  const found = new Set<string>();
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const seg: Pos[] = [[r, c]];
    for (const s of [1, -1]) {
      let nr = r + s * dr, nc = c + s * dc;
      while (nr >= 0 && nr < G && nc >= 0 && nc < G && grid[nr][nc] === color) {
        seg.push([nr, nc]);
        nr += s * dr; nc += s * dc;
      }
    }
    if (seg.length >= LINE) seg.forEach(([sr, sc]) => found.add(key(sr, sc)));
  }
  return found;
}

function scoreFor(n: number): number {
  return n < LINE ? 0 : 10 + (n - LINE) * 6;
}

function makeNextBalls(grid: Grid): NextBall[] {
  const empty = [...emptyPositions(grid)].sort(() => Math.random() - 0.5);
  return empty.slice(0, Math.min(SPAWN, empty.length)).map(pos => ({ pos, color: rndColor() }));
}

function aiHint(grid: Grid): { from: Pos; to: Pos } | null {
  let best: { from: Pos; to: Pos; score: number } | null = null;
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      if (grid[r][c] === null) continue;
      for (let tr = 0; tr < G; tr++) {
        for (let tc = 0; tc < G; tc++) {
          if (grid[tr][tc] !== null) continue;
          if (!bfs(grid, [r, c], [tr, tc])) continue;
          const t = grid.map(row => [...row]);
          t[tr][tc] = t[r][c];
          t[r][c] = null;
          const rm = findLines(t, tr, tc);
          if (rm.size >= LINE && (!best || rm.size > best.score)) {
            best = { from: [r, c], to: [tr, tc], score: rm.size };
          }
        }
      }
    }
  }
  return best;
}

// ── Ball renderer ─────────────────────────────────────────────────────────────
function BallEl({
  colorIdx, size, selected, anim,
}: {
  colorIdx: number; size: number; selected?: boolean; anim?: 'pop-in' | 'pop-out' | 'pulse';
}) {
  const p = PALETTE[colorIdx];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 33% 28%, ${p.l} 0%, ${p.h} 48%, ${p.d} 100%)`,
        boxShadow: selected
          ? `0 0 0 3px ${p.h}88, 0 0 24px ${p.h}cc, 0 6px 14px rgba(0,0,0,0.7), inset 0 -4px 8px ${p.d}cc`
          : `0 5px 14px rgba(0,0,0,0.6), inset 0 -4px 8px ${p.d}bb, inset 0 3px 6px ${p.l}44`,
        animation:
          anim === 'pop-in' ? 'ball-pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' :
          anim === 'pop-out' ? 'ball-pop-out 0.38s ease-in forwards' :
          anim === 'pulse' ? 'ball-pulse 0.9s ease-in-out infinite' : undefined,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Specular highlight */}
      <div style={{
        position: 'absolute', top: '14%', left: '18%',
        width: '28%', height: '22%', borderRadius: '50%',
        background: 'rgba(255,255,255,0.45)',
        filter: 'blur(2px)',
        transform: 'rotate(-30deg)',
      }} />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [sel, setSel] = useState<Pos | null>(null);
  const [next, setNext] = useState<NextBall[]>([]);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(() => Number(localStorage.getItem('chromaline_hi') || 0));
  const [over, setOver] = useState(false);
  const [hint, setHint] = useState<{ from: Pos; to: Pos } | null>(null);
  const [hintSearched, setHintSearched] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Set<string>>(new Set());  // pop-out anim
  const [pop, setPop] = useState<Set<string>>(new Set());       // pop-in anim

  // Capture next in a ref so async timeouts always read latest value
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  // ── High score persistence ──
  useEffect(() => { localStorage.setItem('chromaline_hi', String(hi)); }, [hi]);

  // ── Score helper ──
  const addScore = useCallback((pts: number) => {
    setScore(s => {
      const ns = s + pts;
      setHi(h => Math.max(h, ns));
      return ns;
    });
  }, []);

  // ── New game ──
  const newGame = useCallback(() => {
    const g = emptyGrid();
    const empty = [...emptyPositions(g)].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(INIT, empty.length); i++)
      g[empty[i][0]][empty[i][1]] = rndColor();
    const n = makeNextBalls(g);
    setGrid(g);
    setNext(n);
    setScore(0);
    setOver(false);
    setSel(null);
    setHint(null);
    setHintSearched(false);
    setFlash(new Set());
    setPop(new Set());
    setBusy(false);
  }, []);

  useEffect(() => { newGame(); }, [newGame]);

  // ── Cell click ──
  const onCell = useCallback((r: number, c: number) => {
    if (over || busy) return;
    const cell = grid[r][c];

    if (cell !== null) {
      setSel(p => (p && p[0] === r && p[1] === c) ? null : [r, c]);
      setHint(null);
      setHintSearched(false);
      return;
    }

    if (sel === null) return;
    if (!bfs(grid, sel, [r, c])) { setSel(null); return; }

    setBusy(true);
    setSel(null);
    setHint(null);
    setHintSearched(false);

    const color = grid[sel[0]][sel[1]]!;
    const g2 = grid.map(row => [...row]);
    g2[sel[0]][sel[1]] = null;
    g2[r][c] = color;

    const removed = findLines(g2, r, c);
    setGrid(g2);
    setPop(new Set([key(r, c)]));

    if (removed.size > 0) {
      const pts = scoreFor(removed.size);
      setTimeout(() => {
        setPop(new Set());
        setFlash(removed);
        setTimeout(() => {
          const g3 = g2.map(row => [...row]);
          removed.forEach(k => { const [kr, kc] = parseKey(k); g3[kr][kc] = null; });
          setGrid(g3);
          setFlash(new Set());
          addScore(pts);
          setBusy(false);
        }, 420);
      }, 300);
    } else {
      setTimeout(() => {
        setPop(new Set());
        const g3 = g2.map(row => [...row]);
        const appeared = new Set<string>();
        const curNext = nextRef.current;

        curNext.forEach(({ pos: [nr, nc], color: nc2 }) => {
          if (g3[nr][nc] === null) { g3[nr][nc] = nc2; appeared.add(key(nr, nc)); }
        });

        let bonus = 0;
        const newBallRm = new Set<string>();
        appeared.forEach(k => {
          const [kr, kc] = parseKey(k);
          if (g3[kr][kc] === null) return;
          const rm = findLines(g3, kr, kc);
          if (rm.size >= LINE) { bonus += scoreFor(rm.size); rm.forEach(rk => newBallRm.add(rk)); }
        });
        newBallRm.forEach(k => { const [kr, kc] = parseKey(k); g3[kr][kc] = null; appeared.delete(k); });

        const emp = emptyPositions(g3);
        const nn = makeNextBalls(g3);
        setGrid(g3);
        setNext(nn);
        setPop(appeared);
        if (bonus > 0) addScore(bonus);
        if (emp.length === 0) { setOver(true); setBusy(false); return; }
        setTimeout(() => { setPop(new Set()); setBusy(false); }, 420);
      }, 280);
    }
  }, [grid, sel, over, busy, addScore]);

  // ── AI Hint ──
  const requestHint = useCallback(() => {
    if (busy || hintLoading || over) return;
    setHintLoading(true);
    setHintSearched(false);
    setTimeout(() => {
      const h = aiHint(grid);
      setHint(h);
      setHintSearched(true);
      setHintLoading(false);
      if (h) setSel(h.from);
    }, 30);
  }, [grid, busy, hintLoading, over]);

  // ── Derived cell states ──
  const isFlash = (r: number, c: number) => flash.has(key(r, c));
  const isPop = (r: number, c: number) => pop.has(key(r, c));
  const isSel = (r: number, c: number) => !!sel && sel[0] === r && sel[1] === c;
  const isHintFrom = (r: number, c: number) => !!hint && hint.from[0] === r && hint.from[1] === c;
  const isHintTo = (r: number, c: number) => !!hint && hint.to[0] === r && hint.to[1] === c;
  const nextGhost = (r: number, c: number) => next.find(b => b.pos[0] === r && b.pos[1] === c);

  const CELL = 56;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, #0f2040 0%, #050d1a 60%, #0a0a12 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '16px', fontFamily: "'Inter', system-ui, sans-serif",
      userSelect: 'none',
    }}>
      <style>{`
        @keyframes ball-pop-in {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.22) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ball-pop-out {
          0%   { transform: scale(1); opacity: 1; filter: brightness(1); }
          40%  { transform: scale(1.3); opacity: 0.9; filter: brightness(2); }
          100% { transform: scale(0); opacity: 0; filter: brightness(3); }
        }
        @keyframes ball-pulse {
          0%,100% { transform: scale(1); filter: brightness(1.1); }
          50%      { transform: scale(1.14); filter: brightness(1.6); }
        }
        @keyframes hint-glow {
          0%,100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes title-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes score-bump {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.15); }
        }
        @keyframes grid-glow {
          0%,100% { box-shadow: 0 0 40px #0d2d5522, 0 25px 60px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 60px #1a4a8833, 0 25px 60px rgba(0,0,0,0.7); }
        }
        .cell-hover:hover { background: #1e3a5f44 !important; }
        button:hover:not(:disabled) { filter: brightness(1.2); transform: translateY(-1px); }
        button { transition: all 0.18s; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 900,
          letterSpacing: '-0.03em', margin: 0,
          background: 'linear-gradient(90deg, #38bdf8, #818cf8 25%, #f472b6 50%, #fb923c 75%, #38bdf8)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'title-shimmer 4s linear infinite',
        }}>
          CHROMALINE
        </h1>
        <p style={{ color: '#3b5278', fontSize: '0.68rem', letterSpacing: '0.35em', margin: '5px 0 0', textTransform: 'uppercase' }}>
          Color Lines 3D · AI
        </p>
      </div>

      {/* Score bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[{ label: 'SCORE', val: score, accent: '#38bdf8' }, { label: 'BEST', val: hi, accent: '#f59e0b' }].map(({ label, val, accent }) => (
          <div key={label} style={{
            background: 'linear-gradient(145deg, #0d1f36, #091829)',
            border: `1px solid ${accent}22`,
            borderRadius: 14, padding: '12px 22px', textAlign: 'center', minWidth: 108,
            boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 ${accent}11`,
          }}>
            <div style={{ color: '#2d4a68', fontSize: '0.62rem', letterSpacing: '0.25em', marginBottom: 3 }}>{label}</div>
            <div style={{ color: accent, fontSize: '1.7rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Next balls preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, height: 34 }}>
        <span style={{ color: '#2d4a68', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Next</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {next.map((b, i) => (
            <BallEl key={i} colorIdx={b.color} size={24} />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${G}, ${CELL}px)`,
        gap: 3,
        background: 'linear-gradient(145deg, #07121f, #050e1a)',
        borderRadius: 18,
        padding: 10,
        border: '1px solid #0d2240',
        animation: 'grid-glow 4s ease-in-out infinite',
      }}>
        {Array.from({ length: G }, (_, r) =>
          Array.from({ length: G }, (_, c) => {
            const cell = grid[r][c];
            const k = key(r, c);
            const selected = isSel(r, c);
            const flashing = isFlash(r, c);
            const popping = isPop(r, c);
            const ghost = !cell ? nextGhost(r, c) : null;
            const hFrom = isHintFrom(r, c);
            const hTo = isHintTo(r, c);

            const baseBg = (r + c) % 2 === 0 ? '#07111e' : '#050c16';
            const bg = flashing ? '#ef444428' : hFrom ? '#f59e0b18' : hTo ? '#22c55e18' : baseBg;

            return (
              <div
                key={k}
                className="cell-hover"
                onClick={() => onCell(r, c)}
                style={{
                  width: CELL, height: CELL,
                  background: bg,
                  borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: cell !== null ? 'pointer' : sel !== null ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'all 0.22s ease-in-out',
                  
                 // НАСТРОЙКА НЕОНОВОЙ РЕШЕТКИ ПОЛЯ:
                  border: selected
                    ? `2px solid ${PALETTE[cell!].h}88`
                    : hFrom ? '2px solid #f59e0b66'
                    : hTo ? '2px solid #22c55e66'
                    : '1px solid rgba(6, 182, 212, 0.25)',
                  
                  // Легкое внутреннее неоновое свечение
                  boxShadow: selected 
                    ? `inset 0 0 12px ${PALETTE[cell!].h}33` 
                    : 'inset 0 0 4px rgba(6, 182, 212, 0.08)',
                }}
              >
            
                {/* Ghost preview of next ball */}
                {ghost && !cell && (
                  <div style={{ opacity: 0.35, pointerEvents: 'none' }}>
                    <BallEl colorIdx={ghost.color} size={CELL * 0.52} />
                  </div>
                )}

                {/* Actual ball */}
                {cell !== null && (
                  <BallEl
                    colorIdx={cell}
                    size={CELL * 0.76}
                    selected={selected}
                    anim={flashing ? 'pop-out' : popping ? 'pop-in' : selected ? 'pulse' : undefined}
                  />
                )}

                {/* Hint target dot */}
                {hTo && !cell && (
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#22c55e', opacity: 0.8,
                    boxShadow: '0 0 10px #22c55e',
                    animation: 'hint-glow 1.1s ease-in-out infinite',
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginTop: 22, alignItems: 'center' }}>
        <button
          onClick={requestHint}
          disabled={busy || hintLoading || over}
          style={{
            background: hintLoading
              ? 'linear-gradient(135deg, #0d1f36, #0d1f36)'
              : 'linear-gradient(135deg, #0d2d55, #1a3a6e)',
            border: '1px solid #2563eb44',
            borderRadius: 11, color: '#60a5fa',
            padding: '10px 22px', cursor: busy || hintLoading || over ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em',
            opacity: busy || hintLoading || over ? 0.45 : 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          {hintLoading ? '· · ·' : hint ? 'New Hint' : '✦ AI Hint'}
        </button>

        <button
          onClick={newGame}
          style={{
            background: 'linear-gradient(135deg, #111827, #1f2937)',
            border: '1px solid #374151',
            borderRadius: 11, color: '#6b7280',
            padding: '10px 22px', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          New Game
        </button>
      </div>

      {/* Hint status */}
      <div style={{ marginTop: 12, height: 22, display: 'flex', alignItems: 'center' }}>
        {hint && (
          <p style={{ color: '#374d6a', fontSize: '0.72rem', margin: 0, textAlign: 'center' }}>
            Move <span style={{ color: '#f59e0b99' }}>amber</span> ball → <span style={{ color: '#22c55e99' }}>green</span> target to score
          </p>
        )}
        {hintSearched && !hint && (
          <p style={{ color: '#1e3a5f', fontSize: '0.7rem', margin: 0 }}>
            No immediate clearing move found
          </p>
        )}
      </div>

      {/* How to play */}
      <div style={{
        marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {[
          { icon: '◉', text: 'Click ball to select' },
          { icon: '⊕', text: 'Click empty cell to move' },
          { icon: '✦', text: 'Line 5+ to score' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1e3a5f', fontSize: '0.68rem' }}>
            <span style={{ color: '#2d5280' }}>{icon}</span>
            {text}
          </div>
        ))}
      </div>

      {/* Game Over overlay */}
      {over && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,13,26,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #0d1f36, #070f1c)',
            border: '1px solid #1e3a5f',
            borderRadius: 24, padding: '44px 40px', textAlign: 'center',
            maxWidth: 340, width: '90%',
            boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 60px #0d2d5533',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
              {PALETTE.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 30%, ${p.l}, ${p.h} 55%, ${p.d})`,
                  boxShadow: `0 0 8px ${p.h}88`,
                }} />
              ))}
            </div>
            <h2 style={{ color: '#e2e8f0', fontSize: '1.7rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Game Over
            </h2>
            <p style={{ color: '#2d4a68', fontSize: '0.85rem', margin: '0 0 24px' }}>
              The grid is full!
            </p>
            <div style={{
              background: '#050d1a', borderRadius: 12, padding: '18px 24px', marginBottom: 28,
              border: '1px solid #0d2240',
            }}>
              <div style={{ color: '#1e3a5f', fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: 6 }}>
                FINAL SCORE
              </div>
              <div style={{ color: '#38bdf8', fontSize: '2.4rem', fontWeight: 900, lineHeight: 1 }}>
                {score}
              </div>
              {score > 0 && score >= hi && (
                <div style={{
                  color: '#22c55e', fontSize: '0.78rem', marginTop: 8, fontWeight: 700,
                  letterSpacing: '0.1em',
                }}>
                  ✦ NEW BEST
                </div>
              )}
            </div>
            <button
              onClick={newGame}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)',
                border: 'none', borderRadius: 12, color: '#fff',
                padding: '13px 0', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 800,
                letterSpacing: '0.08em', width: '100%',
                boxShadow: '0 4px 20px #2563eb66',
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
