'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTORS = 'input, textarea, select, [contenteditable="true"]';
const ACTION_SELECTORS = `${EDITABLE_SELECTORS}, button, a, [role="button"], [role="link"]`;

export default function KeyboardScrollHandler() {
  useEffect(() => {
    document.body.tabIndex = -1;
    requestAnimationFrame(() => document.body.focus({ preventScroll: true }));

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest(ACTION_SELECTORS)) {
        return;
      }

      document.body.focus({ preventScroll: true });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const activeElement = document.activeElement;

      if (activeElement instanceof HTMLElement && activeElement.matches(EDITABLE_SELECTORS)) {
        return;
      }

      const viewportStep = Math.max(window.innerHeight * 0.82, 360);
      const lineStep = 80;
      const scrollOptions: ScrollToOptions = { behavior: 'smooth' };

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          window.scrollBy({ ...scrollOptions, top: lineStep });
          break;
        case 'ArrowUp':
          event.preventDefault();
          window.scrollBy({ ...scrollOptions, top: -lineStep });
          break;
        case 'PageDown':
          event.preventDefault();
          window.scrollBy({ ...scrollOptions, top: viewportStep });
          break;
        case 'PageUp':
          event.preventDefault();
          window.scrollBy({ ...scrollOptions, top: -viewportStep });
          break;
        case 'Home':
          event.preventDefault();
          window.scrollTo({ ...scrollOptions, top: 0 });
          break;
        case 'End':
          event.preventDefault();
          window.scrollTo({ ...scrollOptions, top: document.documentElement.scrollHeight });
          break;
        case ' ':
          if (activeElement instanceof HTMLElement && activeElement.closest(ACTION_SELECTORS)) {
            return;
          }

          event.preventDefault();
          window.scrollBy({ ...scrollOptions, top: viewportStep });
          break;
        default:
          break;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}
