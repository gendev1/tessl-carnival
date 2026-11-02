import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const DARTS_PER_ROUND = 8;
/** Seconds a dart takes to reach the wall. */
export const FLIGHT_TIME = 0.2;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;

/** Balloon sizes, smallest first. Smaller balloons are harder to hit and score more. */
export const BALLOON_SIZES = [
  { radius: 16, points: 30 },
  { radius: 22, points: 20 },
  { radius: 28, points: 10 },
] as const;

const COLUMNS = 10;
const ROW_YS = [90, 160, 230, 300];
const BALLOON_COLORS = [
  theme.colors.stripeA,
  theme.colors.accent,
  theme.colors.water,
  theme.colors.muted,
];

export interface Balloon {
  x: number;
  y: number;
  radius: number;
  points: number;
  color: string;
  popped: boolean;
}

export interface Dart {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the dart was thrown. */
  age: number;
}

export interface StuckDart {
  x: number;
  y: number;
}

export interface Pop {
  x: number;
  y: number;
  radius: number;
  age: number;
}

export interface BalloonDartsState {
  balloons: Balloon[];
  darts: Dart[];
  stuck: StuckDart[];
  pops: Pop[];
  dartsLeft: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): BalloonDartsState {
  const spacing = WIDTH / COLUMNS;
  const balloons = ROW_YS.flatMap((y, row) =>
    Array.from({ length: COLUMNS }, (_, col) => {
      const size = BALLOON_SIZES[(row + col) % BALLOON_SIZES.length];
      return {
        x: spacing * col + spacing / 2,
        y,
        radius: size.radius,
        points: size.points,
        color: BALLOON_COLORS[(row * 2 + col) % BALLOON_COLORS.length],
        popped: false,
      };
    }),
  );
  return {
    balloons,
    darts: [],
    stuck: [],
    pops: [],
    dartsLeft: DARTS_PER_ROUND,
    score: 0,
    phase: 'playing',
  };
}

export function isHit(x: number, y: number, balloon: Balloon): boolean {
  return !balloon.popped && Math.hypot(x - balloon.x, y - balloon.y) <= balloon.radius;
}

/** Throws one dart at the aim point. Returns false if nothing was thrown. */
export function throwDart(state: BalloonDartsState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.dartsLeft === 0) return false;
  state.darts.push({ fromX: THROWER.x, fromY: THROWER.y, toX: aimX, toY: aimY, age: 0 });
  state.dartsLeft -= 1;
  return true;
}

/** Where a dart in flight is now. */
export function dartPosition(dart: Dart): { x: number; y: number } {
  const t = Math.min(dart.age / FLIGHT_TIME, 1);
  return {
    x: dart.fromX + (dart.toX - dart.fromX) * t,
    y: dart.fromY + (dart.toY - dart.fromY) * t,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: BalloonDartsState, dt: number): void {
  const flying: Dart[] = [];
  for (const dart of state.darts) {
    dart.age += dt;
    if (dart.age < FLIGHT_TIME) {
      flying.push(dart);
      continue;
    }
    const balloon = state.balloons.find((b) => isHit(dart.toX, dart.toY, b));
    if (balloon) {
      balloon.popped = true;
      state.score += balloon.points;
      state.pops.push({ x: balloon.x, y: balloon.y, radius: balloon.radius, age: 0 });
    } else {
      state.stuck.push({ x: dart.toX, y: dart.toY });
    }
  }
  state.darts = flying;

  for (const pop of state.pops) pop.age += dt;
  state.pops = state.pops.filter((p) => p.age < 0.3);

  if (state.dartsLeft === 0 && state.darts.length === 0) state.phase = 'over';
}

function drawDart(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = theme.colors.wood;
  ctx.fillRect(-26, -2, 22, 4);
  ctx.fillStyle = theme.colors.stripeA;
  ctx.fillRect(-32, -5, 8, 10);
  ctx.fillStyle = theme.colors.text;
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(4, 0);
  ctx.lineTo(-4, 2);
  ctx.fill();
  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: BalloonDartsState,
  aim: { x: number; y: number },
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

  // The cork wall the balloons hang on.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, 50, WIDTH, 290);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(10, 58, WIDTH - 20, 274);

  for (const dart of state.stuck) {
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.arc(dart.x, dart.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const balloon of state.balloons) {
    if (balloon.popped) continue;
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.radius);
    ctx.lineTo(balloon.x, balloon.y + balloon.radius + 10);
    ctx.stroke();
    ctx.fillStyle = balloon.color;
    ctx.beginPath();
    ctx.ellipse(balloon.x, balloon.y, balloon.radius * 0.85, balloon.radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(
      balloon.x - balloon.radius * 0.3,
      balloon.y - balloon.radius * 0.4,
      balloon.radius * 0.18,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  for (const pop of state.pops) {
    ctx.globalAlpha = 1 - pop.age / 0.3;
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, pop.radius + pop.age * 80, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const dart of state.darts) {
    const { x, y } = dartPosition(dart);
    drawDart(ctx, x, y, Math.atan2(dart.toY - dart.fromY, dart.toX - dart.fromX));
  }

  // Crosshair at the aim point.
  if (state.phase === 'playing') {
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
    ctx.moveTo(aim.x - 16, aim.y);
    ctx.lineTo(aim.x + 16, aim.y);
    ctx.moveTo(aim.x, aim.y - 16);
    ctx.lineTo(aim.x, aim.y + 16);
    ctx.stroke();
  }

  // The darts still in hand.
  if (state.dartsLeft > 0) {
    drawDart(ctx, THROWER.x, THROWER.y, Math.atan2(aim.y - THROWER.y, aim.x - THROWER.x));
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Darts ${state.dartsLeft}/${DARTS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of darts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const balloonDarts: CarnivalGame = {
  id: 'balloon-darts',
  name: 'Balloon Darts',
  description: 'Pop the balloons before your darts run out. Smaller balloons score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

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
      } else {
        throwDart(state, aim.x, aim.y);
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
        recordScore(balloonDarts.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
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

export default balloonDarts;
