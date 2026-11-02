import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CAST_TIME,
  DUCK_SPEED,
  HOOK_REACH,
  cast,
  createState,
  duckAt,
  duckPosition,
  step,
} from './game';

/** A state with a single duck, at the front of the stream. */
function oneDuck(value: number) {
  const state = createState();
  state.ducks = [{ angle: Math.PI / 2, value }];
  return state;
}

describe('hook a duck', () => {
  it('starts with every cast and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.cast).toBeNull();
  });

  it('uses one cast each time the hook is lowered', () => {
    const state = createState();
    expect(cast(state, 400, 400)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.cast).not.toBeNull();
  });

  it('cannot cast again while the hook is still dropping', () => {
    const state = createState();
    cast(state, 400, 400);
    expect(cast(state, 400, 400)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 400)).toBe(false);
  });

  it('scores the number on the duck the hook lands on', () => {
    const state = oneDuck(5);
    // Aim where the duck will be once the hook has dropped.
    const ahead = duckPosition({ angle: Math.PI / 2 + DUCK_SPEED * CAST_TIME, value: 5 });
    cast(state, ahead.x, ahead.y);
    step(state, CAST_TIME);
    expect(state.score).toBe(5);
    expect(state.cast).toBeNull();
    expect(state.catches).toHaveLength(1);
    // The caught duck goes back in the stream.
    expect(state.ducks).toHaveLength(1);
  });

  it('scores nothing when the hook lands in open water', () => {
    const state = oneDuck(5);
    const pos = duckPosition(state.ducks[0]);
    cast(state, pos.x, pos.y - 200);
    step(state, CAST_TIME);
    expect(state.score).toBe(0);
    expect(state.cast).toBeNull();
  });

  it('only catches a duck within reach of the hook', () => {
    const state = oneDuck(2);
    const pos = duckPosition(state.ducks[0]);
    expect(duckAt(state, pos.x + HOOK_REACH - 1, pos.y)).toBe(state.ducks[0]);
    expect(duckAt(state, pos.x + HOOK_REACH + 1, pos.y)).toBeUndefined();
  });

  it('floats the ducks round the stream in a loop', () => {
    const state = oneDuck(1);
    const start = duckPosition(state.ducks[0]);
    step(state, (Math.PI * 2) / DUCK_SPEED / 2);
    const halfway = duckPosition(state.ducks[0]);
    expect(halfway.y).toBeLessThan(start.y);
    step(state, (Math.PI * 2) / DUCK_SPEED / 2);
    const back = duckPosition(state.ducks[0]);
    expect(back.x).toBeCloseTo(start.x);
    expect(back.y).toBeCloseTo(start.y);
  });

  it('ends the round when the last cast has landed', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 400);
    step(state, CAST_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, CAST_TIME);
    expect(state.phase).toBe('over');
    expect(cast(state, 400, 400)).toBe(false);
  });
});
