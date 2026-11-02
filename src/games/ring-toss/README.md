# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim, and click to throw a ring. The aim sways 30 px to
  either side of the pointer, so time your throw.
- A ring lands where the cross-hair was when you threw it, a moment later.
- You have 8 rings. The round ends when you are out of rings and the last ring
  has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands on a bottle's neck. Bottles further back have
thinner necks and score more:

| Row    | Neck radius | Points |
| ------ | ----------- | ------ |
| Back   | 10 px       | 30     |
| Middle | 12 px       | 20     |
| Front  | 14 px       | 10     |

A bottle can take more than one ring, and scores for each. Your final score is
saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `aimPoint`,
  `bottleAt`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
