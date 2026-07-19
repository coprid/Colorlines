import { BallEl, useChromaline, PALETTE } from './useChromaline';

const CELL = 56;
const G = 9;

// Простая функция-помощник для генерации строковых ключей ячеек
const key = (r: number, c: number) => `${r},${c}`;

export default function App() {
  // Подключаем наш новый "капот" — забираем все состояния и функции из хука!
  const {
    grid,
    sel,
    next,
    score,
    hi,
    over,
    hint,
    hintSearched,
    hintLoading,
    busy,
    flash,
    pop,
    trail,
    onCell,
    newGame,
    requestHint,
    undo,       // <-- Добавили функцию отмены хода
    canUndo     // <-- Добавили проверку доступности истории
  } = useChromaline();

  const isFlash = (r: number, c: number) => flash.has(key(r, c));
  const isPop = (r: number, c: number) => pop.has(key(r, c));
  const isSel = (r: number, c: number) => !!sel && sel[0] === r && sel[1] === c;
  const isHintFrom = (r: number, c: number) => !!hint && hint.from[0] === r && hint.from[1] === c;
  const isHintTo = (r: number, c: number) => !!hint && hint.to[0] === r && hint.to[1] === c;
  const nextGhost = (r: number, c: number) => next.find(b => b.pos[0] === r && b.pos[1] === c);

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
        @keyframes ball-trail {
          0% { transform: scale(0.8); opacity: 0.5; filter: blur(0.5px); }
          100% { transform: scale(0.2); opacity: 0; filter: blur(2px); }
        }
        @keyframes hint-glow {
          0%,100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes title-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes grid-glow {
          0%,100% { box-shadow: 0 0 40px #0d2d5522, 0 25px 60px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 60px #1a4a8833, 0 25px 60px rgba(0,0,0,0.7); }
        }
        .cell-hover:hover { background: #1e3a5f44 !important; }
        .ball-trail {
          animation: ball-trail 0.4s ease-out forwards;
          pointer-events: none;
        }
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
            const trailItem = trail.find(t => t.pos[0] === r && t.pos[1] === c);
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
                  border: selected
                    ? `2px solid ${PALETTE[cell!].h}88`
                    : hFrom ? '2px solid #f59e0b66'
                    : hTo ? '2px solid #22c55e66'
                    : '1px solid rgba(6, 182, 212, 0.25)',
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

                {/* Trail ghost */}
                {trailItem && (
                  <div className="ball-trail" style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}>
                    <BallEl colorIdx={trailItem.colorIdx} size={CELL * 0.65} anim="trail" />
                  </div>
                )}

                {/* Actual ball */}
                {cell !== null && (
                  <BallEl
                    colorIdx={cell}
                    size={CELL * 0.88}
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
      <div style={{ display: 'flex', gap: 12, marginTop: 22, alignItems: 'center', justifyContent: 'center' }}>
        {/* Кнопка AI Hint */}
        <button
          onClick={requestHint}
          disabled={busy || hintLoading || over}
          style={{
            background: hintLoading
              ? 'linear-gradient(135deg, #0d1f36, #0d1f36)'
              : (busy || hintLoading || over) 
                ? 'linear-gradient(135deg, #111827, #1f2937)' 
                : 'linear-gradient(135deg, #0d2d55, #1a3a6e)',
            border: (busy || hintLoading || over) ? '1px solid #374151' : '1px solid #2563eb44',
            borderRadius: 11, 
            color: (busy || hintLoading || over) ? '#6b7280' : '#60a5fa',
            padding: '10px 22px', 
            cursor: (busy || hintLoading || over) ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em',
            opacity: (busy || hintLoading || over) ? 0.45 : 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          {hintLoading ? '· · ·' : hint ? 'New Hint' : '✦ AI Hint'}
        </button>

        {/* Кнопка Undo — теперь в обычном состоянии точь-в-точь как AI Hint */}
        <button
          onClick={undo}
          disabled={busy || !canUndo}
          style={{
            background: (busy || !canUndo)
              ? 'linear-gradient(135deg, #111827, #1f2937)' // Тусклый стиль, если нельзя отменить
              : 'linear-gradient(135deg, #0d2d55, #1a3a6e)', // Яркий синий, если ход есть!
            border: (busy || !canUndo) ? '1px solid #374151' : '1px solid #2563eb44',
            borderRadius: 11,
            color: (busy || !canUndo) ? '#6b7280' : '#60a5fa',
            padding: '10px 22px',
            cursor: (busy || !canUndo) ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            opacity: (busy || !canUndo) ? 0.45 : 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          Undo
        </button>

        {/* Кнопка New Game — теперь ТОЖЕ яркая неоновая, а тускнеет только во время анимаций (busy) */}
        <button
          onClick={newGame}
          disabled={busy}
          style={{
            background: busy 
              ? 'linear-gradient(135deg, #111827, #1f2937)' 
              : 'linear-gradient(135deg, #0d2d55, #1a3a6e)',
            border: busy ? '1px solid #374151' : '1px solid #2563eb44',
            borderRadius: 11, 
            color: busy ? '#6b7280' : '#60a5fa',
            padding: '10px 22px', 
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem', 
            fontWeight: 700, 
            letterSpacing: '0.05em',
            opacity: busy ? 0.45 : 1,
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