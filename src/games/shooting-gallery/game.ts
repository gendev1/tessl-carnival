import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const SHOTS_PER_ROUND = 20;
export const ROUND_SECONDS = 40;
export const STREAK_BONUS = 5;
const ROWS = [
  { y: 120, speed: 200, radius: 16 },
  { y: 220, speed: -130, radius: 22 },
  { y: 320, speed: 70, radius: 30 },
];
const TARGETS_PER_ROW = 3;
const FLASH_SECONDS = 0.4;

export interface Target {
  x: number;
  y: number;
  radius: number;
  /** Pixels per second; negative moves left. */
  speed: number;
}

export interface Flash {
  x: number;
  y: number;
  age: number;
  hit: boolean;
}

export interface ShootingGalleryState {
  targets: Target[];
  flashes: Flash[];
  shots: number;
  timeLeft: number;
  score: number;
  /** Hits in a row since the last miss. */
  streak: number;
  phase: 'playing' | 'over';
}

export function createState(): ShootingGalleryState {
  const spacing = WIDTH / TARGETS_PER_ROW;
  const targets = ROWS.flatMap((row) =>
    Array.from({ length: TARGETS_PER_ROW }, (_, i) => ({
      x: spacing * i + spacing / 2,
      y: row.y,
      radius: row.radius,
      speed: row.speed,
    })),
  );
  return {
    targets,
    flashes: [],
    shots: SHOTS_PER_ROUND,
    timeLeft: ROUND_SECONDS,
    score: 0,
    streak: 0,
    phase: 'playing',
  };
}

/**
 * Faster and smaller targets are worth more: 10 points per 60 px/s of speed,
 * plus 10 points per 10 px of radius under 40, both rounded up.
 */
export function scoreForHit(target: Target): number {
  const speedPoints = 10 * Math.ceil(Math.abs(target.speed) / 60);
  const sizePoints = 10 * Math.ceil(Math.max(0, 40 - target.radius) / 10);
  return speedPoints + sizePoints;
}

/** The extra points a hit earns for being the `streak`th hit in a row. */
export function streakBonus(streak: number): number {
  return STREAK_BONUS * Math.max(0, streak - 1);
}

export function isHit(x: number, y: number, target: Target): boolean {
  return Math.hypot(x - target.x, y - target.y) <= target.radius;
}

function endIfDone(state: ShootingGalleryState): void {
  if (state.shots === 0 || state.timeLeft === 0) state.phase = 'over';
}

/**
 * Fires one shot at the aim point. Returns the points it scored, 0 for a miss,
 * or undefined if nothing fired.
 */
export function fire(state: ShootingGalleryState, x: number, y: number): number | undefined {
  if (state.phase !== 'playing' || state.shots === 0) return undefined;
  state.shots -= 1;
  const target = state.targets.find((t) => isHit(x, y, t));
  let points = 0;
  if (target) {
    state.streak += 1;
    points = scoreForHit(target) + streakBonus(state.streak);
    state.score += points;
    state.flashes.push({ x: target.x, y: target.y, age: 0, hit: true });
    // Send the hit target back to the start of its row.
    target.x = target.speed > 0 ? -target.radius : WIDTH + target.radius;
  } else {
    state.streak = 0;
    state.flashes.push({ x, y, age: 0, hit: false });
  }
  endIfDone(state);
  return points;
}

/** Advances the game by `dt` seconds. */
export function step(state: ShootingGalleryState, dt: number): void {
  for (const flash of state.flashes) flash.age += dt;
  state.flashes = state.flashes.filter((f) => f.age < FLASH_SECONDS);
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  for (const target of state.targets) {
    target.x += target.speed * dt;
    if (target.x > WIDTH + target.radius) target.x = -target.radius;
    if (target.x < -target.radius) target.x = WIDTH + target.radius;
  }
  endIfDone(state);
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: ShootingGalleryState,
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

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(0, row.y + row.radius + 4, WIDTH, 6);
  }

  for (const target of state.targets) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(target.x - 2, target.y, 4, target.radius + 4);
    ctx.fillStyle = colors.stripeB;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.stripeA;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.stripeB;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 3;
  for (const flash of state.flashes) {
    ctx.globalAlpha = 1 - flash.age / FLASH_SECONDS;
    ctx.strokeStyle = flash.hit ? colors.accent : colors.muted;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, (flash.hit ? 10 : 4) + flash.age * 60, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (state.phase === 'playing') {
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 12, 0, Math.PI * 2);
    ctx.moveTo(aim.x - 18, aim.y);
    ctx.lineTo(aim.x + 18, aim.y);
    ctx.moveTo(aim.x, aim.y - 18);
    ctx.lineTo(aim.x, aim.y + 18);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'center';
  ctx.fillText(`Streak ${state.streak}`, WIDTH / 2, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(
    `Shots ${state.shots}/${SHOTS_PER_ROUND}  Time ${Math.ceil(state.timeLeft)}s`,
    WIDTH - 16,
    HEIGHT - 20,
  );

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    const reason = state.shots === 0 ? 'Out of shots!' : "Time's up!";
    ctx.fillText(`${reason} You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const shootingGallery: CarnivalGame = {
  id: 'shooting-gallery',
  name: 'Shooting Gallery',
  description: 'Pick off the sliding targets before time or shots run out. Keep a streak going.',

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
        fire(state, aim.x, aim.y);
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
        recordScore(shootingGallery.id, state.score);
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

export default shootingGallery;
