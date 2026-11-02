# Whack-a-Mole

Whack the moles as they pop up from the nine holes, before they duck back down.

## How to play

- Moles pop up from a 3 by 3 grid of holes and stay up for a short time.
- Click a mole while it's up to whack it.
- The round lasts 30 seconds. As the clock runs down, moles pop up more often
  and duck back down sooner: at the start a mole pops up every second and stays
  up for 1.2 seconds, and by the end one pops up every 0.35 seconds and stays up
  for 0.6 seconds.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Missing costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `spawnInterval`,
  `upTime`) and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
