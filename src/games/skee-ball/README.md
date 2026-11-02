# Skee-Ball

Roll the ball up the ramp and into the rings of holes. Smaller holes score more.

## How to play

- Move the mouse to aim. The dashed line shows where the ball will roll.
- Hold the mouse button down to charge the power meter, and let go to roll.
  The meter fills over 1.2 seconds, then drains again, so don't hold too long.
- A ball drops into a hole when it rolls over it slowly enough. A fast ball
  rolls straight over a hole, and a ball that rolls past every hole falls into
  the back gutter.
- You have 9 balls. The round ends when the last ball has stopped.
- Click again on the game over screen to play another round.

## Scoring

A ball that drops into a hole scores that hole's value. A ball that misses
every hole, by stopping short or reaching the back gutter, scores nothing.

| Hole                  | Size   | Points |
| --------------------- | ------ | ------ |
| Top corners           | Small  | 100    |
| Top middle            | Small  | 50     |
| Middle left and right | Medium | 40     |
| Middle                | Medium | 30     |
| Lower middle          | Large  | 20     |
| Bottom                | Large  | 10     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `roll`, `step`, `holeAt`, `powerFor`)
  and the `skeeBall` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
