import React, { useState, useEffect, useCallback, useRef } from 'react';

import { audioManager } from './audioManager';
// ── Константы ─────────────────────────────────────────────────────────────────
const G = 9;          // grid size
const LINE = 5;       // balls needed in a line
const SPAWN = 3;      // balls added per turn
const INIT = 5;       // initial balls on board

export const PALETTE = [
  { h: '#ff2200', l: '#ff9980', d: '#800b00', name: 'Red' },
  { h: '#00f0ff', l: '#b3f7ff', d: '#004c80', name: 'Cyan' },
  { h: '#39ff14', l: '#d8ffb3', d: '#0f4d00', name: 'Green' },
  { h: '#ff66cc', l: '#ffccee', d: '#990066', name: 'Pink' },
  { h: '#ff7700', l: '#ffcc99', d: '#803b00', name: 'Orange' },
  { h: '#9d4edd', l: '#e0c3fc', d: '#3c096c', name: 'Purple' },
  { h: '#ffea00', l: '#fffae6', d: '#807500', name: 'Желтый' },
];

// ── Типы ─────────────────────────────────────────────────────────────────────
type Cell = number | null;
type Grid = Cell[][];
type Pos = [number, number];
type NextBall = { pos: Pos; color: number };

// ── Вспомогательные функции ──────────────────────────────────────────────────
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

function findPathBFS(grid: Grid, from: Pos, to: Pos): Pos[] | null {
  const [fr, fc] = from, [tr, tc] = to;
  if (grid[tr][tc] !== null) return null;
  if (fr === tr && fc === tc) return [from];

  const queue: Pos[] = [from];
  const parent: { [key: string]: string } = {};
  const vis = new Set<string>([key(fr, fc)]);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === tr && c === tc) {
      const path: Pos[] = [];
      let currKey = key(tr, tc);
      while (currKey) {
        path.push(parseKey(currKey));
        currKey = parent[currKey];
      }
      return path.reverse();
    }

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      const nKey = key(nr, nc);
      if (nr >= 0 && nr < G && nc >= 0 && nc < G && !vis.has(nKey) && grid[nr][nc] === null) {
        vis.add(nKey);
        parent[nKey] = key(r, c);
        queue.push([nr, nc]);
      }
    }
  }
  return null;
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
  const evaluatePositionWeight = (g: Grid, r: number, c: number, color: number): number => {
    let maxWeight = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dr, dc] of directions) {
      let matches = 0;
      let potential = 1;

      for (const s of [1, -1]) {
        let nr = r + s * dr, nc = c + s * dc;
        let foundObstacle = false;

        while (nr >= 0 && nr < G && nc >= 0 && nc < G) {
          const cell = g[nr][nc];
          
          if (cell === color) {
            if (!foundObstacle) {
              matches++;
            }
            potential++;
          } else if (cell === null) {
            potential++;
            foundObstacle = true;
          } else {
            break;
          }
          
          nr += s * dr; 
          nc += s * dc;
        }
      }

      if (potential >= LINE && matches > 0) {
        let directionWeight = Math.pow(matches + 1, 2);

        if (matches === 2) {
          directionWeight *= 3.0;
        } else if (matches === 3) {
          directionWeight *= 8.0;
        }

        if (directionWeight > maxWeight) {
          maxWeight = directionWeight;
        }
      }
    }
    return maxWeight;
  };

  let bestImmediate: { from: Pos; to: Pos; score: number } | null = null;
  
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      if (grid[r][c] === null) continue;
      for (let tr = 0; tr < G; tr++) {
        for (let tc = 0; tc < G; tc++) {
          if (grid[tr][tc] !== null) continue;
          if (!findPathBFS(grid, [r, c], [tr, tc])) continue;
          
          const t = grid.map(row => [...row]);
          t[tr][tc] = t[r][c];
          t[r][c] = null;
          
          const rm = findLines(t, tr, tc);
          if (rm.size >= LINE && (!bestImmediate || rm.size > bestImmediate.score)) {
            bestImmediate = { from: [r, c], to: [tr, tc], score: rm.size };
          }
        }
      }
    }
  }

  if (bestImmediate) return { from: bestImmediate.from, to: bestImmediate.to };

  let bestStrategic: { from: Pos; to: Pos; netGain: number } | null = null;

  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      const color = grid[r][c];
      if (color === null) continue;

      const oldWeight = evaluatePositionWeight(grid, r, c, color);

      for (let tr = 0; tr < G; tr++) {
        for (let tc = 0; tc < G; tc++) {
          if (grid[tr][tc] !== null || (r === tr && c === tc)) continue;
          if (!findPathBFS(grid, [r, c], [tr, tc])) continue;

          const t = grid.map(row => [...row]);
          t[tr][tc] = color;
          t[r][c] = null;

          const newWeight = evaluatePositionWeight(t, tr, tc, color);
          const netGain = newWeight - oldWeight;

          if (netGain > 0) {
            if (!bestStrategic || netGain > bestStrategic.netGain) {
              bestStrategic = { from: [r, c], to: [tr, tc], netGain };
            }
          }
        }
      }
    }
  }

  if (bestStrategic) {
    return { from: bestStrategic.from, to: bestStrategic.to };
  }

  return null;
}

// ── САМ КАСТОМНЫЙ ХУК ─────────────────────────────────────────────────────────
export function useChromaline(soundOn: boolean) {
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
  const [flash, setFlash] = useState<Set<string>>(new Set());  
  const [pop, setPop] = useState<Set<string>>(new Set());      
  const [trail, setTrail] = useState<{pos: Pos, colorIdx: number, id: number}[]>([]);
  
  // Состояния для хранения истории отмены (один шаг назад)
  const [historyGrid, setHistoryGrid] = useState<Grid | null>(null);
  const [historyScore, setHistoryScore] = useState<number | null>(null);
  const [historyNext, setHistoryNext] = useState<NextBall[] | null>(null);

  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  useEffect(() => { localStorage.setItem('chromaline_hi', String(hi)); }, [hi]);

  const addScore = useCallback((pts: number) => {
    setScore(s => {
      const ns = s + pts;
      setHi(h => Math.max(h, ns));
      return ns;
    });
  }, []);

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
    setTrail([]);
    setBusy(false);
    
    // Сбрасываем историю при начале новой игры
    setHistoryGrid(null);
    setHistoryScore(null);
    setHistoryNext(null);
  }, []);

  useEffect(() => { newGame(); }, [newGame]);

  const onCell = useCallback((r: number, c: number) => {
    if (over || busy) return;
    const cell = grid[r][c];

    if (cell !== null) {
      audioManager.playSelect(soundOn);

      setSel(p => (p && p[0] === r && p[1] === c) ? null : [r, c]);
      setHint(null);
      setHintSearched(false);
      return;
    }

    if (sel === null) return;
    
    const path = findPathBFS(grid, sel, [r, c]);
    if (!path) {audioManager.playError(soundOn); setSel(null); return; }

    // ЗАПИСЬ ИСТОРИИ: Фиксируем состояние ДО начала движения
    setHistoryGrid(grid.map(row => [...row]));
    setHistoryScore(score);
    setHistoryNext([...nextRef.current]);
  audioManager.playMove(soundOn, path.length * 0.1);
    setBusy(true);
    setSel(null);
    setHint(null);
    setHintSearched(false);

    const color = grid[sel[0]][sel[1]]!;
    
    let currentStep = 0;
    let currentGrid = grid.map(row => [...row]);
    
    const moveInterval = setInterval(() => {
      const [prevR, prevC] = path[currentStep];
      currentStep++;
      const [nextR, nextC] = path[currentStep];

      currentGrid[prevR][prevC] = null;
      currentGrid[nextR][nextC] = color;
      
      const tId = Date.now() + Math.random();
      setTrail(prev => [...prev, { pos: [prevR, prevC], colorIdx: color, id: tId }]);
      setTimeout(() => {
        setTrail(prev => prev.filter(t => t.id !== tId));
      }, 400);

      setGrid(currentGrid.map(row => [...row]));

      if (currentStep === path.length - 1) {
        clearInterval(moveInterval);
        
        const removed = findLines(currentGrid, r, c);
      
        if (removed.size > 0) {
          audioManager.playMatch(soundOn);
          const pts = scoreFor(removed.size);
          setTimeout(() => {
            setPop(new Set());
            setFlash(removed);
            setTimeout(() => {
              const g3 = currentGrid.map(row => [...row]);
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
            const g3 = currentGrid.map(row => [...row]);
            const appeared = new Set<string>();
            const curNext = nextRef.current;

            let availableEmpty = emptyPositions(g3);

            curNext.forEach(({ pos: originalPos, color: nc2 }) => {
              const [or, oc] = originalPos;
              
              if (g3[or][oc] === null) {
                g3[or][oc] = nc2;
                appeared.add(key(or, oc));
                availableEmpty = availableEmpty.filter(([er, ec]) => !(er === or && ec === oc));
              } 
              else if (availableEmpty.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableEmpty.length);
                const [nr, nc] = availableEmpty[randomIndex];
                
                g3[nr][nc] = nc2;
                appeared.add(key(nr, nc));
                availableEmpty.splice(randomIndex, 1);
              }
            });

            let bonus = 0;
            const newBallRm = new Set<string>();
            appeared.forEach(k => {
              const [kr, kc] = parseKey(k);
              if (g3[kr][kc] === null) return;
              const rm = findLines(g3, kr, kc);
              if (rm.size >= LINE) { 
                bonus += scoreFor(rm.size); 
                rm.forEach(rk => newBallRm.add(rk)); 
              }
            });
            
            newBallRm.forEach(k => { 
              const [kr, kc] = parseKey(k); 
              g3[kr][kc] = null; 
              appeared.delete(k); 
            });

            const emp = emptyPositions(g3);
            const nn = makeNextBalls(g3);
            
            setGrid(g3);
            setNext(nn);
            setPop(appeared);
            
            if (bonus > 0) addScore(bonus);

            if (emp.length === 0) {
              setOver(true);
              setBusy(false);
              return;
            }

            setTimeout(() => { 
              setPop(new Set()); 
              setBusy(false); 
            }, 420);
          }, 280);
        }
      }
    }, 60);

  }, [grid, sel, over, busy, addScore, soundOn]);

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

  // ФУНКЦИЯ UNDO: Откат на один ход назад
  const undo = useCallback(() => {
    if (busy || !historyGrid || historyScore === null || !historyNext) return;

    setGrid(historyGrid);
    setScore(historyScore);
    setNext(historyNext);
    
    // Сбрасываем выделение, подсказки и эффекты
    setSel(null);
    setHint(null);
    setHintSearched(false);
    setOver(false); // На случай, если игрок отменяет ход, приведший к Game Over
    setFlash(new Set());
    setPop(new Set());
    setTrail([]);

    // Очищаем историю, чтобы нельзя было отменять бесконечно назад (одноуровневый Undo)
    setHistoryGrid(null);
    setHistoryScore(null);
    setHistoryNext(null);
  }, [busy, historyGrid, historyScore, historyNext]);

  const canUndo = historyGrid !== null;

  return {
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
    undo,       // Экспортируем функцию отмены
    canUndo     // Экспортируем состояние доступности
  };
}

// ── Визуальный компонент шара ────────────────────────────────────────────────
export function BallEl({ colorIdx, size, selected, anim }: { colorIdx: number; size: number; selected?: boolean; anim?: string }) {
  const p = PALETTE[colorIdx];
  if (!p) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
        boxShadow: '0 6px 16px rgba(0,0,0,0.75), inset 0 -5px 10px var(--dark), inset 0 3px 6px rgba(255,255,255,0.4)',
        background: 'radial-gradient(circle at 35% 30%, var(--light) 0%, var(--main) 50%, var(--dark) 100%)',
        animation: anim ? `ball-${anim} 0.4s ease-out forwards` : undefined,
        transform: selected ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.15s ease-out',
        ['--main' as any]: p.h,
        ['--light' as any]: p.l,
        ['--dark' as any]: p.d,
      }}
    >
      <div style={{
        position: 'absolute', bottom: '5%', left: '15%', width: '70%', height: '35%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at bottom, var(--main) 0%, transparent 70%)',
        opacity: 0.47, filter: 'blur(1px)'
      }} />
      
      <div style={{
        position: 'absolute', top: '10%', left: '15%', width: '32%', height: '24%',
        borderRadius: '50%',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.75), rgba(255,255,255,0.05))',
        transform: 'rotate(-28deg)'
      }} />
    </div>
  );
}