import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const DISCS_PER_ROUND = 5;
/** Points for each slot, left to right. The middle slot is the jackpot. */
export const SLOT_VALUES = [50, 20, 10, 5, 100, 5, 10, 20, 50] as const;
export const SLOT_WIDTH = WIDTH / SLOT_VALUES.length;
export const DROP_Y = 64;
export const SLOT_TOP = 400;
export const FLOOR = HEIGHT - 40;
export const DISC_RADIUS = 9;
export const PEG_RADIUS = 5;
const GRAVITY = 900;
const BOUNCE = 0.5;
/** Physics runs in small steps so a fast disc can't pass through a peg. */
const SUBSTEP = 1 / 240;
const PEG_ROWS = 8;
const PEG_TOP = 110;
const PEG_SPACING = SLOT_WIDTH / 2;

export interface Peg {
  x: number;
  y: number;
}

export interface Disc {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The slot the disc has fallen into, once it is below the pegs. */
  slot?: number;
}

export interface Landing {
  slot: number;
  age: number;
}

export interface PlinkoState {
  pegs: Peg[];
  disc?: Disc;
  landings: Landing[];
  discsLeft: number;
  score: number;
  phase: 'playing' | 'over';
}

/**
 * Rows of pegs, every other row shifted by half a gap. Pegs too close to a
 * wall for a disc to pass are left out, so a disc can't wedge there.
 */
export function createPegs(): Peg[] {
  const margin = PEG_RADIUS + DISC_RADIUS * 2 + 4;
  const rowGap = (SLOT_TOP - 30 - PEG_TOP) / (PEG_ROWS - 1);
  const pegs: Peg[] = [];
  for (let row = 0; row < PEG_ROWS; row++) {
    const offset = row % 2 === 0 ? PEG_SPACING / 2 : 0;
    for (let x = offset; x <= WIDTH; x += PEG_SPACING) {
      if (x >= margin && x <= WIDTH - margin) pegs.push({ x, y: PEG_TOP + row * rowGap });
    }
  }
  return pegs;
}

export function createState(): PlinkoState {
  return {
    pegs: createPegs(),
    landings: [],
    discsLeft: DISCS_PER_ROUND,
    score: 0,
    phase: 'playing',
  };
}

/** The index of the slot under `x`. */
export function slotAt(x: number): number {
  return Math.min(SLOT_VALUES.length - 1, Math.max(0, Math.floor(x / SLOT_WIDTH)));
}

/** Keeps the drop point on the board. */
export function clampDrop(x: number): number {
  return Math.min(WIDTH - DISC_RADIUS, Math.max(DISC_RADIUS, x));
}

/**
 * Drops a disc from `x` along the top of the board. Only one disc falls at a
 * time. A small random sideways push keeps a disc from balancing on a peg.
 * Returns false if nothing dropped.
 */
export function dropDisc(
  state: PlinkoState,
  x: number,
  random: () => number = Math.random,
): boolean {
  if (state.phase !== 'playing' || state.disc || state.discsLeft === 0) return false;
  state.disc = { x: clampDrop(x), y: DROP_Y, vx: (random() - 0.5) * 40, vy: 0 };
  state.discsLeft -= 1;
  return true;
}

/** Pushes the disc out of a peg it overlaps and bounces it off. */
export function bounceOffPeg(disc: Disc, peg: Peg): boolean {
  const dx = disc.x - peg.x;
  const dy = disc.y - peg.y;
  const distance = Math.hypot(dx, dy);
  const reach = DISC_RADIUS + PEG_RADIUS;
  if (distance >= reach) return false;
  // Dead centre: tip it to one side rather than divide by zero.
  const nx = distance === 0 ? 1 : dx / distance;
  const ny = distance === 0 ? 0 : dy / distance;
  disc.x = peg.x + nx * reach;
  disc.y = peg.y + ny * reach;
  const along = disc.vx * nx + disc.vy * ny;
  if (along < 0) {
    disc.vx -= (1 + BOUNCE) * along * nx;
    disc.vy -= (1 + BOUNCE) * along * ny;
  }
  return true;
}

function moveDisc(state: PlinkoState, disc: Disc, dt: number): void {
  disc.vy += GRAVITY * dt;
  disc.x += disc.vx * dt;
  disc.y += disc.vy * dt;

  if (disc.slot === undefined) {
    for (const peg of state.pegs) bounceOffPeg(disc, peg);
    if (disc.x < DISC_RADIUS) {
      disc.x = DISC_RADIUS;
      disc.vx = Math.abs(disc.vx) * BOUNCE;
    } else if (disc.x > WIDTH - DISC_RADIUS) {
      disc.x = WIDTH - DISC_RADIUS;
      disc.vx = -Math.abs(disc.vx) * BOUNCE;
    }
    if (disc.y >= SLOT_TOP) disc.slot = slotAt(disc.x);
  }

  if (disc.slot !== undefined) {
    // Inside a slot the dividers keep the disc in its lane.
    const left = disc.slot * SLOT_WIDTH + DISC_RADIUS;
    const right = (disc.slot + 1) * SLOT_WIDTH - DISC_RADIUS;
    disc.x = Math.min(right, Math.max(left, disc.x));
    disc.vx *= 0.9;
  }
}

/** Advances the game by `dt` seconds. */
export function step(state: PlinkoState, dt: number): void {
  for (let left = dt; left > 0 && state.disc; left -= SUBSTEP) {
    const disc = state.disc;
    moveDisc(state, disc, Math.min(SUBSTEP, left));
    if (disc.slot !== undefined && disc.y >= FLOOR - DISC_RADIUS) {
      state.score += SLOT_VALUES[disc.slot];
      state.landings.push({ slot: disc.slot, age: 0 });
      state.disc = undefined;
    }
  }

  for (const landing of state.landings) landing.age += dt;
  state.landings = state.landings.filter((l) => l.age < 0.6);

  if (state.discsLeft === 0 && !state.disc) state.phase = 'over';
}

function draw(ctx: CanvasRenderingContext2D, state: PlinkoState, dropX: number) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Slots, with their values.
  ctx.textAlign = 'center';
  ctx.font = canvasFont('body', 'bold');
  SLOT_VALUES.forEach((value, i) => {
    const x = i * SLOT_WIDTH;
    ctx.fillStyle = colors.surface;
    ctx.fillRect(x, SLOT_TOP, SLOT_WIDTH, FLOOR - SLOT_TOP);
    const landing = state.landings.find((l) => l.slot === i);
    if (landing) {
      ctx.globalAlpha = 1 - landing.age / 0.6;
      ctx.fillStyle = colors.accent;
      ctx.fillRect(x, SLOT_TOP, SLOT_WIDTH, FLOOR - SLOT_TOP);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = value === Math.max(...SLOT_VALUES) ? colors.accent : colors.text;
    ctx.fillText(String(value), x + SLOT_WIDTH / 2, FLOOR - 16);
  });
  ctx.fillStyle = colors.wood;
  for (let i = 0; i <= SLOT_VALUES.length; i++) {
    ctx.fillRect(i * SLOT_WIDTH - 2, SLOT_TOP, 4, FLOOR - SLOT_TOP);
  }
  ctx.fillRect(0, FLOOR, WIDTH, 4);

  ctx.fillStyle = colors.muted;
  for (const peg of state.pegs) {
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // The drop point, waiting for the next disc.
  if (state.phase === 'playing' && !state.disc && state.discsLeft > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(dropX, DROP_Y, DISC_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (state.disc) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(state.disc.x, state.disc.y, DISC_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 12);
  ctx.textAlign = 'right';
  ctx.fillText(`Discs ${state.discsLeft}/${DISCS_PER_ROUND}`, WIDTH - 16, HEIGHT - 12);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of discs! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const plinko: CarnivalGame = {
  id: 'plinko',
  name: 'Plinko',
  description: 'Drop discs through the pegs and hope they land in the jackpot slot.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    let dropX = WIDTH / 2;

    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return clampDrop(((event.clientX - rect.left) / rect.width) * WIDTH);
    };
    const onMove = (event: PointerEvent) => {
      dropX = toCanvasX(event);
    };
    const onDown = (event: PointerEvent) => {
      dropX = toCanvasX(event);
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        dropDisc(state, dropX);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport the disc.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(plinko.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, dropX);
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

export default plinko;
