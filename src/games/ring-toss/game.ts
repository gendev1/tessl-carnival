import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air before it lands. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the aim sways either side of the pointer. */
export const SWAY = 30;
/** How fast the aim sways, in radians per second. */
const SWAY_SPEED = 3;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Back row first. Bottles further back have thinner necks and score more. */
const ROWS = [
  { y: 120, neck: 10, points: 30 },
  { y: 200, neck: 12, points: 20 },
  { y: 280, neck: 14, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  /** How close, in pixels, a ring must land to the neck to score. */
  neck: number;
  points: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the ring was thrown. */
  age: number;
}

export interface LandedRing {
  x: number;
  y: number;
  /** The bottle the ring landed on, or undefined for a miss. */
  bottle: Bottle | undefined;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  flying: Ring[];
  landed: LandedRing[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway of the aim. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = WIDTH / (BOTTLES_PER_ROW + 1);
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: spacing * (i + 1),
      y: row.y,
      neck: row.neck,
      points: row.points,
    })),
  );
  return {
    bottles,
    flying: [],
    landed: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** Where a ring would land right now when the pointer is at (x, y). */
export function aimPoint(state: RingTossState, x: number, y: number): { x: number; y: number } {
  return { x: x + SWAY * Math.sin(state.time * SWAY_SPEED), y };
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= b.neck);
}

/** Throws one ring towards the pointer. Returns false if nothing was thrown. */
export function toss(state: RingTossState, pointerX: number, pointerY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0) return false;
  const target = aimPoint(state, pointerX, pointerY);
  state.flying.push({ fromX: THROWER.x, fromY: THROWER.y, toX: target.x, toY: target.y, age: 0 });
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  for (const ring of state.landed) ring.age += dt;
  // Rings on a bottle stay for the round; misses fade away.
  state.landed = state.landed.filter((r) => r.bottle || r.age < 0.6);

  const stillFlying: Ring[] = [];
  for (const ring of state.flying) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      stillFlying.push(ring);
      continue;
    }
    const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
    if (bottle) state.score += bottle.points;
    state.landed.push({
      x: bottle ? bottle.x : ring.toX,
      y: bottle ? bottle.y : ring.toY,
      bottle,
      age: 0,
    });
  }
  state.flying = stillFlying;

  if (state.rings === 0 && state.flying.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: RingTossState,
  pointer: { x: number; y: number },
) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 34, WIDTH - 80, 8);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 4, 24, 30);
    ctx.fillRect(bottle.x - 4, bottle.y - 14, 8, 20);
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(bottle.x, bottle.y, bottle.neck, 0, Math.PI * 2);
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.lineWidth = 4;
  for (const ring of state.landed) {
    ctx.strokeStyle = ring.bottle ? colors.accent : colors.muted;
    ctx.globalAlpha = ring.bottle ? 1 : 1 - ring.age / 0.6;
    drawRing(ctx, ring.x, ring.y, 1);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = colors.accent;
  for (const ring of state.flying) {
    const t = Math.min(ring.age / FLIGHT_TIME, 1);
    const x = ring.fromX + (ring.toX - ring.fromX) * t;
    // Arc up on the way, then drop onto the landing spot.
    const y = ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80;
    drawRing(ctx, x, y, 1.6 - 0.6 * t);
  }

  if (state.phase === 'playing') {
    const aim = aimPoint(state, pointer.x, pointer.y);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(aim.x - 10, aim.y);
    ctx.lineTo(aim.x + 10, aim.y);
    ctx.moveTo(aim.x, aim.y - 10);
    ctx.lineTo(aim.x, aim.y + 10);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const pointer = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(pointer, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(pointer, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, pointer.x, pointer.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, pointer);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
