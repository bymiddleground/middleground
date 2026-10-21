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
 * When the mosaic starts, in seconds — see the timeline below. It overlaps the
 * tail of the opening slightly, so the page never sits still.
 */
export const MOSAIC_DELAY = 1.8;

/** Openings already played this session, so returning does not replay them. */
const played = new Set<string>();

/**
 * A page's opening.
 *
 * The element marked `data-intro="mark"` arrives on its own in the middle of
 * the screen, holds a beat, then travels to its real place; everything marked
 * `data-intro="rest"` follows it in; the artwork comes last, held back by
 * MOSAIC_DELAY.
 *
 * It runs once a session. The navigation is part of it on the homepage, and it
 * lives above the routed content precisely so it can survive a route change —
 * replaying its entrance every time you came back would undo that.
 */
export function Intro({ id }: { id: string }) {
  useEffect(() => {
    const mark = document.querySelector<HTMLElement>('[data-intro="mark"]');
    const rest = gsap.utils.toArray<HTMLElement>('[data-intro="rest"]');
    const everything = [mark, ...rest].filter(Boolean) as HTMLElement[];

    if (everything.length === 0) return;

    if (played.has(id) || prefersReducedMotion() || !mark) {
      markRevealed(everything);
      return;
    }

    return whenVisible(() => {
      let context: ReturnType<typeof gsap.context> | undefined;
      let frame = 0;
      const reveal = () => {
        context?.revert();
        window.removeEventListener("scroll", onScroll);
        markRevealed(everything);
        played.add(id);
      };
      const onScroll = () => { if (window.scrollY > 4) reveal(); };
      window.addEventListener("scroll", onScroll, { passive: true });
      // Give the browser time to restore its saved position before starting.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (window.scrollY > 4 || played.has(id)) {
            reveal();
            return;
          }
          context = gsap.context(() => {
        // Anchor the opening to the top of the document, never the restored viewport.
        const box = mark.getBoundingClientRect();
        const shift = {
          x: window.innerWidth / 2 - box.width / 2 - box.left,
          y: window.innerHeight / 2 - box.height / 2 - (box.top + window.scrollY),
        };

        gsap
          .timeline({
            onComplete: () => {
              // An interrupted opening (including React's development effect
              // replay) hasn't been seen yet and must be allowed to restart.
              played.add(id);
              window.removeEventListener("scroll", onScroll);
              markRevealed(everything);
            },
          })
          .fromTo(
            mark,
            { opacity: 0, scale: 0.7, x: shift.x, y: shift.y },
            { opacity: 1, scale: 1, duration: 0.8, ease: EASE },
          )
          .to(mark, { x: 0, y: 0, duration: 0.8, ease: "power3.inOut" }, "+=0.15")
          .fromTo(
            rest,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: EASE },
            "-=0.3",
          );
      });

        });
      });
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", onScroll);
        context?.revert();
      };
    });
  }, [id]);

  return null;
}
