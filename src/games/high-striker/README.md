# High Striker

Swing the mallet hard enough to send the puck up the tower and ring the bell.

## How to play

- A meter swings back and forth along the power bar under the tower.
- Press Space or click to swing the mallet. The closer the meter is to the
  center of the bar, the higher the puck climbs.
- The meter gets 20% faster after every swing.
- You have 5 swings. The round ends when the last puck falls back down.
- Click or press Space on the game over screen to play another round.

## Scoring

A swing scores the height the puck reaches, from 0 at either end of the bar to
100 at the center: 100 times one minus the meter's distance from the center,
rounded. A swing within 5% of the center sends the puck to the top, which rings
the bell for a 50 point bonus, so a perfect swing is worth 150.

| Meter              | Height | Points |
| ------------------ | ------ | ------ |
| Center (within 5%) | 100    | 150    |
| Halfway to an end  | 50     | 50     |
| At either end      | 0      | 0      |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `swing`, `step`, `heightFor`,
  `scoreForSwing`, `puckHeight`) and the `highStriker` entry, the default export
  the midway finds.
- `game.test.ts`: tests for the game logic.
