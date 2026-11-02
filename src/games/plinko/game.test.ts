import { describe, expect, it } from 'vitest';
import {
  DISCS_PER_ROUND,
  DISC_RADIUS,
  FLOOR,
  PEG_RADIUS,
  SLOT_TOP,
  SLOT_VALUES,
  SLOT_WIDTH,
  bounceOffPeg,
  clampDrop,
  createState,
  dropDisc,
  slotAt,
  step,
} from './game';

/** Steps until the falling disc lands, or gives up after `seconds`. */
function settle(state: ReturnType<typeof createState>, seconds = 20) {
  for (let t = 0; t < seconds && state.disc; t += 0.05) step(state, 0.05);
}

describe('plinko', () => {
  it('starts with every disc and no score', () => {
    const state = createState();
    expect(state.discsLeft).toBe(DISCS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.pegs.length).toBeGreaterThan(0);
  });

  it('uses one disc per drop', () => {
    const state = createState();
    expect(dropDisc(state, 400)).toBe(true);
    expect(state.discsLeft).toBe(DISCS_PER_ROUND - 1);
    expect(state.disc).toBeDefined();
  });

  it('drops one disc at a time', () => {
    const state = createState();
    dropDisc(state, 400);
    expect(dropDisc(state, 200)).toBe(false);
    expect(state.discsLeft).toBe(DISCS_PER_ROUND - 1);
  });

  it('cannot drop once the discs are gone', () => {
    const state = createState();
    state.discsLeft = 0;
    expect(dropDisc(state, 400)).toBe(false);
    expect(state.disc).toBeUndefined();
  });

  it('keeps the drop point on the board', () => {
    expect(clampDrop(-50)).toBe(DISC_RADIUS);
    expect(clampDrop(5000)).toBeLessThan(SLOT_WIDTH * SLOT_VALUES.length);
  });

  it('finds the slot under a point', () => {
    expect(slotAt(0)).toBe(0);
    expect(slotAt(SLOT_WIDTH * 4 + 1)).toBe(4);
    expect(slotAt(SLOT_WIDTH * SLOT_VALUES.length)).toBe(SLOT_VALUES.length - 1);
  });

  it('bounces a falling disc up and off a peg', () => {
    const peg = { x: 400, y: 200 };
    const disc = { x: 403, y: 200 - DISC_RADIUS, vx: 0, vy: 300 };
    expect(bounceOffPeg(disc, peg)).toBe(true);
    expect(disc.vy).toBeLessThan(0);
    expect(Math.hypot(disc.x - peg.x, disc.y - peg.y)).toBeCloseTo(DISC_RADIUS + PEG_RADIUS);
  });

  it('leaves a disc alone when it is clear of a peg', () => {
    const disc = { x: 400, y: 100, vx: 0, vy: 300 };
    expect(bounceOffPeg(disc, { x: 400, y: 200 })).toBe(false);
    expect(disc.vy).toBe(300);
  });

  it('scores the value of the slot a disc lands in', () => {
    const state = createState();
    state.disc = { x: SLOT_WIDTH * 4.5, y: FLOOR - DISC_RADIUS - 1, vx: 0, vy: 100, slot: 4 };
    step(state, 0.05);
    expect(state.disc).toBeUndefined();
    expect(state.score).toBe(SLOT_VALUES[4]);
  });

  it('keeps a disc in its slot once it falls below the pegs', () => {
    const state = createState();
    state.disc = { x: SLOT_WIDTH * 2.5, y: SLOT_TOP + 1, vx: 2000, vy: 0 };
    settle(state);
    expect(state.score).toBe(SLOT_VALUES[2]);
  });

  it('lands every disc in a slot, wherever it is dropped', () => {
    for (let x = 0; x <= SLOT_WIDTH * SLOT_VALUES.length; x += 37) {
      const state = createState();
      dropDisc(state, x, () => 0.5);
      settle(state);
      expect(state.disc, `dropped at ${x}`).toBeUndefined();
      expect(SLOT_VALUES).toContain(state.score);
    }
  });

  it('ends the round when the last disc lands', () => {
    const state = createState();
    for (let i = 0; i < DISCS_PER_ROUND; i++) {
      expect(state.phase).toBe('playing');
      dropDisc(state, 100 + i * 150);
      settle(state);
    }
    expect(state.phase).toBe('over');
    expect(state.score).toBeGreaterThan(0);
  });

  it('keeps playing while the last disc is still falling', () => {
    const state = createState();
    state.discsLeft = 1;
    dropDisc(state, 400);
    step(state, 0.05);
    expect(state.phase).toBe('playing');
  });
});
