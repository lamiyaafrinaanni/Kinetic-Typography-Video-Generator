import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import chunks from './chunks.json'; // [{s,e,words:[[text,start,end]]}] seconds, synced to the voice-over

// Transparent overlay: put <MTCaptions/> above your video/audio sequence.
// Offset: if your voice-over starts later in the timeline, wrap in <Sequence from={...}>.

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = {
  out3: (x: number) => 1 - Math.pow(1 - x, 3),
  out5: (x: number) => 1 - Math.pow(1 - x, 5),
  in3: (x: number) => x * x * x,
  back: (x: number) => 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2),
  elastic: (x: number) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * 2.0944) + 1),
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
};
const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

type Sty = {w: number; up: number; ls: string; fill?: string; acc?: string; grad?: string; gl: [string, string]; scale?: number};
const STY: Sty[] = [
  {w: 800, up: 0, ls: '-0.03em', fill: '#fff', acc: 'linear-gradient(90deg,#b7acff,#6fdcff)', gl: ['#7a6bff', '#35c4ff']},
  {w: 300, up: 1, ls: '0.06em', fill: '#fff', acc: 'linear-gradient(90deg,#fff0bf,#ffb561)', gl: ['#ffb347', '#ff8a3d'], scale: 0.78},
  {w: 900, up: 0, ls: '-0.035em', grad: 'linear-gradient(90deg,#ffe6a3,#ff9a4f)', gl: ['#ff9a3d', '#ff6a00']},
  {w: 800, up: 1, ls: '0.03em', fill: '#fff', gl: ['#9fc2ff', '#ffffff'], scale: 0.85},
  {w: 700, up: 0, ls: '-0.02em', fill: '#fff', gl: ['#3fd0ff', '#1e7bff'], scale: 0.95},
  {w: 800, up: 0, ls: '-0.03em', grad: 'linear-gradient(90deg,#b8ffe0,#6fe6ff)', gl: ['#3dffc0', '#22c1ff']},
  {w: 900, up: 1, ls: '0.01em', fill: '#fff', acc: 'linear-gradient(90deg,#ffa3c4,#ffd0a0)', gl: ['#ff6fa0', '#ff9d6b'], scale: 0.85},
];
const FX = ['wordsync','charRise','spin','zoomSlam','slideMask','typewriter','bounce','tracking','flip','glitch','scatter','wipe','fadeUp','blurZoom'];
const EX = ['fade','scaleOut','slideOut','blurUp','spinOut','dropOut','zoomOut'];

type Chunk = {s: number; e: number; words: [string, number, number][]};

const splitLines = (words: Chunk['words']) => {
  const total = words.map((w) => w[0]).join(' ').length;
  if (total <= 20 || words.length < 2) return [words];
  let best = 1, bd = 1e9;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).map((w) => w[0]).join(' ').length;
    const d = Math.abs(a - (total - a - 1));
    if (d < bd) { bd = d; best = k; }
  }
  return [words.slice(0, best), words.slice(best)];
};

const ChunkView: React.FC<{c: Chunk; ci: number; t: number; scale: number}> = ({c, ci, t, scale}) => {
  const st = STY[(ci * 3 + Math.floor(ci / 7)) % STY.length];
  let fx = FX[(ci * 5 + Math.floor(ci / 3)) % FX.length];
  const ex = EX[(ci * 3 + 1) % EX.length];
  if (fx === 'spin' && c.words.length > 3) fx = 'wordsync';
  const t0 = c.s - 0.1, tEnd = c.e, tOut = 0.24;
  if (t < t0 || t > tEnd + tOut + 0.01) return null;

  const lines = splitLines(c.words);
  const maxChars = Math.max(...lines.map((l) => l.map((w) => w[0]).join(' ').length));
  const base = 150 * (st.scale ?? 1);
  const fs = Math.min(base, (1560 / (maxChars * 0.6 + 1))) * scale;
  const accIdx = c.words.reduce((m, w, i) => (w[0].length > c.words[m][0].length ? i : m), 0);
  const nC = c.words.reduce((n, w) => n + w[0].length, 0);

  const k = Math.max(0, t - c.s);
  const g = 1 + 0.9 * Math.exp(-k * 5) + 0.12 * Math.sin(t * 7 + c.s * 3);
  const r = (v: number) => (v * g * scale).toFixed(1);
  const glow = `drop-shadow(0 0 ${r(7)}px ${st.gl[0]}) drop-shadow(0 0 ${r(26)}px ${st.gl[1]}) drop-shadow(0 0 ${r(60)}px ${st.gl[1]})`;
  const masked = fx === 'charRise' || fx === 'slideMask' || fx === 'flip';

  let cc = 0;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif", fontSize: fs, fontWeight: st.w, letterSpacing: st.ls}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', filter: glow}}>
        {lines.map((ln, li) => (
          <div key={li} style={{display: 'flex', whiteSpace: 'nowrap', lineHeight: 1.12, padding: '.1em .15em', overflow: masked ? 'hidden' : 'visible'}}>
            {ln.map((w) => {
              const wi = c.words.indexOf(w);
              const isAcc = !!st.acc && wi === accIdx;
              const text = st.up ? w[0].toUpperCase() : w[0];
              return (
                <span key={wi} style={{display: 'inline-flex', margin: '0 .14em'}}>
                  {[...text].map((chr, j) => {
                    const idx = cc++;
                    const wsync = w[1] - 0.06;
                    const g3 = (s: number, d: number) => E.out3(clamp((t - s) / d));
                    let x = 0, y = 0, s = 1, rot = 0, rx = 0, b = 0, o = 1, clip: number | null = null, mr = 0;
                    switch (fx) {
                      case 'wordsync': { const p = g3(wsync, 0.32); o = p; b = (1 - p) * 14; y = (1 - p) * 38; s = 0.9 + 0.1 * p; break; }
                      case 'charRise': { const p = E.out5(clamp((t - (t0 + idx * 0.022)) / 0.4)); y = (1 - p) * 130; o = clamp(p * 3); break; }
                      case 'spin': { const s0 = t0 + wi * 0.08, p = E.back(clamp((t - s0) / 0.55)); rot = (1 - p) * -540; s = p; o = clamp((t - s0) / 0.15); break; }
                      case 'zoomSlam': { const p = E.out5(clamp((t - t0) / 0.4)); s = 2.4 - 1.4 * p; b = (1 - p) * 22; o = clamp(p * 2.5); break; }
                      case 'slideMask': { const p = E.out5(clamp((t - (t0 + wi * 0.06)) / 0.5)); x = (1 - p) * -900; break; }
                      case 'typewriter': { const f = (idx + 0.5) / nC; o = t >= c.s + (c.e - c.s) * 0.9 * f - 0.08 ? 1 : 0; break; }
                      case 'bounce': { const p = E.elastic(clamp((t - wsync) / 0.7)); y = (1 - p) * -260; o = clamp((t - wsync) / 0.08); break; }
                      case 'tracking': { const p = E.out3(clamp((t - t0) / 0.55)); mr = (1 - p) * 20; o = clamp(p * 2); b = (1 - p) * 8; break; }
                      case 'flip': { const p = E.out5(clamp((t - (t0 + wi * 0.07)) / 0.5)); rx = (1 - p) * -100; y = (1 - p) * 60; o = clamp(p * 2.5); break; }
                      case 'glitch': { const kk = t - t0; if (kk < 0.3) { const jj = Math.floor(kk * 30) + idx; x = (rnd(jj) - 0.5) * 40; y = (rnd(jj + 9) - 0.5) * 16; o = rnd(jj + 3) > 0.25 ? 1 : 0.2; } break; }
                      case 'scatter': { const p = E.out5(clamp((t - t0) / 0.5)); x = (rnd(idx + 1) - 0.5) * 1400 * (1 - p); y = (rnd(idx + 7) - 0.5) * 800 * (1 - p); rot = (rnd(idx + 3) - 0.5) * 720 * (1 - p); o = clamp(p * 3); s = 0.5 + 0.5 * p; break; }
                      case 'wipe': clip = E.io(clamp((t - t0) / 0.5)); break;
                      case 'fadeUp': { const p = E.out3(clamp((t - t0) / 0.5)); y = (1 - p) * 90; o = p; break; }
                      case 'blurZoom': { const p = E.out3(clamp((t - t0) / 0.5)); s = 0.55 + 0.45 * p; b = (1 - p) * 26; o = p; break; }
                    }
                    const q = clamp((t - tEnd) / tOut);
                    let bx = 0, by = 0, bs = 1, br = 0, bo = 1, bb = 0;
                    if (q > 0) {
                      const e = E.in3(q);
                      switch (ex) {
                        case 'fade': bo = 1 - e; by = -30 * e; break;
                        case 'scaleOut': bs = 1 - 0.5 * e; bo = 1 - e; bb = 10 * e; break;
                        case 'slideOut': bx = 900 * e; bo = 1 - e * 0.8; break;
                        case 'blurUp': bb = 24 * e; by = -80 * e; bo = 1 - e; break;
                        case 'spinOut': br = 200 * e; bs = 1 - e * 0.8; bo = 1 - e; break;
                        case 'dropOut': by = 260 * e; bo = 1 - e; br = (rnd(idx) - 0.5) * 40 * e; break;
                        case 'zoomOut': bs = 1 + 1.2 * e; bb = 18 * e; bo = 1 - e; break;
                      }
                    }
                    const color = st.grad || isAcc ? 'transparent' : st.fill;
                    const bg = st.grad || (isAcc ? st.acc : undefined);
                    return (
                      <span key={j} style={{
                        display: 'inline-block', whiteSpace: 'pre', marginRight: mr * scale,
                        opacity: o * bo,
                        filter: b + bb > 0.2 ? `blur(${((b + bb) * scale).toFixed(1)}px)` : 'none',
                        transform: `translate(${((x + bx) * scale).toFixed(1)}px,${((y + by) * scale).toFixed(1)}px) rotate(${(rot + br).toFixed(1)}deg) rotateX(${rx.toFixed(1)}deg) scale(${(s * bs).toFixed(3)})`,
                        color, backgroundImage: bg, WebkitBackgroundClip: bg ? 'text' : undefined, backgroundClip: bg ? 'text' : undefined,
                        clipPath: clip !== null ? `inset(0 ${((1 - clip) * 100).toFixed(1)}% 0 0)` : undefined,
                      }}>{chr}</span>
                    );
                  })}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const MTCaptions: React.FC<{offsetSeconds?: number}> = ({offsetSeconds = 0}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const t = frame / fps - offsetSeconds;
  const scale = width / 1920; // auto-scales to any resolution (tuned on 1920 wide)
  return (
    <AbsoluteFill style={{background: 'transparent'}}>
      {(chunks as Chunk[]).map((c, i) => <ChunkView key={i} c={c} ci={i} t={t} scale={scale} />)}
    </AbsoluteFill>
  );
};
