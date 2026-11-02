import { describe, expect, it } from 'vitest';
import {
  BALLOON_SIZES,
  DARTS_PER_ROUND,
  FLIGHT_TIME,
  THROWER,
  createState,
  dartPosition,
  isHit,
  step,
  throwDart,
  type Balloon,
} from './game';

const balloon: Balloon = {
  x: 400,
  y: 200,
  radius: 22,
  points: 20,
  color: 'red',
  popped: false,
};

describe('balloon darts', () => {
  it('starts with a full hand of darts, a wall of balloons and no score', () => {
    const state = createState();
    expect(state.dartsLeft).toBe(DARTS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.balloons.length).toBeGreaterThan(0);
    expect(state.balloons.every((b) => !b.popped)).toBe(true);
  });

  it('fills the wall with every size and a few colors', () => {
    const state = createState();
    const radii = new Set(state.balloons.map((b) => b.radius));
    expect(radii).toEqual(new Set(BALLOON_SIZES.map((s) => s.radius)));
    expect(new Set(state.balloons.map((b) => b.color)).size).toBeGreaterThan(1);
  });

  it('scores smaller balloons higher', () => {
    for (let i = 1; i < BALLOON_SIZES.length; i++) {
      expect(BALLOON_SIZES[i].radius).toBeGreaterThan(BALLOON_SIZES[i - 1].radius);
      expect(BALLOON_SIZES[i].points).toBeLessThan(BALLOON_SIZES[i - 1].points);
    }
  });

  it('uses one dart per throw', () => {
    const state = createState();
    expect(throwDart(state, 400, 200)).toBe(true);
    expect(state.dartsLeft).toBe(DARTS_PER_ROUND - 1);
    expect(state.darts).toHaveLength(1);
  });

  it('cannot throw once the darts run out', () => {
    const state = createState();
    state.dartsLeft = 0;
    expect(throwDart(state, 400, 200)).toBe(false);
    expect(state.darts).toHaveLength(0);
  });

  it('flies the dart from the thrower to the aim point', () => {
    const dart = { fromX: THROWER.x, fromY: THROWER.y, toX: 100, toY: 100, age: 0 };
    expect(dartPosition(dart)).toEqual({ x: THROWER.x, y: THROWER.y });
    expect(dartPosition({ ...dart, age: FLIGHT_TIME })).toEqual({ x: 100, y: 100 });
  });

  it('pops a balloon the dart lands on and scores its points', () => {
    const state = createState();
    state.balloons = [{ ...balloon }];
    throwDart(state, balloon.x + 5, balloon.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.balloons[0].popped).toBe(false);
    step(state, FLIGHT_TIME);
    expect(state.balloons[0].popped).toBe(true);
    expect(state.score).toBe(balloon.points);
    expect(state.darts).toHaveLength(0);
  });

  it('scores nothing for a miss and leaves the dart in the wall', () => {
    const state = createState();
    state.balloons = [{ ...balloon }];
    throwDart(state, 50, 50);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.balloons[0].popped).toBe(false);
    expect(state.stuck).toEqual([{ x: 50, y: 50 }]);
  });

  it('cannot pop the same balloon twice', () => {
    const state = createState();
    state.balloons = [{ ...balloon }];
    throwDart(state, balloon.x, balloon.y);
    throwDart(state, balloon.x, balloon.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(balloon.points);
  });

  it('detects a hit inside the balloon and a miss outside it', () => {
    expect(isHit(410, 210, balloon)).toBe(true);
    expect(isHit(460, 200, balloon)).toBe(false);
    expect(isHit(400, 200, { ...balloon, popped: true })).toBe(false);
  });

  it('keeps playing while the last dart is still in the air', () => {
    const state = createState();
    state.dartsLeft = 1;
    throwDart(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the last dart has landed', () => {
    const state = createState();
    state.dartsLeft = 1;
    throwDart(state, 400, 200);
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
    expect(throwDart(state, 400, 200)).toBe(false);
  });
});
