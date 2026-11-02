import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const MOLE_RADIUS = 36;
/** At the start of the round a mole pops up every second and stays up for 1.2 s. */
const START = { interval: 1, upTime: 1.2 };
/** By the end of the round a mole pops up every 0.35 s and stays up for 0.6 s. */
const END = { interval: 0.35, upTime: 0.6 };
const COLUMNS = [200, 400, 600];
const ROWS = [150, 270, 390];
const BONK_SECONDS = 0.3;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole stays up, or null when the hole is empty. */
  moleLeft: number | null;
  /** Seconds left on the whack effect, 0 when there is none. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  spawnIn: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = ROWS.flatMap((y) => COLUMNS.map((x) => ({ x, y, moleLeft: null, bonk: 0 })));
  return { holes, timeLeft: ROUND_SECONDS, spawnIn: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

/** Seconds between moles: shrinks as the round goes on. */
export function spawnInterval(state: WhackAMoleState): number {
  return START.interval + (END.interval - START.interval) * progress(state);
}

/** Seconds a new mole stays up: shrinks as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return START.upTime + (END.upTime - START.upTime) * progress(state);
}

/** Where the mole in a hole is drawn and can be hit: just above the hole. */
export function moleCenter(hole: Hole): { x: number; y: number } {
  return { x: hole.x, y: hole.y - 20 };
}

/** Whacks at a point. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => {
    if (h.moleLeft === null) return false;
    const center = moleCenter(h);
    return Math.hypot(x - center.x, y - center.y) <= MOLE_RADIUS;
  });
  if (!hole) return false;
  hole.moleLeft = null;
  hole.bonk = BONK_SECONDS;
  state.score += POINTS_PER_MOLE;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` picks which empty hole the next
 * mole pops up from, and returns a number in [0, 1) like Math.random.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const hole of state.holes) {
    hole.bonk = Math.max(hole.bonk - dt, 0);
    if (hole.moleLeft !== null) {
      hole.moleLeft -= dt;
      if (hole.moleLeft <= 0) hole.moleLeft = null;
    }
  }

  if (state.timeLeft === 0) {
    for (const hole of state.holes) hole.moleLeft = null;
    state.phase = 'over';
    return;
  }

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    const empty = state.holes.filter((h) => h.moleLeft === null && h.bonk === 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
      hole.moleLeft = upTime(state);
    }
    state.spawnIn += spawnInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    const center = moleCenter(hole);

    if (hole.moleLeft !== null) {
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(center.x, center.y, MOLE_RADIUS, Math.PI, 0);
      ctx.lineTo(center.x + MOLE_RADIUS, hole.y);
      ctx.lineTo(center.x - MOLE_RADIUS, hole.y);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(center.x - 12, center.y - 6, 5, 0, Math.PI * 2);
      ctx.arc(center.x + 12, center.y - 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(center.x, center.y + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // The front lip of the hole, drawn over the bottom of the mole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, 56, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.bonk > 0) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = hole.bonk / BONK_SECONDS;
      ctx.beginPath();
      ctx.arc(center.x, center.y, MOLE_RADIUS + (BONK_SECONDS - hole.bonk) * 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description:
    'Whack the moles before they duck back down. They get quicker as the clock runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
