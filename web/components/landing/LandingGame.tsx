"use client";

import { useRef, useEffect, useMemo } from "react";

// ─── Constants ──────────────────────────────────────────────
const GW = 400;
const GH = 225;
const WORLD_W = GW * 6;

// ─── Color Palette ──────────────────────────────────────────
const PAL = {
  skyTop: [135, 206, 235],
  skyBot: [93, 168, 211],
  skyDark: [13, 17, 23],
  skyGold: [35, 28, 10],
  ground: [26, 47, 26],
  groundDark: [15, 26, 15],
  tree1: [27, 67, 50],
  tree2: [45, 106, 79],
  trunk: [61, 43, 31],
  trunkDark: [30, 20, 15],
  body: [245, 230, 202],
  belly: [255, 248, 238],
  quill: [126, 200, 227],
  quillAlert: [232, 72, 85],
  quillGold: [212, 168, 83],
  eye: [26, 26, 26],
  nose: [42, 42, 42],
  feet: [196, 168, 130],
  white: [255, 255, 255],
  red: [232, 72, 85],
  gold: [212, 168, 83],
  purple: [155, 114, 207],
  sun: [255, 228, 132],
  cloud: [255, 255, 255],
  star: [255, 255, 230],
};

function lerpRGB(a: number[], b: number[], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
    a[1] + (b[1] - a[1]) * t
  )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

// ─── Seeded RNG ─────────────────────────────────────────────
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── World Data ─────────────────────────────────────────────
interface WorldData {
  mountains: { x: number; h: number; w: number }[];
  farTrees: { x: number; h: number; t: number }[];
  midTrees: { x: number; h: number; t: number }[];
  nearTrees: { x: number; h: number; t: number }[];
  stars: { x: number; y: number; s: number }[];
  clouds: { x: number; y: number; w: number }[];
  eyes: { x: number; y: number }[];
  fireflies: { x: number; y: number; phase: number }[];
}

function generateWorld(): WorldData {
  const r = seeded(42);

  const mountains: WorldData["mountains"] = [];
  for (let x = -100; x < WORLD_W + 100; x += 30 + r() * 50) {
    mountains.push({ x, h: 35 + r() * 55, w: 50 + r() * 70 });
  }

  const makeTrees = (spacing: number, hMin: number, hMax: number) => {
    const out: { x: number; h: number; t: number }[] = [];
    for (let x = -50; x < WORLD_W + 50; x += spacing + r() * spacing) {
      out.push({ x, h: hMin + r() * (hMax - hMin), t: r() > 0.5 ? 0 : 1 });
    }
    return out;
  };

  const stars: WorldData["stars"] = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: r() * WORLD_W * 2,
      y: r() * GH * 0.45,
      s: 1 + Math.floor(r() * 2),
    });
  }

  const clouds: WorldData["clouds"] = [];
  for (let x = -80; x < WORLD_W + 80; x += 50 + r() * 90) {
    clouds.push({ x, y: 12 + r() * 35, w: 18 + r() * 35 });
  }

  const eyes: WorldData["eyes"] = [];
  for (let i = 0; i < 10; i++) {
    eyes.push({
      x: GW * 2.2 + r() * GW * 2,
      y: GH * 0.25 + r() * GH * 0.35,
    });
  }

  const fireflies: WorldData["fireflies"] = [];
  for (let i = 0; i < 40; i++) {
    fireflies.push({
      x: GW * 1.5 + r() * GW * 3,
      y: GH * 0.3 + r() * GH * 0.35,
      phase: r() * Math.PI * 2,
    });
  }

  return {
    mountains,
    farTrees: makeTrees(10, 18, 35),
    midTrees: makeTrees(14, 24, 45),
    nearTrees: makeTrees(18, 30, 55),
    stars,
    clouds,
    eyes,
    fireflies,
  };
}

// ─── Drawing Helpers ────────────────────────────────────────

function drawSky(ctx: CanvasRenderingContext2D, p: number) {
  let topC: number[], botC: number[];
  if (p < 0.2) {
    topC = PAL.skyTop;
    botC = PAL.skyBot;
  } else if (p < 0.5) {
    const t = (p - 0.2) / 0.3;
    topC = PAL.skyTop.map((c, i) =>
      Math.round(c + (PAL.skyDark[i] - c) * t)
    );
    botC = PAL.skyBot.map((c, i) =>
      Math.round(c + (PAL.skyDark[i] - c) * t)
    );
  } else if (p < 0.8) {
    topC = PAL.skyDark;
    botC = PAL.skyDark;
  } else {
    const t = (p - 0.8) / 0.2;
    topC = PAL.skyDark.map((c, i) =>
      Math.round(c + (PAL.skyGold[i] - c) * t)
    );
    botC = PAL.skyDark;
  }

  const grad = ctx.createLinearGradient(0, 0, 0, GH * 0.7);
  grad.addColorStop(0, `rgb(${topC.join(",")})`);
  grad.addColorStop(1, `rgb(${botC.join(",")})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GW, GH);
}

function drawSun(ctx: CanvasRenderingContext2D, p: number) {
  if (p > 0.45) return;
  const alpha = p < 0.25 ? 1 : 1 - (p - 0.25) / 0.2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${PAL.sun.join(",")})`;
  ctx.beginPath();
  ctx.arc(GW * 0.8, 28 + p * 40, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${PAL.sun.join(",")},0.25)`;
  ctx.beginPath();
  ctx.arc(GW * 0.8, 28 + p * 40, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: WorldData,
  cx: number,
  p: number,
  t: number
) {
  if (p < 0.3) return;
  ctx.globalAlpha = clamp01((p - 0.3) / 0.2) * 0.85;
  ctx.fillStyle = `rgb(${PAL.star.join(",")})`;
  for (const st of w.stars) {
    const sx =
      ((st.x - cx * 0.03 + WORLD_W) % (WORLD_W * 2)) - WORLD_W * 0.3;
    if (sx < -5 || sx > GW + 5) continue;
    const twinkle = Math.sin(t * 3 + st.x) * 0.3 + 0.7;
    ctx.globalAlpha = clamp01((p - 0.3) / 0.2) * 0.85 * twinkle;
    ctx.fillRect(Math.floor(sx), st.y, st.s, st.s);
  }
  ctx.globalAlpha = 1;
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: WorldData,
  cx: number,
  p: number
) {
  if (p > 0.55) return;
  const alpha = p < 0.3 ? 0.75 : 0.75 * (1 - (p - 0.3) / 0.25);
  ctx.globalAlpha = alpha;
  for (const c of w.clouds) {
    const x = c.x - cx * 0.08;
    if (x < -60 || x > GW + 60) continue;
    ctx.fillStyle = `rgba(${PAL.cloud.join(",")},0.65)`;
    ctx.beginPath();
    ctx.arc(x, c.y, c.w * 0.28, 0, Math.PI * 2);
    ctx.arc(x + c.w * 0.22, c.y - 3, c.w * 0.22, 0, Math.PI * 2);
    ctx.arc(x + c.w * 0.45, c.y - 1, c.w * 0.2, 0, Math.PI * 2);
    ctx.arc(x - c.w * 0.18, c.y + 1, c.w * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMountains(
  ctx: CanvasRenderingContext2D,
  w: WorldData,
  cx: number,
  p: number
) {
  const gy = GH * 0.72;
  const dk = clamp01((p - 0.2) / 0.3);
  for (const m of w.mountains) {
    const mx = m.x - cx * 0.12;
    if (mx < -m.w || mx > GW + m.w) continue;
    ctx.fillStyle = lerpRGB([50, 70, 65], [18, 28, 22], dk);
    ctx.beginPath();
    ctx.moveTo(mx - m.w / 2, gy);
    ctx.lineTo(mx, gy - m.h);
    ctx.lineTo(mx + m.w / 2, gy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawTreeLine(
  ctx: CanvasRenderingContext2D,
  trees: { x: number; h: number; t: number }[],
  cx: number,
  parallax: number,
  gy: number,
  scale: number,
  p: number
) {
  const dk = clamp01((p - 0.15) / 0.35);
  for (const tree of trees) {
    const tx = tree.x - cx * parallax;
    if (tx < -40 || tx > GW + 40) continue;
    const h = tree.h * scale;
    const trunkH = h * 0.4;
    const trunkW = Math.max(2, h * 0.055);

    ctx.fillStyle = lerpRGB(PAL.trunk, PAL.trunkDark, dk);
    ctx.fillRect(
      Math.floor(tx - trunkW / 2),
      gy - trunkH,
      Math.ceil(trunkW),
      trunkH
    );

    const leafB = tree.t === 0 ? PAL.tree1 : PAL.tree2;
    ctx.fillStyle = lerpRGB(leafB, [10, 28, 18], dk);
    for (let i = 0; i < 3; i++) {
      const ly = gy - trunkH - h * (0.12 + i * 0.16);
      const lw = h * (0.48 - i * 0.12);
      const lh = h * (0.28 - i * 0.04);
      ctx.beginPath();
      ctx.moveTo(tx - lw / 2, ly);
      ctx.lineTo(tx, ly - lh);
      ctx.lineTo(tx + lw / 2, ly);
      ctx.closePath();
      ctx.fill();
    }
    // Top spike
    const sy = gy - trunkH - h * 0.56;
    ctx.beginPath();
    ctx.moveTo(tx - h * 0.08, sy);
    ctx.lineTo(tx, sy - h * 0.2);
    ctx.lineTo(tx + h * 0.08, sy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  cx: number,
  p: number,
  t: number
) {
  const gy = GH * 0.72;
  const dk = clamp01((p - 0.15) / 0.35);
  const gd = Math.max(0, (p - 0.8) / 0.2);

  let col = lerpRGB(PAL.ground, PAL.groundDark, dk);
  if (gd > 0) col = lerpRGB(PAL.groundDark, [40, 35, 15], gd);
  ctx.fillStyle = col;
  ctx.fillRect(0, gy, GW, GH - gy);

  // Path (lighter dirt strip)
  const pathCol = lerpRGB([45, 38, 28], [25, 20, 15], dk);
  ctx.fillStyle = pathCol;
  ctx.fillRect(0, gy, GW, 4);

  // Grass tufts
  ctx.fillStyle = lerpRGB([35, 70, 35], [15, 35, 15], dk);
  for (let x = 0; x < GW; x += 3) {
    const wx = x + cx;
    const h = 2 + (Math.sin(wx * 0.3 + t * 0.5) + 1) * 1.5;
    ctx.fillRect(x, gy - h, 1, h);
  }
}

function drawRedEyes(
  ctx: CanvasRenderingContext2D,
  w: WorldData,
  cx: number,
  p: number,
  t: number
) {
  if (p < 0.3 || p > 0.75) return;
  const vis = Math.sin(((p - 0.3) / 0.45) * Math.PI);

  for (const e of w.eyes) {
    const ex = e.x - cx;
    if (ex < -15 || ex > GW + 15) continue;
    const blink = Math.sin(t * 2.5 + e.x * 0.1) * 0.5 + 0.5;
    ctx.globalAlpha = vis * blink;
    ctx.fillStyle = `rgb(${PAL.red.join(",")})`;
    ctx.fillRect(Math.floor(ex) - 3, Math.floor(e.y), 2, 2);
    ctx.fillRect(Math.floor(ex) + 2, Math.floor(e.y), 2, 2);
    ctx.fillStyle = `rgba(${PAL.red.join(",")},0.2)`;
    ctx.fillRect(Math.floor(ex) - 5, Math.floor(e.y) - 1, 11, 4);
  }
  ctx.globalAlpha = 1;
}

function drawFireflies(
  ctx: CanvasRenderingContext2D,
  w: WorldData,
  cx: number,
  p: number,
  t: number
) {
  if (p < 0.25 || p > 0.85) return;
  const vis = Math.sin(clamp01((p - 0.25) / 0.6) * Math.PI);

  for (const f of w.fireflies) {
    const fx = f.x - cx + Math.sin(t * 0.8 + f.phase) * 6;
    const fy = f.y + Math.sin(t * 0.6 + f.phase * 2) * 4;
    if (fx < -5 || fx > GW + 5) continue;
    const glow = (Math.sin(t * 4 + f.phase) * 0.5 + 0.5) * vis;
    ctx.globalAlpha = glow * 0.9;
    ctx.fillStyle = "#EAFF70";
    ctx.fillRect(Math.floor(fx), Math.floor(fy), 2, 2);
    ctx.globalAlpha = glow * 0.3;
    ctx.fillRect(Math.floor(fx) - 1, Math.floor(fy) - 1, 4, 4);
  }
  ctx.globalAlpha = 1;
}

// ─── HEDGI ──────────────────────────────────────────────────

function drawHedgi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  quillState: number,
  t: number
) {
  const bx = Math.floor(x);
  const by = Math.floor(y);

  // Quills (back side)
  const qCol =
    quillState === 0
      ? PAL.quill
      : quillState === 1
        ? PAL.quillAlert
        : PAL.quillGold;
  ctx.fillStyle = `rgb(${qCol.join(",")})`;
  const qLen = quillState === 1 ? 9 : 6;
  for (let i = -6; i <= 6; i++) {
    const qx = bx - 8 - Math.abs(i) * 0.4;
    const qy = by + i * 0.7;
    const wave =
      Math.sin(t * 3 + i * 0.6) * (quillState === 1 ? 2 : 0.5);
    ctx.fillRect(
      Math.floor(qx - qLen + wave),
      Math.floor(qy),
      qLen + 1,
      1
    );
  }

  // Body (oval)
  ctx.fillStyle = `rgb(${PAL.body.join(",")})`;
  for (let dy = -6; dy <= 6; dy++) {
    const w = Math.floor(Math.sqrt(36 - dy * dy) * 1.2);
    ctx.fillRect(bx - w + 1, by + dy, w * 2, 1);
  }

  // Belly
  ctx.fillStyle = `rgb(${PAL.belly.join(",")})`;
  for (let dy = -3; dy <= 5; dy++) {
    const w = Math.floor(Math.sqrt(16 - Math.min(dy * dy, 16)) * 1.1);
    if (w > 0) ctx.fillRect(bx + 1, by + dy, w + 3, 1);
  }

  // Eye
  ctx.fillStyle = `rgb(${PAL.eye.join(",")})`;
  ctx.fillRect(bx + 5, by - 3, 3, 3);
  ctx.fillStyle = `rgb(${PAL.white.join(",")})`;
  ctx.fillRect(bx + 6, by - 3, 1, 1);

  // Nose
  ctx.fillStyle = `rgb(${PAL.nose.join(",")})`;
  ctx.fillRect(bx + 9, by, 2, 2);

  // Feet (walking animation)
  ctx.fillStyle = `rgb(${PAL.feet.join(",")})`;
  const walk = Math.sin(frame * 0.25) * 2;
  ctx.fillRect(bx - 2 + Math.floor(walk), by + 7, 3, 3);
  ctx.fillRect(bx + 3 - Math.floor(walk), by + 7, 3, 3);
}

// ─── Bird ───────────────────────────────────────────────────

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number
) {
  const wingY = Math.sin(t * 8) * 3;
  const bx = Math.floor(x);
  const by = Math.floor(y);

  // Body
  ctx.fillStyle = `rgb(${PAL.body.join(",")})`;
  ctx.fillRect(bx - 2, by, 5, 3);
  // Head
  ctx.fillRect(bx + 3, by - 1, 3, 3);
  // Beak
  ctx.fillStyle = `rgb(${PAL.gold.join(",")})`;
  ctx.fillRect(bx + 6, by, 2, 1);
  // Wings
  ctx.fillStyle = `rgb(${PAL.quill.join(",")})`;
  ctx.fillRect(bx - 1, by - 2 + Math.floor(wingY * 0.5), 4, 1);
  // Eye
  ctx.fillStyle = `rgb(${PAL.eye.join(",")})`;
  ctx.fillRect(bx + 4, by - 1, 1, 1);
  // Tail
  ctx.fillStyle = `rgb(${PAL.purple.join(",")})`;
  ctx.fillRect(bx - 3, by - 1, 2, 1);
}

// ─── Main Component ─────────────────────────────────────────

interface LandingGameProps {
  scrollDepth: number;
}

export default function LandingGame({ scrollDepth }: LandingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useMemo(() => generateWorld(), []);
  const animRef = useRef({ frame: 0, time: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    const render = () => {
      animRef.current.time += 1 / 60;
      animRef.current.frame++;
      const { time: t, frame } = animRef.current;
      const p = scrollDepth;
      const cx = p * (WORLD_W - GW);
      const gy = GH * 0.72;
      const hedgiSX = GW * 0.35;

      ctx.clearRect(0, 0, GW, GH);

      // Back → front
      drawSky(ctx, p);
      drawStars(ctx, world, cx, p, t);
      drawSun(ctx, p);
      drawClouds(ctx, world, cx, p);
      drawMountains(ctx, world, cx, p);
      drawTreeLine(ctx, world.farTrees, cx, 0.25, gy, 0.55, p);
      drawTreeLine(ctx, world.midTrees, cx, 0.5, gy, 0.75, p);
      drawFireflies(ctx, world, cx, p, t);
      drawRedEyes(ctx, world, cx, p, t);
      drawTreeLine(ctx, world.nearTrees, cx, 0.75, gy, 1.0, p);
      drawGround(ctx, cx, p, t);

      // Bird (flies ahead of hedgi)
      if (p < 0.65) {
        const birdX = hedgiSX + 50 + Math.sin(t * 0.6) * 25;
        const birdY = 35 + Math.sin(t * 0.8) * 12;
        drawBird(ctx, birdX, birdY, t);
      }

      // HEDGI
      const qState = p < 0.25 ? 0 : p < 0.7 ? 1 : 2;
      const bob = Math.sin(t * 6) * 1.2;
      drawHedgi(ctx, hedgiSX, gy - 11 + bob, frame, qState, t);

      // Foreground grass
      const dk = clamp01((p - 0.15) / 0.35);
      ctx.fillStyle = lerpRGB([25, 55, 25], [12, 28, 12], dk);
      for (let x = 0; x < GW; x += 4) {
        const wx = x + cx * 1.15;
        const h = 3 + Math.sin(wx * 0.4 + t * 0.8) * 2;
        ctx.fillRect(x, gy + 3, 2, h);
      }

      // Golden glow at end
      if (p > 0.82) {
        const ga = ((p - 0.82) / 0.18) * 0.25;
        ctx.fillStyle = `rgba(${PAL.gold.join(",")},${ga})`;
        ctx.fillRect(0, 0, GW, GH);
      }

      // Vignette in dark zone
      if (p > 0.35 && p < 0.8) {
        const va = Math.sin(((p - 0.35) / 0.45) * Math.PI) * 0.3;
        const vg = ctx.createRadialGradient(
          GW / 2,
          GH / 2,
          GW * 0.3,
          GW / 2,
          GH / 2,
          GW * 0.7
        );
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(0,0,0,${va})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, GW, GH);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [scrollDepth, world]);

  return (
    <canvas
      ref={canvasRef}
      width={GW}
      height={GH}
      className="fixed inset-0 z-10 w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
