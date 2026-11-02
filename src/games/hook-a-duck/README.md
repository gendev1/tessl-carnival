# Hook a Duck

Rubber ducks float round a stream. Lower the hook on a duck as it passes to catch it.

## How to play

- Move the mouse to aim the hook. The dashed ring shows where it will land.
- Click to lower the hook. It takes half a second to reach the water, so aim a
  little ahead of the duck you want.
- You have 8 casts. The round ends when the last hook has landed.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. A cast
that lands in open water scores nothing. A caught duck goes back in the stream,
so it can be caught again.

The ten ducks are numbered 1, 2, 1, 3, 1, 5, 2, 1, 3 and 10.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
