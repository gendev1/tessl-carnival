import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const SWINGS = 5;
/** The meter's starting speed, in bar widths per second. */
export const START_SPEED = 0.8;
/** Each swing makes the meter this much faster. */
export const SPEED_UP = 1.2;
/** How close to the center (out of 1) still sends the puck to the top. */
export const SWEET_SPOT = 0.05;
export const TOP_HEIGHT = 100;
export const BELL_BONUS = 50;
/** Seconds the puck takes to climb, and the same again to fall back. */
export const PUCK_TIME = 0.6;
const BELL_TIME = 0.8;

const TOWER = { x: 560, top: 70, bottom: 420, width: 36 } as const;
const BAR = { x: 80, y: 440, width: 360, height: 28 } as const;

export interface Puck {
  /** How high this swing sends the puck, from 0 to TOP_HEIGHT. */
  height: number;
  age: number;
}

export interface HighStrikerState {
  /** Where the meter is on the power bar: -1 is the left end, 0 the center, 1 the right end. */
  meter: number;
  /** Bar widths per second; negative moves left. */
  speed: number;
  puck: Puck | null;
  bell: number;
  swingsLeft: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HighStrikerState {
  return {
    meter: -1,
    speed: START_SPEED,
    puck: null,
    bell: 0,
    swingsLeft: SWINGS,
    score: 0,
    phase: 'playing',
  };
}

/** How high the puck climbs for a swing with the meter at `meter`. */
export function heightFor(meter: number): number {
  const distance = Math.min(Math.abs(meter), 1);
  if (distance <= SWEET_SPOT) return TOP_HEIGHT;
  return Math.round(TOP_HEIGHT * (1 - distance));
}

/** The points for a swing: the puck's height, plus the bell bonus at the top. */
export function scoreForSwing(meter: number): number {
  const height = heightFor(meter);
  return height === TOP_HEIGHT ? height + BELL_BONUS : height;
}

/** Swings the mallet at the meter's current spot. Returns false if nothing happened. */
export function swing(state: HighStrikerState): boolean {
  if (state.phase !== 'playing' || state.puck || state.swingsLeft === 0) return false;
  const height = heightFor(state.meter);
  state.score += scoreForSwing(state.meter);
  state.puck = { height, age: 0 };
  if (height === TOP_HEIGHT) state.bell = BELL_TIME;
  state.swingsLeft -= 1;
  state.speed *= SPEED_UP;
  return true;
}

/** How high the puck is drawn right now, from 0 to TOP_HEIGHT. */
export function puckHeight(puck: Puck | null): number {
  if (!puck) return 0;
  const t = Math.min(puck.age / PUCK_TIME, 2);
  return puck.height * (t <= 1 ? t : 2 - t);
}

/** Advances the game by `dt` seconds. */
export function step(state: HighStrikerState, dt: number): void {
  if (state.phase !== 'playing') return;

  state.meter += state.speed * 2 * dt;
  // Bounce off the ends of the bar.
  while (state.meter > 1 || state.meter < -1) {
    if (state.meter > 1) state.meter = 2 - state.meter;
    if (state.meter < -1) state.meter = -2 - state.meter;
    state.speed = -state.speed;
  }

  state.bell = Math.max(0, state.bell - dt);

  if (state.puck) {
    state.puck.age += dt;
    if (state.puck.age >= PUCK_TIME * 2) state.puck = null;
  }

  if (state.swingsLeft === 0 && !state.puck) state.phase = 'over';
}

function draw(ctx: CanvasRenderingContext2D, state: HighStrikerState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The tower, with a mark every 10 points of height.
  const climb = TOWER.bottom - TOWER.top;
  ctx.fillStyle = colors.wood;
  ctx.fillRect(TOWER.x - TOWER.width / 2, TOWER.top, TOWER.width, climb);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.fillStyle = colors.muted;
  ctx.font = canvasFont('small');
  ctx.textAlign = 'right';
  for (let mark = 10; mark <= TOP_HEIGHT; mark += 10) {
    const y = TOWER.bottom - (mark / TOP_HEIGHT) * climb;
    ctx.beginPath();
    ctx.moveTo(TOWER.x - TOWER.width / 2, y);
    ctx.lineTo(TOWER.x - TOWER.width / 2 + 10, y);
    ctx.stroke();
    ctx.fillText(String(mark), TOWER.x - TOWER.width / 2 - 8, y + 5);
  }

  // The bell, which flashes when the puck hits it.
  ctx.fillStyle =
    state.bell > 0 && Math.floor(state.bell * 10) % 2 === 0 ? colors.text : colors.accent;
  ctx.beginPath();
  ctx.arc(TOWER.x, TOWER.top, 24, Math.PI, 0);
  ctx.fill();
  if (state.bell > 0) {
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.textAlign = 'left';
    ctx.fillText(`DING! +${BELL_BONUS}`, TOWER.x + 40, TOWER.top + 10);
  }

  // The puck.
  const puckY = TOWER.bottom - (puckHeight(state.puck) / TOP_HEIGHT) * climb;
  ctx.fillStyle = colors.danger;
  ctx.fillRect(TOWER.x - TOWER.width / 2 - 6, puckY - 12, TOWER.width + 12, 12);

  // The lever the mallet hits.
  ctx.fillStyle = colors.surface;
  ctx.fillRect(TOWER.x - 60, TOWER.bottom, 120, 16);

  // The power bar: hot in the middle, cold at the ends.
  ctx.fillStyle = colors.surface;
  ctx.fillRect(BAR.x, BAR.y, BAR.width, BAR.height);
  ctx.fillStyle = colors.accent;
  const sweet = BAR.width * 0.2;
  ctx.fillRect(BAR.x + BAR.width / 2 - sweet / 2, BAR.y, sweet, BAR.height);
  ctx.fillStyle = colors.stripeA;
  const center = (BAR.width * SWEET_SPOT) / 2;
  ctx.fillRect(BAR.x + BAR.width / 2 - center, BAR.y, center * 2, BAR.height);

  const meterX = BAR.x + ((state.meter + 1) / 2) * BAR.width;
  ctx.fillStyle = colors.text;
  ctx.beginPath();
  ctx.moveTo(meterX, BAR.y - 2);
  ctx.lineTo(meterX - 9, BAR.y - 16);
  ctx.lineTo(meterX + 9, BAR.y - 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(meterX - 2, BAR.y, 4, BAR.height);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, 80);
  ctx.fillText(`Swings ${state.swingsLeft}/${SWINGS}`, 16, 110);
  ctx.font = canvasFont('body');
  ctx.fillStyle = colors.muted;
  ctx.fillText('Space or click to swing', BAR.x, BAR.y - 30);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Last swing! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click or press Space to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const highStriker: CarnivalGame = {
  id: 'high-striker',
  name: 'High Striker',
  description:
    'Swing the mallet when the meter is centered to ring the bell. It speeds up every swing.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const act = () => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        swing(state);
      }
    };
    const onDown = () => act();
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      if (!event.repeat) act();
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(highStriker.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  },
};

export default highStriker;
