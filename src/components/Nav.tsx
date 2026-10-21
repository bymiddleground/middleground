"use client";

import type { MouseEvent } from "react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ALT_HOME, navItems } from "@/data/site";

import { useNavigation } from "./PageTransition";
import styles from "./Nav.module.css";

/**
 * Where the minimised navigation cannot be opened by hovering it: a phone or
 * tablet, and any touch screen whatever its width. There it opens on a tap of
 * the pill for the page you are on.
 */
const NEEDS_TAP = "(max-width: 1199px), (hover: none)";

export function Nav({
  /**
   * Show only the page you are on, and the rest below it — on hover, on focus,
   * or on a tap where there is no pointer to hover with. Used by the homepage,
   * where the navigation sits inside the fixed panel, and by about and contact.
   */
  minimal = false,
}: {
  minimal?: boolean;
} = {}) {
  const pathname = usePathname();
  const { navigate, pending } = useNavigation();
  const listId = useId();

  // False through the first render, so the server's markup and the client's
  // first pass agree; the query is read immediately afterwards.
  const [tapToOpen, setTapToOpen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!minimal) return;

    const query = window.matchMedia(NEEDS_TAP);
    const sync = () => {
      setTapToOpen(query.matches);
      // Leaving the tap arrangement with the stack held open would strand it
      // open for a pointer that can simply hover instead.
      if (!query.matches) setOpen(false);
    };

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [minimal]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Anywhere else on the page closes it, as a menu should.
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(`[data-nav-list="${listId}"]`)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, listId]);

  // The alternate homepage is still the homepage as far as the navigation is
  // concerned — it has no pill of its own, and without this none of the three
  // would be marked, which in the minimised form means none of them are shown.
  const route = pathname === ALT_HOME ? "/" : pathname;

  // While a navigation is in flight the pill for the destination leads the way,
  // so the change of state runs alongside the page transition instead of after.
  // Only the look runs ahead: aria-current keeps telling the truth about where
  // the visitor actually is until the route commits.
  const showing = pending ?? route;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // Leave modified clicks and middle clicks to the browser, so opening in a
    // new tab still works.
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    setOpen(false);
    navigate(href);
  };

  return (
    <nav
      className={minimal ? styles.minimal : undefined}
      data-open={open ? "" : undefined}
      aria-label="Primary"
    >
      <ul
        className={styles.list}
        id={listId}
        data-nav-list={listId}
      >
        {navItems.map((item) => {
          const isCurrent = item.href === route;
          const isShowing = item.href === showing;

          return (
            <li key={item.href} className={styles.item}>
              {/*
                The pill for the page you are on becomes the way in to the rest
                where there is nothing to hover with. Left a link it would only
                lead back to the page already on screen, and the tap meant to
                open the stack would reload it instead.
              */}
              {tapToOpen && isCurrent ? (
                <button
                  type="button"
                  className={styles.pill}
                  aria-current="page"
                  aria-expanded={open}
                  aria-controls={listId}
                  data-active={isShowing ? "" : undefined}
                  onClick={() => setOpen((wasOpen) => !wasOpen)}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={styles.pill}
                  aria-current={isCurrent ? "page" : undefined}
                  data-active={isShowing ? "" : undefined}
                  onClick={(event) => handleClick(event, item.href)}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
