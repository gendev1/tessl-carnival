import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 8;
/** Seconds the hook takes to drop to the water. */
export const CAST_TIME = 0.5;
/** How close, in pixels, the hook must land to a duck's centre to catch it. */
export const HOOK_REACH = 26;
/** How fast the ducks float round the stream, in radians per second. */
export const DUCK_SPEED = 0.6;
export const DUCK_RADIUS = 20;
/** The number on each duck's base, in order round the stream. */
export const DUCK_VALUES = [1, 2, 1, 3, 1, 5, 2, 1, 3, 10] as const;
/** The loop the ducks float round: an ellipse in the middle of the booth. */
export const STREAM = { x: WIDTH / 2, y: 270, rx: 300, ry: 130 } as const;

export interface Duck {
  /** Where the duck is round the stream, in radians. */
  angle: number;
  value: number;
}

export interface Cast {
  x: number;
  y: number;
  /** Seconds since the hook started to drop. */
  age: number;
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  cast: Cast | null;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({
    angle: (i / DUCK_VALUES.length) * Math.PI * 2,
    value,
  }));
  return { ducks, cast: null, catches: [], casts: CASTS, score: 0, phase: 'playing' };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + Math.cos(duck.angle) * STREAM.rx,
    y: STREAM.y + Math.sin(duck.angle) * STREAM.ry,
  };
}

/** The duck closest to the point within the hook's reach, if there is one. */
export function duckAt(state: HookADuckState, x: number, y: number): Duck | undefined {
  let found: Duck | undefined;
  let nearest = HOOK_REACH;
  for (const duck of state.ducks) {
    const pos = duckPosition(duck);
    const distance = Math.hypot(pos.x - x, pos.y - y);
    if (distance <= nearest) {
      nearest = distance;
      found = duck;
    }
  }
  return found;
}

/** Lowers the hook at a point. Returns false if the hook could not be cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.cast) return false;
  state.cast = { x, y, age: 0 };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  if (state.cast) {
    state.cast.age += dt;
    if (state.cast.age >= CAST_TIME) {
      const duck = duckAt(state, state.cast.x, state.cast.y);
      if (duck) {
        // The duck goes back in the stream, so it can be caught again.
        state.score += duck.value;
        state.catches.push({ ...duckPosition(duck), value: duck.value, age: 0 });
      }
      state.cast = null;
    }
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 0.8);

  if (state.casts === 0 && !state.cast) state.phase = 'over';
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a ring of water round a wooden island.
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 46, STREAM.ry + 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 38, STREAM.ry + 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 38, STREAM.ry - 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 46, STREAM.ry - 46, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const duck of state.ducks) {
    const { x, y } = duckPosition(duck);
    // Body, head and beak.
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(x, y, DUCK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y - 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.stripeA;
    ctx.fillRect(x + 18, y - 18, 8, 4);
    ctx.fillStyle = colors.background;
    ctx.font = canvasFont('small', 'bold');
    ctx.fillText(String(duck.value), x, y + 4);
  }

  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age / 0.8;
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - 30 - caught.age * 60);
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';

  // The rod hangs over the booth; its line runs down to the hook.
  const hook = state.cast
    ? { x: state.cast.x, y: 60 + (state.cast.y - 60) * Math.min(state.cast.age / CAST_TIME, 1) }
    : { x: aim.x, y: 60 };
  const target = state.cast ?? aim;
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(target.x, target.y, HOOK_REACH, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(hook.x - 60, 40);
  ctx.lineTo(hook.x, 50);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, 50);
  ctx.lineTo(hook.x, hook.y);
  ctx.arc(hook.x - 6, hook.y, 6, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float by. Each scores the number on its base.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

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
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
