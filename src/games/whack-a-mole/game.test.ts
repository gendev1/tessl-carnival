import { describe, expect, it } from 'vitest';
import {
  MOLE_RADIUS,
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  createState,
  moleCenter,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

const first = () => 0;

describe('whack-a-mole', () => {
  it('starts with a full clock, no score and no moles up', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((h) => h.moleLeft === null)).toBe(true);
  });

  it('pops a mole up when the spawn timer runs out', () => {
    const state = createState();
    step(state, state.spawnIn, first);
    expect(state.holes[0].moleLeft).toBeGreaterThan(0);
    expect(state.holes.filter((h) => h.moleLeft !== null)).toHaveLength(1);
  });

  it('carries time past the spawn timer into the next countdown', () => {
    const state = createState();
    state.spawnIn = 0.01;
    step(state, 0.05, first);
    expect(state.spawnIn).toBeCloseTo(spawnInterval(state) - 0.04);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.spawnIn = 100;
    state.holes[0].moleLeft = 0.5;
    step(state, 0.6, first);
    expect(state.holes[0].moleLeft).toBeNull();
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    state.holes[4].moleLeft = 1;
    const center = moleCenter(state.holes[4]);
    expect(whack(state, center.x + 10, center.y - 10)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.holes[4].moleLeft).toBeNull();
  });

  it('misses an empty hole and a click outside the mole', () => {
    const state = createState();
    state.holes[4].moleLeft = 1;
    const empty = moleCenter(state.holes[0]);
    const center = moleCenter(state.holes[4]);
    expect(whack(state, empty.x, empty.y)).toBe(false);
    expect(whack(state, center.x + MOLE_RADIUS + 5, center.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('cannot whack the same mole twice', () => {
    const state = createState();
    state.holes[4].moleLeft = 1;
    const center = moleCenter(state.holes[4]);
    whack(state, center.x, center.y);
    expect(whack(state, center.x, center.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('pops moles up more often, and for less time, as the round goes on', () => {
    const early = createState();
    const late = createState();
    late.timeLeft = 2;
    expect(spawnInterval(late)).toBeLessThan(spawnInterval(early));
    expect(upTime(late)).toBeLessThan(upTime(early));
  });

  it('ends the round when the clock runs out and clears the moles', () => {
    const state = createState();
    state.holes[0].moleLeft = 5;
    step(state, ROUND_SECONDS, first);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((h) => h.moleLeft === null)).toBe(true);
  });

  it('ignores whacks once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    state.holes[4].moleLeft = 1;
    const center = moleCenter(state.holes[4]);
    expect(whack(state, center.x, center.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
