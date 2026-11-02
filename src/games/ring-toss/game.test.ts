import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  RINGS_PER_ROUND,
  SWAY,
  aimPoint,
  bottleAt,
  createState,
  step,
  toss,
} from './game';

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.flying).toHaveLength(1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.flying).toHaveLength(0);
  });

  it('scores a ring that lands on a bottle neck, once it lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    toss(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
    expect(state.landed[0].bottle).toBe(bottle);
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    toss(state, 10, 450);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.landed[0].bottle).toBeUndefined();
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('only counts a ring within the neck', () => {
    const bottle = { x: 100, y: 100, neck: 10, points: 30 };
    expect(bottleAt([bottle], 106, 106)).toBe(bottle);
    expect(bottleAt([bottle], 115, 100)).toBeUndefined();
  });

  it('sways the aim to either side of the pointer', () => {
    const state = createState();
    expect(aimPoint(state, 400, 200)).toEqual({ x: 400, y: 200 });
    state.time = Math.PI / 6;
    expect(aimPoint(state, 400, 200).x).toBeCloseTo(400 + SWAY);
  });

  it('ends the round when the rings run out and the last ring has landed', () => {
    const state = createState();
    state.rings = 1;
    toss(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
  });
});
