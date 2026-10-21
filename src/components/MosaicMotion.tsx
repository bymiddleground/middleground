"use client";

import { useEffect } from "react";

import {
  EASE,
  gsap,
  markRevealed,
  prefersReducedMotion,
  whenVisible,
} from "@/lib/motion";

/**
 * The mosaic's entrance: tiles arrive in a diagonal stagger, ordered by distance
 * from the top-left, so the grid fills in across the grain rather than row by
 * row. Only the first pass of the mosaic is animated — the repeat that makes the
 * loop seamless starts in place, far below the fold.
 *
 * Scroll behaviour lives in MosaicScroll. Split out as a client component so the
 * mosaic itself can stay a server component; it locates the canvas in the DOM
 * rather than taking a ref across the boundary.
 */
export function MosaicMotion({ delay = 0 }: { delay?: number } = {}) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-copy="0"]');
    if (!root) return;

    const tiles = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
    if (tiles.length === 0) return;

    if (prefersReducedMotion()) {
      markRevealed(tiles);
      return;
    }

    return whenVisible(() => {
      const context = gsap.context(() => {
        const ordered = [...tiles].sort((a, b) => weight(a) - weight(b));

        gsap.fromTo(
          ordered,
          { opacity: 0, scale: 0.97 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: EASE,
            stagger: 0.045,
            delay: window.scrollY > 4 ? 0 : delay,
            onComplete: () => markRevealed(tiles),
          },
        );
      }, root);

      return () => context.revert();
    });
  }, [delay]);

  return null;
}

/** Distance from the canvas origin, used to order the entrance stagger. */
function weight(element: HTMLElement) {
  return element.offsetLeft * 0.6 + element.offsetTop;
}
