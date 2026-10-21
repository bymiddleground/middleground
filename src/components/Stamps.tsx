"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./Stamps.module.css";

/**
 * How long a mark lasts, in milliseconds, from pressed to gone. The stylesheet
 * animates the whole span — the press, the hold, the fade — and this is what
 * clears it out of the page afterwards, so the two are the same figure.
 */
const LIFE = 2600;

/**
 * A ceiling on the marks at once, should someone click faster than they fade.
 * Each is a stack of strips rather than a single image, so this is lower than
 * it would otherwise need to be.
 */
const KEPT = 12;

/** Strips a mark is cut into. Matches the divisor in the stylesheet. */
const STRIPS = 10;

/** How far the mark may lean either way, in degrees. Hand-stamped, not printed. */
const LEAN = 14;
const FINISHES = ["original", "chrome", "embossed"] as const;
type Finish = typeof FINISHES[number];

/**
 * How far the pointer may travel between press and release and still count as
 * a click rather than a drag across the page or a swipe down it.
 */
const SLOP = 8;

type Stamp = {
  id: number;
  /** Where it landed, as a share of the surface, so it holds on a resize. */
  x: number;
  y: number;
  lean: number;
  finish: Finish;
};

/**
 * The studio's mark, stamped wherever you click the page.
 *
 * It listens on its own parent rather than laying a sheet over it: a sheet
 * would take every pointer event the page beneath it wants — the marquee's
 * hover on about, the address on contact. The marks themselves take none.
 */
export function Stamps() {
  const layer = useRef<HTMLDivElement>(null);
  // Counted rather than timed: two clicks can share a millisecond, and two
  // marks sharing a key would have React reuse one element for both.
  const nextId = useRef(0);
  const lastFinish = useRef<Finish | null>(null);
  const [stamps, setStamps] = useState<Stamp[]>([]);

  useEffect(() => {
    const surface = layer.current?.parentElement;
    if (!surface) return;

    let pressed: { x: number; y: number } | null = null;
    const timers = new Set<number>();

    const onPointerDown = (event: PointerEvent) => {
      pressed = { x: event.clientX, y: event.clientY };
    };

    const onClick = (event: MouseEvent) => {
      const from = pressed;
      pressed = null;

      // Anything that does something of its own keeps its click.
      const target = event.target as Element | null;
      if (target?.closest("a, button, input, textarea, [role='button']")) {
        return;
      }

      // A drag across the page, or a swipe down it, is not a click.
      if (
        from &&
        Math.hypot(event.clientX - from.x, event.clientY - from.y) > SLOP
      ) {
        return;
      }

      // Nor is the release at the end of selecting a line of the copy.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

      const box = surface.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;

      const id = (nextId.current += 1);
      const choices = FINISHES.filter(finish => finish !== lastFinish.current);
      const finish = choices[Math.floor(Math.random() * choices.length)];
      lastFinish.current = finish;

      setStamps((previous) => [
        ...previous.slice(-(KEPT - 1)),
        {
          id,
          finish,
          x: ((event.clientX - box.left) / box.width) * 100,
          y: ((event.clientY - box.top) / box.height) * 100,
          lean: Math.random() * LEAN * 2 - LEAN,
        },
      ]);

      // Gone from the page once it has finished fading from view.
      const clear = window.setTimeout(
        () => setStamps((previous) => previous.filter((mark) => mark.id !== id)),
        LIFE,
      );
      timers.add(clear);
    };

    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("click", onClick);
    return () => {
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("click", onClick);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div ref={layer} className={styles.layer} aria-hidden="true">
      {stamps.map((stamp) => (
        <div
          key={stamp.id}
          className={styles.stamp}
          data-finish={stamp.finish}
          style={
            {
              left: `${stamp.x}%`,
              top: `${stamp.y}%`,
              "--lean": `${stamp.lean}deg`,
              "--life": `${LIFE}ms`,
            } as React.CSSProperties
          }
        >
          <div className={styles.sheet}>
            <Strip index={0} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * One strip of the mark, holding the next inside it.
 *
 * Nested rather than laid side by side: each strip turns against the one above
 * it, and nesting is what makes those turns accumulate into a roll. Laid out
 * as siblings, each would have to be told the sum of every turn before it.
 */
function Strip({ index }: { index: number }) {
  if (index >= STRIPS) return null;

  return (
    <div
      className={styles.slice}
      style={{ "--i": index } as React.CSSProperties}
    >
      <Strip index={index + 1} />
    </div>
  );
}
