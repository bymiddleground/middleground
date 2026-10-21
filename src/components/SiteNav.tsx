"use client";

import { usePathname } from "next/navigation";

import { ALT_HOME, HOME } from "@/data/site";

import { Nav } from "./Nav";
import styles from "./SiteNav.module.css";

/**
 * The navigation in the page header — except on the homepage, which carries
 * its own inside the fixed panel.
 *
 * Away from the homepage it takes the same minimised form: the page you are on,
 * with the rest folding out below. The alternate homepage is the exception, as
 * it is the frame drawn as it was — the full row, floating over the top of the
 * mosaic.
 */
export function SiteNav() {
  const pathname = usePathname();

  if (pathname === HOME) {
    return (
      <div className={styles.centre} data-nav="overlay" data-intro="rest">
        <Nav minimal />
      </div>
    );
  }

  if (pathname === ALT_HOME) {
    // That page opens in sequence and the navigation is part of it.
    return (
      <div className={styles.corner} data-intro="rest">
        <Nav minimal />
      </div>
    );
  }

  // Elsewhere the navigation is simply there — it must not fade out and back in
  // on arrival, which would undo the pill carrying across from the page you
  // came from.
  return (
    <div className={styles.centre} data-nav="overlay">
      <Nav minimal />
    </div>
  );
}
