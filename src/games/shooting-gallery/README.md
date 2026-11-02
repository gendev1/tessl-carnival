# Shooting Gallery

Pick off the targets sliding across the booth before your time or your shots
run out.

## How to play

- Move the mouse to aim, and click to fire.
- You have 20 shots and 40 seconds. The round ends when either runs out.
- Click again on the game over screen to play another round.

## Scoring

Faster and smaller targets score more. Each hit scores 10 points for every
60 px/s of speed, plus 10 points for every 10 px of radius under 40, both
rounded up:

| Row    | Speed    | Radius | Points |
| ------ | -------- | ------ | ------ |
| Top    | 200 px/s | 16 px  | 70     |
| Middle | 130 px/s | 22 px  | 50     |
| Bottom | 70 px/s  | 30 px  | 30     |

Hits in a row build a streak. Every hit after the first in a streak adds a
bonus of 5 points for each hit before it in the streak: +5 for the second hit,
+10 for the third, and so on. A miss resets the streak.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `fire`, `step`, `scoreForHit`,
  `streakBonus`) and the `shootingGallery` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
