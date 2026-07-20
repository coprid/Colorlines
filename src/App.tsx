import React, { useState, useEffect } from 'react';
import { BallEl, useChromaline, PALETTE } from './useChromaline';

const G = 9;

const key = (r: number, c: number) => `${r},${c}`;

export default function App() {
  const [soundOn, setSoundOn] = useState(() => {
    const saved = localStorage.getItem('chromaline_sound');
    return saved !== null ? saved === 'true' : true;
  });

  // ← НОВОЕ: динамический размер ячеек
  const [cellSize, setCellSize] = useState(56);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minDim = Math.min(width, height);

      // Мобильный: ширина < 600px ИЛИ высота < 700px (ландшафт)
      const mobile = width < 600 || height < 700;
      setIsMobile(mobile);

      if (mobile) {
        // Оставляем место для кнопок: ~180px сверху + ~100px снизу
        const availableSpace = minDim - 40; // padding 20 с каждой стороны
        // Минимум 32px, максимум 48px для ячейки
        const newCell = Math.max(32, Math.min(48, Math.floor(availableSpace / G)));
        setCellSize(newCell);
      } else {
        setCellSize(56);
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const {
    grid, sel, next, score, hi, over, hint, hintSearched, hintLoading, busy,
    flash, pop, trail, onCell, newGame, requestHint, undo, canUndo
  } = useChromaline(soundOn);

  const isFlash = (r: number, c: number) => flash.has(key(r, c));
  const isPop = (r: number, c: number) => pop.has(key(r, c));
  const isSel = (r: number, c: number) => !!sel && sel[0] === r && sel[1] === c;
  const isHintFrom = (r: number, c: number) => !!hint && hint.from[0] === r && hint.from[1] === c;
  const isHintTo = (r: number, c: number) => !!hint && hint.to[0] === r && hint.to[1] === c;
  const nextGhost = (r: number, c: number) => next.find(b => b.pos[0] === r && b.pos[1] === c);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('chromaline_sound', String(soundOn));
  }, [soundOn]);

  // Динамические стили
  const CELL = cellSize;
  const gap = isMobile ? 2 : 3;
  const gridPadding = isMobile ? 6 : 10;
  const gridBorderRadius = isMobile ? 12 : 18;
  const cellBorderRadius = isMobile ? 6 : 9;
  const titleMargin = isMobile ? 16 : 28;
  const scoreGap = isMobile ? 6 : 12;
  const scoreMargin = isMobile ? 12 : 20;
  const scorePadding = isMobile ? '8px 14px' : '12px 22px';
  const scoreMinWidth = isMobile ? 70 : 108;
  const nextMargin = isMobile ? 10 : 14;
  const nextHeight = isMobile ? 28 : 34;
  const controlsGap = isMobile ? 8 : 12;
  const controlsMargin = isMobile ? 16 : 22;
  const controlsPadding = isMobile ? '8px 16px' : '10px 22px';
  const controlsFont = isMobile ? '0.75rem' : '0.82rem';
  const hintMargin = isMobile ? 8 : 12;
  const howToPlayMargin = isMobile ? 14 : 20;
  const howToPlayGap = isMobile ? 16 : 24;

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh', // ← НОВОЕ: для мобильных (dynamic viewport height)
      background: 'radial-gradient(ellipse at 30% 20%, #0f2040 0%, #050d1a 60%, #0a0a12 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '8px' : '16px',
      fontFamily: "'Inter', system-ui, sans-serif",
      userSelect: 'none',
      overflowX: 'hidden', // ← НОВОЕ: запрещаем горизонтальную прокрутку
      boxSizing: 'border-box',
      width: '100%',
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
        button:hover:not(:disabled) { filter: brightness(1.3); transform: translateY(-1px); }
        button { transition: all 0.18s; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: titleMargin }}>
        <h1 style={{
          fontSize: isMobile ? 'clamp(1.2rem, 6vw, 1.8rem)' : 'clamp(1.6rem, 5vw, 2.4rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em', margin: 0,
          background: 'linear-gradient(90deg, #38bdf8, #818cf8 25%, #f472b6 50%, #fb923c 75%, #38bdf8)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'title-shimmer 4s linear infinite',
        }}>
          CHROMALINE
        </h1>
        <p style={{ 
          color: '#5a8ab8', 
          fontSize: isMobile ? '0.6rem' : '0.68rem', 
          letterSpacing: '0.35em', 
          margin: '5px 0 0', 
          textTransform: 'uppercase' 
        }}>
          Color Lines 3D · AI
        </p>
      </div>

      {/* Score bar */}
      <div style={{ display: 'flex', gap: scoreGap, marginBottom: scoreMargin, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* 1. Кнопка Звук */}
        <button
          onClick={() => setSoundOn(!soundOn)}
          style={{
            background: 'linear-gradient(145deg, #0d1f36, #091829)',
            border: '2px solid #38bdf8',
            borderRadius: isMobile ? 10 : 14,
            padding: scorePadding,
            minWidth: isMobile ? 44 : 54,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.3)',
            opacity: soundOn ? 1 : 0.5
          }}
          title={soundOn ? 'Выключить звук' : 'Включить звук'}
        >
          {soundOn ? (
            <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          ) : (
            <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          )}
        </button>

        {/* 2. Кнопка Настройки */}
        <button
          onClick={() => setIsMenuOpen(true)}
          style={{
            background: 'linear-gradient(145deg, #0d1f36, #091829)',
            border: '2px solid #38bdf8',
            borderRadius: isMobile ? 8 : 11,
            padding: scorePadding,
            minWidth: isMobile ? 44 : 54,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.3)',
          }}
          title="Настройки и инструкция"
        >
          <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }}>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        {/* SCORE / BEST */}
        {[{ label: 'SCORE', val: score, accent: '#38bdf8' }, { label: 'BEST', val: hi, accent: '#f59e0b' }].map(({ label, val, accent }) => (
          <div key={label} style={{
            background: 'linear-gradient(145deg, #0d1f36, #091829)',
            border: '2px solid #38bdf8',
            borderRadius: isMobile ? 8 : 11,
            padding: scorePadding,
            textAlign: 'center',
            minWidth: scoreMinWidth,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.3)',
          }}>
            <div style={{ color: '#6b9fd1', fontSize: isMobile ? '0.55rem' : '0.62rem', letterSpacing: '0.25em', marginBottom: 3 }}>{label}</div>
            <div style={{ color: accent, fontSize: isMobile ? '1.3rem' : '1.7rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Next balls preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, marginBottom: nextMargin, height: nextHeight }}>
        <span style={{ color: '#6b9fd1', fontSize: isMobile ? '0.55rem' : '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Next</span>
        <div style={{ display: 'flex', gap: isMobile ? 8 : 10, alignItems: 'center' }}>
          {next.map((b, i) => (
            <BallEl key={i} colorIdx={b.color} size={isMobile ? 18 : 24} />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${G}, ${CELL}px)`,
        gap: gap,
        background: 'linear-gradient(145deg, #07121f, #050e1a)',
        borderRadius: gridBorderRadius,
        padding: gridPadding,
        border: '2px solid #1a4a88',
        boxShadow: '0 0 30px #1a4a8866, 0 25px 60px rgba(0,0,0,0.7)',
        animation: 'grid-glow 4s ease-in-out infinite',
        maxWidth: '100%',
        boxSizing: 'border-box',
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
                  borderRadius: cellBorderRadius,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: cell !== null ? 'pointer' : sel !== null ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'all 0.22s ease-in-out',
                  border: selected
                    ? `2px solid ${PALETTE[cell!].h}`
                    : hFrom ? '2px solid #f59e0b'
                    : hTo ? '2px solid #22c55e'
                    : '1px solid rgba(6, 182, 212, 0.5)',
                  boxShadow: selected
                    ? `inset 0 0 12px ${PALETTE[cell!].h}33`
                    : 'inset 0 0 4px rgba(6, 182, 212, 0.08)',
                }}
              >
                {ghost && !cell && (
                  <div style={{ opacity: 0.35, pointerEvents: 'none' }}>
                    <BallEl colorIdx={ghost.color} size={CELL * 0.52} />
                  </div>
                )}

                {trailItem && (
                  <div className="ball-trail" style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}>
                    <BallEl colorIdx={trailItem.colorIdx} size={CELL * 0.65} anim="trail" />
                  </div>
                )}

                {cell !== null && (
                  <BallEl
                    colorIdx={cell}
                    size={CELL * 0.88}
                    selected={selected}
                    anim={flashing ? 'pop-out' : popping ? 'pop-in' : selected ? 'pulse' : undefined}
                  />
                )}

                {hTo && !cell && (
                  <div style={{
                    width: isMobile ? 10 : 14, 
                    height: isMobile ? 10 : 14, 
                    borderRadius: '50%',
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
      <div style={{ display: 'flex', gap: controlsGap, marginTop: controlsMargin, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>

        {/* AI Hint */}
        <button
          onClick={requestHint}
          disabled={busy || hintLoading || over}
          style={{
            background: hintLoading
              ? 'linear-gradient(135deg, #0d1f36, #0d1f36)'
              : (busy || hintLoading || over)
                ? 'linear-gradient(135deg, #111827, #1f2937)'
                : 'linear-gradient(135deg, #0d2d55, #1a3a6e)',
            border: (busy || hintLoading || over) ? '1px solid #374151' : '2px solid #38bdf8',
            borderRadius: isMobile ? 8 : 11,
            color: (busy || hintLoading || over) ? '#6b7280' : '#7dd3fc',
            padding: controlsPadding,
            cursor: (busy || hintLoading || over) ? 'not-allowed' : 'pointer',
            fontSize: controlsFont, fontWeight: 700, letterSpacing: '0.05em',
            opacity: (busy || hintLoading || over) ? 0.45 : 1,
            boxShadow: (busy || hintLoading || over)
              ? '0 4px 14px rgba(0,0,0,0.4)'
              : '0 4px 14px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.3)',
          }}
        >
          {hintLoading ? '· · ·' : hint ? 'New Hint' : '✦ AI Hint'}
        </button>

        {/* Undo */}
        <button
          onClick={undo}
          disabled={busy || !canUndo}
          style={{
            background: (busy || !canUndo)
              ? 'linear-gradient(135deg, #111827, #1f2937)'
              : 'linear-gradient(135deg, #0d2d55, #1a3a6e)',
            border: (busy || !canUndo) ? '1px solid #374151' : '2px solid #38bdf8',
            borderRadius: isMobile ? 8 : 11,
            color: (busy || !canUndo) ? '#6b7280' : '#7dd3fc',
            padding: controlsPadding,
            cursor: (busy || !canUndo) ? 'not-allowed' : 'pointer',
            fontSize: controlsFont, fontWeight: 700, letterSpacing: '0.05em',
            opacity: (busy || !canUndo) ? 0.45 : 1,
            boxShadow: (busy || !canUndo)
              ? '0 4px 14px rgba(0,0,0,0.4)'
              : '0 4px 14px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.3)',
          }}
        >
          Undo
        </button>

        {/* New Game */}
        <button
          onClick={newGame}
          disabled={busy}
          style={{
            background: busy
              ? 'linear-gradient(135deg, #111827, #1f2937)'
              : 'linear-gradient(135deg, #0d2d55, #1a3a6e)',
            border: busy ? '1px solid #374151' : '2px solid #38bdf8',
            borderRadius: isMobile ? 8 : 11,
            color: busy ? '#6b7280' : '#7dd3fc',
            padding: controlsPadding,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: controlsFont, fontWeight: 700, letterSpacing: '0.05em',
            opacity: busy ? 0.45 : 1,
            boxShadow: busy
              ? '0 4px 14px rgba(0,0,0,0.4)'
              : '0 4px 14px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.3)',
          }}
        >
          New Game
        </button>
      </div>

      {/* Hint status */}
      <div style={{ marginTop: hintMargin, height: isMobile ? 18 : 22, display: 'flex', alignItems: 'center' }}>
        {hint && (
          <p style={{ color: '#5a7db0', fontSize: isMobile ? '0.65rem' : '0.72rem', margin: 0, textAlign: 'center' }}>
            Move <span style={{ color: '#f59e0b99' }}>amber</span> ball → <span style={{ color: '#22c55e99' }}>green</span> target to score
          </p>
        )}
        {hintSearched && !hint && (
          <p style={{ color: '#3a5a80', fontSize: isMobile ? '0.62rem' : '0.7rem', margin: 0 }}>
            No immediate clearing move found
          </p>
        )}
      </div>

      {/* How to play */}
      <div style={{
        marginTop: howToPlayMargin, 
        display: 'flex', 
        gap: howToPlayGap, 
        flexWrap: 'wrap', 
        justifyContent: 'center',
      }}>
        {[
          { icon: '◉', text: 'Click ball to select' },
          { icon: '⊕', text: 'Click empty cell to move' },
          { icon: '✦', text: 'Line 5+ to score' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4a7ab0', fontSize: isMobile ? '0.6rem' : '0.68rem' }}>
            <span style={{ color: '#4a7ab0' }}>{icon}</span>
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
          padding: '16px',
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #0d1f36, #070f1c)',
            border: '1px solid #1e3a5f',
            borderRadius: 24, padding: isMobile ? '32px 24px' : '44px 40px', textAlign: 'center',
            maxWidth: 340, width: '100%',
            boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 60px #0d2d5533',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
              {PALETTE.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  width: isMobile ? 12 : 14, height: isMobile ? 12 : 14, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 30%, ${p.l}, ${p.h} 55%, ${p.d})`,
                  boxShadow: `0 0 8px ${p.h}88`,
                }} />
              ))}
            </div>
            <h2 style={{ color: '#e2e8f0', fontSize: isMobile ? '1.4rem' : '1.7rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Game Over
            </h2>
            <p style={{ color: '#5a8ab8', fontSize: isMobile ? '0.75rem' : '0.85rem', margin: '0 0 24px' }}>
              The grid is full!
            </p>
            <div style={{
              background: '#050d1a', borderRadius: 12, padding: '18px 24px', marginBottom: 28,
              border: '1px solid #0d2240',
            }}>
              <div style={{ color: '#4a6fa0', fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: 6 }}>
                FINAL SCORE
              </div>
              <div style={{ color: '#38bdf8', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: 900, lineHeight: 1 }}>
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