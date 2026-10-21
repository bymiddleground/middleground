"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";

/** Move each existing masonry column as a unit without changing its layout. */
export function FlowScroll() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.parentElement;
    const canvas = root?.querySelector<HTMLElement>("[data-mosaic]");
    if (!canvas) return;
    const tiles = Array.from(canvas.querySelectorAll<HTMLElement>("[data-tile]"));
    const desktop = window.matchMedia("(min-width: 1200px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let groups: HTMLElement[][] = [];
    let previous = -1;
    const reset = () => {
      tiles.forEach(tile => tile.style.removeProperty("translate"));
      const positions = [...new Set(tiles.map(tile => tile.offsetLeft))].sort((a, b) => a - b);
      groups = positions.map(left => tiles.filter(tile => tile.offsetLeft === left));
      previous = -1;
    };
    const rates = [0.12, -0.08, 0.16, -0.11];
    const update = () => {
      if (!desktop.matches || reduced.matches || previous === window.scrollY) return;
      previous = window.scrollY;
      const distance = Math.max(0, previous - 700);
      const progress = Math.min(1, distance / 300);
      const ramp = progress * progress * (3 - 2 * progress);
      groups.forEach((group, column) => {
        // Bounded drift avoids accumulating huge offsets on a long page.
        const offset = Math.sin(distance * rates[column % rates.length] / 72) * 27.72 * ramp;
        group.forEach(tile => { tile.style.translate = `0 ${offset}px`; });
      });
    };
    reset();
    const observer = new ResizeObserver(reset);
    observer.observe(canvas);
    desktop.addEventListener("change", reset);
    reduced.addEventListener("change", reset);
    gsap.ticker.add(update);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", reset);
      reduced.removeEventListener("change", reset);
      gsap.ticker.remove(update);
      tiles.forEach(tile => tile.style.removeProperty("translate"));
    };
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}
