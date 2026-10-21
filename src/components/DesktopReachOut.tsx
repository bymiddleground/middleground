"use client";

import { useEffect, useRef, useState } from "react";

import { PillLink } from "./PillLink";
import styles from "./DesktopReachOut.module.css";

export function DesktopReachOut() {
  const end = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = end.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { rootMargin: "0px 0px 300px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={end} className={styles.end} aria-hidden="true" />
      <div className={styles.button} data-visible={visible || undefined} inert={!visible}>
        <PillLink href="/contact" label="REACH OUT" />
      </div>
    </>
  );
}
