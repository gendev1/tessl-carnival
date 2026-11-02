import { describe, expect, it } from 'vitest';
import {
  BELL_BONUS,
  PUCK_TIME,
  START_SPEED,
  SPEED_UP,
  SWINGS,
  TOP_HEIGHT,
  createState,
  heightFor,
  puckHeight,
  scoreForSwing,
  step,
  swing,
  type HighStrikerState,
} from './game';

/** Lets the puck climb and fall back so the next swing can happen. */
function land(state: HighStrikerState) {
  step(state, PUCK_TIME * 2);
}

describe('high striker', () => {
  it('starts with every swing left and no score', () => {
    const state = createState();
    expect(state.swingsLeft).toBe(SWINGS);
    expect(state.score).toBe(0);
    expect(state.speed).toBe(START_SPEED);
    expect(state.phase).toBe('playing');
  });

  it('sends the puck higher the closer the meter is to the center', () => {
    expect(heightFor(0)).toBe(TOP_HEIGHT);
    expect(heightFor(0.5)).toBe(50);
    expect(heightFor(-0.5)).toBe(50);
    expect(heightFor(0.9)).toBe(10);
    expect(heightFor(1)).toBe(0);
    expect(heightFor(0.2)).toBeGreaterThan(heightFor(0.6));
  });

  it('scores the height, with a bonus for ringing the bell', () => {
    expect(scoreForSwing(0.5)).toBe(50);
    expect(scoreForSwing(0.03)).toBe(TOP_HEIGHT + BELL_BONUS);
    expect(scoreForSwing(0.1)).toBe(90);
  });

  it('rings the bell only when the puck reaches the top', () => {
    const state = createState();
    state.meter = 0.4;
    swing(state);
    expect(state.bell).toBe(0);
    land(state);
    state.meter = 0;
    swing(state);
    expect(state.bell).toBeGreaterThan(0);
  });

  it('adds the swing to the score and uses one swing', () => {
    const state = createState();
    state.meter = 0.25;
    expect(swing(state)).toBe(true);
    expect(state.score).toBe(75);
    expect(state.swingsLeft).toBe(SWINGS - 1);
    expect(state.puck?.height).toBe(75);
  });

  it('speeds the meter up after each swing', () => {
    const state = createState();
    swing(state);
    expect(Math.abs(state.speed)).toBeCloseTo(START_SPEED * SPEED_UP);
    land(state);
    swing(state);
    expect(Math.abs(state.speed)).toBeCloseTo(START_SPEED * SPEED_UP * SPEED_UP);
  });

  it('cannot swing again while the puck is still moving', () => {
    const state = createState();
    swing(state);
    step(state, PUCK_TIME);
    expect(swing(state)).toBe(false);
    expect(state.swingsLeft).toBe(SWINGS - 1);
  });

  it('moves the puck up and back down', () => {
    const puck = { height: 80, age: 0 };
    expect(puckHeight(puck)).toBe(0);
    expect(puckHeight({ ...puck, age: PUCK_TIME })).toBe(80);
    expect(puckHeight({ ...puck, age: PUCK_TIME * 1.5 })).toBeCloseTo(40);
    expect(puckHeight(null)).toBe(0);
  });

  it('swings the meter back and forth along the bar', () => {
    const state = createState();
    expect(state.meter).toBe(-1);
    step(state, 0.05);
    expect(state.meter).toBeGreaterThan(-1);
    for (let i = 0; i < 200; i++) {
      step(state, 0.05);
      expect(state.meter).toBeGreaterThanOrEqual(-1);
      expect(state.meter).toBeLessThanOrEqual(1);
    }
    const before = Math.sign(state.speed);
    step(state, 1 / Math.abs(state.speed));
    expect(Math.sign(state.speed)).toBe(-before);
  });

  it('ends the round once the last puck lands', () => {
    const state = createState();
    for (let i = 0; i < SWINGS; i++) {
      expect(swing(state)).toBe(true);
      if (i < SWINGS - 1) land(state);
    }
    expect(state.phase).toBe('playing');
    expect(swing(state)).toBe(false);
    land(state);
    expect(state.phase).toBe('over');
    expect(swing(state)).toBe(false);
  });
});
