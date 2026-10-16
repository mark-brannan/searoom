import type { KeyboardEvent } from 'react';

// Arrow-key navigation for a row of role="radio" / role="tab" buttons: the
// arrows (and Home / End) move focus to the neighbour and select it, wrapping
// at the ends. Put it on the group element; the selected button carries
// tabIndex 0 and the rest -1, so Tab enters and leaves the group in one stop.
export function rovingKeyDown(e: KeyboardEvent<HTMLElement>): void {
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"],[role="tab"]'),
  );
  const at = items.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  let to: number;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      to = (at + 1) % items.length;
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      to = (at - 1 + items.length) % items.length;
      break;
    case 'Home':
      to = 0;
      break;
    case 'End':
      to = items.length - 1;
      break;
    default:
      return;
  }
  e.preventDefault();
  items[to].focus();
  items[to].click();
}
