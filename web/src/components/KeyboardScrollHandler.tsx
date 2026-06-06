'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTORS = 'input, textarea, select, [contenteditable="true"]';
const ACTION_SELECTORS = `${EDITABLE_SELECTORS}, button, a, [role="button"], [role="link"]`;
const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay']);

const normalizeWheelDelta = (event: WheelEvent) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 40;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
};

const canScrollVertically = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return SCROLLABLE_OVERFLOW_VALUES.has(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
};

const findVerticalScrollContainer = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  let element: HTMLElement | null = target;

  while (element && element !== document.body && element !== document.documentElement) {
    if (canScrollVertically(element)) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
};

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

    const handleWheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaY) < Math.abs(event.deltaX)
      ) {
        return;
      }

      const deltaY = normalizeWheelDelta(event);
      if (Math.abs(deltaY) < 1) {
        return;
      }

      const scrollContainer = findVerticalScrollContainer(event.target);
      const pageBefore = window.scrollY;
      const elementBefore = scrollContainer?.scrollTop ?? null;

      requestAnimationFrame(() => {
        if (scrollContainer) {
          if (scrollContainer.scrollTop === elementBefore) {
            scrollContainer.scrollBy({ top: deltaY, behavior: 'auto' });
          }
          return;
        }

        if (window.scrollY === pageBefore) {
          window.scrollBy({ top: deltaY, behavior: 'auto' });
        }
      });
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    document.addEventListener('wheel', handleWheel, { capture: true, passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  return null;
}
