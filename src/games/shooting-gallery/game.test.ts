import { describe, expect, it } from 'vitest';
import {
  ROUND_SECONDS,
  SHOTS_PER_ROUND,
  createState,
  fire,
  isHit,
  scoreForHit,
  step,
  streakBonus,
  type Target,
} from './game';

const target: Target = { x: 400, y: 200, radius: 22, speed: 130 };

function withOneTarget() {
  const state = createState();
  state.targets = [{ ...target }];
  return state;
}

describe('shooting gallery', () => {
  it('starts with a full round of shots, the full time and no score', () => {
    const state = createState();
    expect(state.shots).toBe(SHOTS_PER_ROUND);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('moves the rows at different speeds', () => {
    const speeds = new Set(createState().targets.map((t) => Math.abs(t.speed)));
    expect(speeds.size).toBeGreaterThan(1);
  });

  it('uses one shot per fire, hit or miss', () => {
    const state = withOneTarget();
    fire(state, target.x, target.y);
    fire(state, 10, 10);
    expect(state.shots).toBe(SHOTS_PER_ROUND - 2);
  });

  it('scores a hit and sends the target back to the start of its row', () => {
    const state = withOneTarget();
    expect(fire(state, target.x + 5, target.y)).toBe(scoreForHit(target));
    expect(state.score).toBe(scoreForHit(target));
    expect(state.targets[0].x).toBeLessThan(0);
  });

  it('scores nothing for a miss', () => {
    const state = withOneTarget();
    expect(fire(state, 10, 10)).toBe(0);
    expect(state.score).toBe(0);
  });

  it('builds a streak bonus on hits in a row', () => {
    const state = withOneTarget();
    fire(state, target.x, target.y);
    state.targets[0].x = target.x;
    fire(state, target.x, target.y);
    state.targets[0].x = target.x;
    fire(state, target.x, target.y);
    expect(state.streak).toBe(3);
    expect(state.score).toBe(3 * scoreForHit(target) + streakBonus(2) + streakBonus(3));
    expect(streakBonus(1)).toBe(0);
    expect(streakBonus(3)).toBeGreaterThan(streakBonus(2));
  });

  it('resets the streak on a miss', () => {
    const state = withOneTarget();
    fire(state, target.x, target.y);
    fire(state, 10, 10);
    expect(state.streak).toBe(0);
    state.targets[0].x = target.x;
    expect(fire(state, target.x, target.y)).toBe(scoreForHit(target));
  });

  it('ends the round when the shots run out', () => {
    const state = createState();
    state.shots = 1;
    fire(state, 10, 10);
    expect(state.phase).toBe('over');
    expect(fire(state, 10, 10)).toBeUndefined();
  });

  it('ends the round when the time runs out', () => {
    const state = createState();
    step(state, ROUND_SECONDS - 0.1);
    expect(state.phase).toBe('playing');
    step(state, 0.2);
    expect(state.timeLeft).toBe(0);
    expect(state.phase).toBe('over');
  });

  it('scores faster and smaller targets higher', () => {
    expect(scoreForHit({ ...target, speed: -200 })).toBeGreaterThan(scoreForHit(target));
    expect(scoreForHit({ ...target, radius: 14 })).toBeGreaterThan(scoreForHit(target));
  });

  it('gives each row a different score, top row highest', () => {
    const scores = [...new Set(createState().targets.map(scoreForHit))];
    expect(scores).toEqual([70, 50, 30]);
  });

  it('detects a hit inside the target and a miss outside it', () => {
    expect(isHit(410, 210, target)).toBe(true);
    expect(isHit(440, 200, target)).toBe(false);
  });

  it('wraps targets around the booth', () => {
    const state = withOneTarget();
    state.targets[0].x = 800 + target.radius;
    step(state, 0.1);
    expect(state.targets[0].x).toBeLessThan(0);
  });
});
