# Balloon Darts

Pop the balloons on the wall before your darts run out.

## How to play

- Move the mouse to aim, and click to throw a dart at the crosshair.
- You have 8 darts. The round ends when the last dart has landed.
- Click again on the game over screen to play another round.

## Scoring

A dart that lands on a balloon pops it. Smaller balloons are harder to hit and
score more:

| Balloon | Radius | Points |
| ------- | ------ | ------ |
| Small   | 16 px  | 30     |
| Medium  | 22 px  | 20     |
| Large   | 28 px  | 10     |

A dart that misses scores nothing and stays stuck in the wall. A popped balloon
is gone for the rest of the round.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwDart`, `step`, `isHit`,
  `dartPosition`) and the `balloonDarts` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
