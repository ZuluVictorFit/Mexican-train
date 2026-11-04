# Play-interaction storyboard

Status: first interactive study, not final production behavior. The confirmed
hand controls and visual direction are in [UI and interaction design](README.md).
The prototype uses a fixed sample table, not the actual rules or a network game.

See the working prototype's [table view](prototype-table.png) and
[full-screen hand](prototype-hand.png). These are screenshots, not new generated
concept art; use the prototype itself to assess the interaction.

## Proposed sequence

1. **Waiting at the table.** The table is shown from a seated angle. Your private
   hand remains flat and available to arrange. The prototype's **Table
   perspective** button demonstrates this state; **Playing view** returns to the
   clearer active view. Moves are disabled while the sample says it is waiting.
2. **Arrange your hand.** Drag numbered tiles anywhere within the hand workspace,
   including partial overlap. Click or tap flips the two ends; **R** or the Rotate
   control turns the tile 90 degrees. A movement larger than the drag threshold
   never flips the tile.
3. **Make more room.** **Expand hand** opens the full-screen hand workspace;
   **Back to table** closes it. Scroll to reach the larger workspace. **Fit hand**
   changes the view without rearranging tiles; **Actual size** restores the view.
4. **Choose a tile.** Select a tile in either view. Matching sample endpoints glow.
   In the full-screen workspace, **Play selected** returns to the board with that
   tile selected. No tile leaves the hand yet.
5. **Choose a destination.** Click or tap a glowing endpoint, or drag a tile
   from the compact hand directly onto it. The sample permits matching tile
   values on the three visible sample endpoints. The final game must use the
   authoritative rules engine, including opening restrictions and exposed doubles.
6. **Recover from a mistake.** A nonmatching endpoint or a drop outside the hand
   and endpoint leaves the tile in its original hand position. Escape cancels a
   drag, closes the full-screen view, or clears the current selection. Accepted
   sample moves remove the chosen tile; **Reset sample** restores the examples.

## Things to review

- Is the placement sequence clear, especially returning from the full-screen hand?
- Is the compact hand useful enough while waiting, and is the expanded workspace
  large enough for your longest chains?
- Does the camera change make the table easier to read without being distracting?
- Do drag, click/tap, and the keyboard controls feel comfortable on real hardware?
- Are the tile numerals large and distinguishable, particularly 6 and 9?

The prototype keeps sample state only in the same browser's local storage. It
does not connect players, enforce Mexican Train rules, handle actual turns,
produce a legal deal, or implement sound, host controls, or themes. Its sample
board positions and number colors are illustrative, not final assets or a
tested accessibility palette. Test on a real tablet before approving touch feel.
