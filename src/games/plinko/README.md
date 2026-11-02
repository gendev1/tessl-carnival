# Plinko

Drop discs through a board of pegs and see which slot they land in.

## How to play

- Move the mouse along the board to pick the drop point, and click to drop a disc.
- The disc bounces off the pegs on its way down and lands in one of the slots at the bottom.
- One disc falls at a time. You have 5 discs, and the round ends when the last one lands.
- Click again on the game over screen to play another round.

## Scoring

Each disc scores the value of the slot it lands in. The slots, left to right:

| Slot   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   |
| ------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Points | 50  | 20  | 10  | 5   | 100 | 5   | 10  | 20  | 50  |

The middle slot is the 100 point jackpot. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `dropDisc`, `step`, `bounceOffPeg`,
  `slotAt`) and the `plinko` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
