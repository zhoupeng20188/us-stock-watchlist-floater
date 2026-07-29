# Floating Ball: Drag vs. Hover-Expand Conflict

## Symptoms

1. Dragging the ball triggers the hover handler and expands the detail panel; the panel suddenly grows, so the ball gets stuck when dragged to the screen edge.
2. Releasing the mouse outside the window or at the screen edge loses the `mouseup` event; the ball keeps following the cursor after release.
3. After hover-expanding the details, dragging does nothing (initially only the title bar was draggable; pressing other areas of the panel had no effect).

## Root Causes

- When dragging to an edge, the ball's position is clamped; the cursor briefly leaves and re-enters the ball, re-triggering `mouseenter`. The 150ms hover timer expands the panel, and the sudden size change breaks the clamping math.
- The drag state was cleared only by `mouseup`, which is lost when released outside the window, leaving a stale `dragState`.
- Dragging the expanded panel was bound only to the title bar (`data-drag`); pressing the panel body did not start a drag.

## Solution (content.js `bindEvents`)

1. **`suppressHover` hard switch**: set to `true` on `mousedown` drag-start and cleared only on `mouseleave` (cursor fully leaves the ball). Checked both at the `mouseenter` entry and inside the hover timer callback — the panel never expands during a drag or while the cursor rests on the ball after release; it must leave and re-enter.
2. **`mousemove` button fallback**: on every move, check `e.buttons === 0`; if the button is already up, force-end the drag instead of relying solely on `mouseup`. A `window.blur` listener is a further fallback (switching windows mid-drag).
3. **`mouseenter` checks `e.buttons > 0`**: entering the ball while holding the mouse button never expands.
4. **Collapse on drag in expanded state**: once movement exceeds the 5px threshold in expanded state, collapse to the circle immediately and center it on the cursor (recompute `offsetX/offsetY`) to avoid jumps from the size change.
5. **Whole panel draggable**: in expanded state, pressing anywhere on the panel starts a drag (`e.preventDefault()` prevents text selection while dragging).

## Key Code Locations

- `suppressHover` definition: inside `bindEvents`
- `mouseenter` / `mouseleave`: hover-expand and clearing the suppress switch
- `mousedown`: drag start, sets `suppressHover`
- `mousemove`: button fallback, collapse-in-expanded-state, edge clamping
- `mouseup` / `window.blur`: drag end
