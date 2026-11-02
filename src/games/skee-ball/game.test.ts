import { describe, expect, it } from 'vitest';
import {
  BALLS_PER_ROUND,
  CHARGE_TIME,
  HOLES,
  LANE,
  LAUNCH,
  createState,
  holeAt,
  powerFor,
  roll,
  step,
} from './game';

/** Steps until the ball settles, a frame at a time. */
function settle(state: ReturnType<typeof createState>) {
  for (let i = 0; i < 1000 && state.ball; i++) step(state, 1 / 60);
}

describe('skee-ball', () => {
  it('starts with every ball and no score', () => {
    const state = createState();
    expect(state.ballsLeft).toBe(BALLS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.ball).toBeNull();
    expect(state.phase).toBe('playing');
  });

  it('uses one ball per roll, and rolls one ball at a time', () => {
    const state = createState();
    expect(roll(state, 400, 0, 0.5)).toBe(true);
    expect(state.ballsLeft).toBe(BALLS_PER_ROUND - 1);
    expect(roll(state, 400, 0, 0.5)).toBe(false);
    expect(state.ballsLeft).toBe(BALLS_PER_ROUND - 1);
  });

  it('never rolls downwards, even when aimed below the launch spot', () => {
    const state = createState();
    roll(state, LAUNCH.x + 100, LAUNCH.y + 100, 0.5);
    expect(state.ball!.vy).toBeLessThan(0);
  });

  it('scores the value of the hole a slow ball rolls into', () => {
    const hole = HOLES.find((h) => h.value === 30)!;
    const state = createState();
    state.ball = { x: hole.x, y: hole.y + 2, vx: 0, vy: -50 };
    step(state, 1 / 60);
    expect(state.score).toBe(30);
    expect(state.ball).toBeNull();
  });

  it('lets a fast ball roll over a hole', () => {
    const hole = HOLES.find((h) => h.value === 10)!;
    const state = createState();
    state.ball = { x: hole.x, y: hole.y + 2, vx: 0, vy: -500 };
    step(state, 1 / 60);
    expect(state.score).toBe(0);
    expect(state.ball).not.toBeNull();
  });

  it('scores nothing for a ball too weak to reach the holes', () => {
    const state = createState();
    roll(state, LAUNCH.x, 0, 0);
    settle(state);
    expect(state.score).toBe(0);
    expect(state.drops.at(-1)!.value).toBe(0);
  });

  it('scores nothing for a ball that rolls past every hole into the back gutter', () => {
    const state = createState();
    state.ball = { x: LANE.left + 20, y: LANE.top + 12, vx: 0, vy: -600 };
    step(state, 1 / 60);
    expect(state.score).toBe(0);
    expect(state.ball).toBeNull();
  });

  it('drops a straight roll at the right power into a hole', () => {
    const state = createState();
    roll(state, LAUNCH.x, 0, 0.45);
    settle(state);
    expect(state.score).toBeGreaterThan(0);
  });

  it('bounces off the side walls', () => {
    const state = createState();
    state.ball = { x: LANE.left + 10, y: 400, vx: -300, vy: -100 };
    step(state, 1 / 60);
    expect(state.ball!.vx).toBeGreaterThan(0);
    expect(state.ball!.x).toBeGreaterThanOrEqual(LANE.left);
  });

  it('ends the round once the last ball has settled', () => {
    const state = createState();
    state.ballsLeft = 1;
    roll(state, LAUNCH.x, 0, 0);
    step(state, 1 / 60);
    expect(state.phase).toBe('playing');
    settle(state);
    expect(state.phase).toBe('over');
    expect(roll(state, LAUNCH.x, 0, 0.5)).toBe(false);
  });

  it('makes smaller holes worth more', () => {
    for (const a of HOLES) {
      for (const b of HOLES) {
        if (a.radius < b.radius) expect(a.value).toBeGreaterThan(b.value);
      }
    }
  });

  it('finds the hole under a point, and none between holes', () => {
    expect(holeAt(HOLES[0].x, HOLES[0].y)).toBe(HOLES[0]);
    expect(holeAt(LANE.left + 5, 300)).toBeUndefined();
  });

  it('fills the power over the charge time, then drains it', () => {
    expect(powerFor(0)).toBe(0);
    expect(powerFor(CHARGE_TIME / 2)).toBeCloseTo(0.5);
    expect(powerFor(CHARGE_TIME)).toBeCloseTo(1);
    expect(powerFor(CHARGE_TIME * 1.5)).toBeCloseTo(0.5);
  });
});
