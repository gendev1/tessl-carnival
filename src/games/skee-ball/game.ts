import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const BALLS_PER_ROUND = 9;
export const BALL_RADIUS = 9;
export const LANE = { left: 220, right: 580, top: 30, rampTop: 310 } as const;
export const LAUNCH = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
export const MIN_SPEED = 200;
export const MAX_SPEED = 620;
/** How quickly a rolling ball slows down, in px/s². */
export const FRICTION = 360;
/** A ball rolling over a hole slower than this drops in. */
export const DROP_SPEED = 170;
/** Seconds of holding to go from no power to full power. */
export const CHARGE_TIME = 1.2;

export interface Hole {
  x: number;
  y: number;
  radius: number;
  value: number;
}

/** Smaller holes are worth more. */
export const HOLES: readonly Hole[] = [
  { x: 260, y: 60, radius: 12, value: 100 },
  { x: 540, y: 60, radius: 12, value: 100 },
  { x: 400, y: 60, radius: 16, value: 50 },
  { x: 300, y: 140, radius: 20, value: 40 },
  { x: 500, y: 140, radius: 20, value: 40 },
  { x: 400, y: 120, radius: 24, value: 30 },
  { x: 400, y: 190, radius: 30, value: 20 },
  { x: 400, y: 265, radius: 36, value: 10 },
];

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Drop {
  x: number;
  y: number;
  /** Points the ball scored; 0 for a miss. */
  value: number;
  age: number;
}

export interface SkeeBallState {
  ball: Ball | null;
  ballsLeft: number;
  score: number;
  drops: Drop[];
  phase: 'playing' | 'over';
}

export function createState(): SkeeBallState {
  return { ball: null, ballsLeft: BALLS_PER_ROUND, score: 0, drops: [], phase: 'playing' };
}

/**
 * Power, from 0 to 1, after holding for `seconds`. It fills over CHARGE_TIME,
 * then drains again, so holding too long costs power.
 */
export function powerFor(seconds: number): number {
  const t = (Math.max(seconds, 0) / CHARGE_TIME) % 2;
  return t <= 1 ? t : 2 - t;
}

/** The hole a ball at (x, y) is over, if any. */
export function holeAt(x: number, y: number): Hole | undefined {
  return HOLES.find((hole) => Math.hypot(x - hole.x, y - hole.y) <= hole.radius);
}

/**
 * Rolls one ball up the ramp towards the aim point, with `power` from 0 to 1.
 * Returns false if nothing rolled.
 */
export function roll(state: SkeeBallState, aimX: number, aimY: number, power: number): boolean {
  if (state.phase !== 'playing' || state.ball || state.ballsLeft === 0) return false;
  const dx = aimX - LAUNCH.x;
  const dy = Math.min(aimY - LAUNCH.y, -1);
  const length = Math.hypot(dx, dy);
  const speed = MIN_SPEED + Math.min(Math.max(power, 0), 1) * (MAX_SPEED - MIN_SPEED);
  state.ball = {
    x: LAUNCH.x,
    y: LAUNCH.y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
  };
  state.ballsLeft -= 1;
  return true;
}

function settle(state: SkeeBallState, ball: Ball, value: number) {
  state.score += value;
  state.drops.push({ x: ball.x, y: ball.y, value, age: 0 });
  state.ball = null;
}

/** Advances the game by `dt` seconds. */
export function step(state: SkeeBallState, dt: number): void {
  const ball = state.ball;
  if (ball) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Bounce off the side walls.
    if (ball.x < LANE.left + BALL_RADIUS) {
      ball.x = LANE.left + BALL_RADIUS;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x > LANE.right - BALL_RADIUS) {
      ball.x = LANE.right - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx);
    }

    const speed = Math.hypot(ball.vx, ball.vy);
    const slower = Math.max(speed - FRICTION * dt, 0);
    if (speed > 0) {
      ball.vx *= slower / speed;
      ball.vy *= slower / speed;
    }

    const hole = holeAt(ball.x, ball.y);
    if (ball.y < LANE.top + BALL_RADIUS) {
      // Past every hole and into the back gutter.
      settle(state, ball, 0);
    } else if (hole && slower < DROP_SPEED) {
      settle(state, ball, hole.value);
    } else if (slower === 0) {
      settle(state, ball, 0);
    }
  }

  for (const drop of state.drops) drop.age += dt;
  state.drops = state.drops.filter((d) => d.age < 0.8);

  if (state.ballsLeft === 0 && !state.ball) state.phase = 'over';
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: SkeeBallState,
  aim: { x: number; y: number },
  power: number | null,
) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The lane: the board of holes, then the ramp up to it.
  const laneWidth = LANE.right - LANE.left;
  ctx.fillStyle = colors.surface;
  ctx.fillRect(LANE.left, LANE.top, laneWidth, LANE.rampTop - LANE.top);
  ctx.fillStyle = colors.wood;
  ctx.fillRect(LANE.left, LANE.rampTop, laneWidth, HEIGHT - LANE.rampTop);
  ctx.fillStyle = colors.stripeA;
  ctx.fillRect(LANE.left - 10, LANE.top - 10, 10, HEIGHT - LANE.top + 10);
  ctx.fillRect(LANE.right, LANE.top - 10, 10, HEIGHT - LANE.top + 10);
  ctx.fillRect(LANE.left - 10, LANE.top - 10, laneWidth + 20, 10);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = canvasFont('small', 'bold');
  for (const hole of HOLES) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.fillText(String(hole.value), hole.x, hole.y);
  }
  ctx.textBaseline = 'alphabetic';

  for (const drop of state.drops) {
    ctx.globalAlpha = 1 - drop.age / 0.8;
    ctx.fillStyle = drop.value > 0 ? colors.accent : colors.danger;
    ctx.font = canvasFont('body', 'bold');
    ctx.fillText(drop.value > 0 ? `+${drop.value}` : 'Miss', drop.x, drop.y - 20 - drop.age * 30);
  }
  ctx.globalAlpha = 1;

  // Aim line from the launch spot, while waiting to roll.
  if (state.phase === 'playing' && !state.ball && state.ballsLeft > 0) {
    const dx = aim.x - LAUNCH.x;
    const dy = Math.min(aim.y - LAUNCH.y, -1);
    const length = Math.hypot(dx, dy);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(LAUNCH.x, LAUNCH.y);
    ctx.lineTo(LAUNCH.x + (dx / length) * 120, LAUNCH.y + (dy / length) * 120);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const ball = state.ball ?? (state.ballsLeft > 0 ? LAUNCH : null);
  if (ball) {
    ctx.fillStyle = colors.stripeB;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // Power meter, while the button is held.
  if (power !== null) {
    const meterHeight = 160;
    ctx.fillStyle = colors.surface;
    ctx.fillRect(LANE.right + 40, HEIGHT - 40 - meterHeight, 20, meterHeight);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(LANE.right + 40, HEIGHT - 40 - meterHeight * power, 20, meterHeight * power);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Balls ${state.ballsLeft}/${BALLS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of balls! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const skeeBall: CarnivalGame = {
  id: 'skee-ball',
  name: 'Skee-Ball',
  description: 'Roll the ball up the ramp and into the holes. Smaller holes score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    let heldSince: number | null = null;
    const aim = { x: WIDTH / 2, y: 0 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else if (!state.ball && state.ballsLeft > 0) {
        heldSince = performance.now();
      }
    };
    const onUp = (event: PointerEvent) => {
      if (heldSince === null) return;
      Object.assign(aim, toCanvas(event));
      roll(state, aim.x, aim.y, powerFor((performance.now() - heldSince) / 1000));
      heldSince = null;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(skeeBall.id, state.score);
        scoreRecorded = true;
      }
      const power = heldSince === null ? null : powerFor((time - heldSince) / 1000);
      draw(ctx, state, aim, power);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  },
};

export default skeeBall;
