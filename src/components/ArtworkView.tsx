"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

import { getImageProps } from "next/image";
import { ResilientImage as Image } from "./ResilientImage";

import { mobileGalleryImage, mobileGallerySrcSet } from "@/lib/gallery-images";
import { prefersReducedMotion } from "@/lib/motion";
import type { Tile } from "@/data/projects";

import styles from "./ArtworkView.module.css";

/**
 * What a tile hands over when it is opened.
 *
 * The ratio travels with it because the overlay has to reserve the piece's
 * shape before the file arrives — otherwise the caption jumps down the screen
 * as each image lands. The tile already works it out for its own frame; this
 * is the same figure, not a second measurement.
 */
type Shown = Pick<Tile, "media" | "alt" | "title" | "note"> & {
  ratio?: number;
  origin?: { left: number; top: number; width: number; height: number };
  sourceElement?: HTMLElement;
};

/**
 * The long edge the overlay asks for, in CSS pixels.
 *
 * `.media` caps the artwork at 1100px wide, so this is that at 2x and no more
 * — enough for a retina screen, and nowhere near the 2160px the sources
 * actually are. Before this the overlay served the original file whole: 1.7MB
 * of JPEG to show something that is never painted above 1100px.
 */
const LONG_EDGE = 2200;

/** What the browser is told it will be given, so it picks the right width. */
const SIZES = "(max-width: 1100px) 100vw, 1100px";
const OPEN_DURATION = 340 / 1.2;
const CLOSE_DURATION = 300 / 1.2;
const OPEN_EASING = "cubic-bezier(0.3, 0.7, 0.2, 1)";
const CLOSE_EASING = "cubic-bezier(0.4, 0.7, 0.3, 1)";
const frameAt = (rect: { left: number; top: number; width: number; height: number }) => ({
  left: rect.left + "px", top: rect.top + "px",
  width: rect.width + "px", height: rect.height + "px",
});

const SLIDE_DURATION = 360;
const SLIDE_EASING = "cubic-bezier(0.3, 0.7, 0.3, 1)";

function GalleryMedia({ item, controls = true }: { item: Shown; controls?: boolean }) {
  if (!item.media) return null;
  return item.media.kind === "video" ? (
    <video key={item.media.src} className={styles.media} src={item.media.src} poster={item.media.poster} controls={controls} autoPlay muted loop playsInline />
  ) : (
    <Image key={item.media.src} mobileSrcSet={mobileGallerySrcSet(item.media.src)} className={styles.media} src={item.media.src} alt={item.alt ?? ""} width={LONG_EDGE} height={Math.round(LONG_EDGE / (item.ratio ?? 1))} sizes={SIZES} loading="eager" />
  );
}

const ArtworkContext = createContext<((tile: Shown) => void) | null>(null);

/** Opens a piece of artwork full size. Null outside the mosaic. */
export function useArtwork() {
  return useContext(ArtworkContext);
}

/**
 * Holds the artwork a visitor has opened, and shows it over the page.
 *
 * One of these wraps the whole mosaic rather than one per tile: there is only
 * ever a single piece open, and the overlay has to sit above the grid rather
 * than inside the tile it came from, which crops its own artwork.
 */
export function ArtworkProvider({ children, items = [] }: { children: ReactNode; items?: Shown[] }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [index, setIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<{ item: Shown; frame: CSSProperties } | null>(null);
  const slideFade = useRef<Animation | null>(null);
  const readyMedia = useRef(new Map<string, Promise<void>>());
  const navigationRequest = useRef(0);
  const requestedIndex = useRef(0);
  const prepare = useCallback((item: Shown) => {
    const media = item.media;
    if (!media) return Promise.resolve();
    const src = media.kind === "image" ? media.src : media.poster;
    if (!src) return Promise.resolve();
    const key = `${media.kind}:${src}:${window.innerWidth}:${window.devicePixelRatio}`;
    let ready = readyMedia.current.get(key);
    if (!ready) {
      const image = new window.Image();
      if (media.kind === "image" && window.matchMedia("(max-width: 767px)").matches) {
        image.sizes = "calc(100vw - 32px)";
        image.srcset = mobileGallerySrcSet(src);
        image.src = mobileGalleryImage(src, 1280);
      } else if (media.kind === "image") {
        const { props } = getImageProps({ src, alt: "", width: LONG_EDGE, height: Math.round(LONG_EDGE / (item.ratio ?? 1)), sizes: SIZES });
        image.sizes = props.sizes ?? "";
        image.srcset = props.srcSet ?? "";
        image.src = props.src;
      } else image.src = src;
      const decoded = image.decode().catch(async () => {
        // The original file is still usable when an optimizer response fails.
        const original = new window.Image();
        original.src = src;
        await original.decode().catch(() => {});
        readyMedia.current.delete(key);
      });
      ready = new Promise<void>(resolve => {
        const timeout = window.setTimeout(resolve, 750);
        void decoded.finally(() => { window.clearTimeout(timeout); resolve(); });
      });
      readyMedia.current.set(key, ready);
    }
    return ready;
  }, []);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const related = useMemo(() => {
    if (!shown) return [];
    const seen = new Set<string>();
    return [shown, ...items.filter(item => shown.title && item.title === shown.title)]
      .filter(item => {
        if (!item.media || seen.has(item.media.src)) return false;
        seen.add(item.media.src);
        return true;
      });
  }, [shown, items]);
  const current = related[index] ?? shown;
  /* Where the focus was before, so it can be handed back on the way out. */
  const opener = useRef<HTMLElement | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLElement>(null);
  const zoomAnimation = useRef<Animation | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    if (related.length < 2) return;
    void prepare(related[(index + 1) % related.length]);
    void prepare(related[(index - 1 + related.length) % related.length]);
  }, [related, index, prepare]);

  const goTo = useCallback(async (target: number) => {
    if (closing.current || related.length < 2) return;
    const request = ++navigationRequest.current;
    const nextIndex = ((target % related.length) + related.length) % related.length;
    requestedIndex.current = nextIndex;
    // Keep the current image fully visible until the next frame is decoded.
    await prepare(related[nextIndex]);
    if (request !== navigationRequest.current || closing.current) return;
    const rect = artwork.current?.getBoundingClientRect();
    if (current && rect) setOutgoing({ item: current, frame: frameAt(rect) });
    zoomAnimation.current?.cancel();
    slideFade.current?.cancel();
    artwork.current?.removeAttribute("style");
    setIndex(nextIndex);
  }, [related, current, prepare]);

  const navigate = useCallback((direction: number) => {
    void goTo(requestedIndex.current + direction);
  }, [goTo]);

  useLayoutEffect(() => {
    const element = artwork.current;
    const origin = shown?.origin;
    if (!element || !origin || prefersReducedMotion()) return;
    const target = element.getBoundingClientRect();
    if (!target.width || !target.height || !origin.width || !origin.height) return;
    // Resize a moving frame, keeping its placeholder and 16px corners intact.
    element.style.position = "fixed";
    Object.assign(element.style, frameAt(target));
    const animation = element.animate([frameAt(origin), frameAt(target)], {
      duration: OPEN_DURATION, easing: OPEN_EASING,
    });
    animation.onfinish = () => element.removeAttribute("style");
    zoomAnimation.current = animation;
    return () => {
      zoomAnimation.current?.cancel();
      zoomAnimation.current = null;
      closing.current = false;
    };
  }, [shown]);

  const open = useCallback((tile: Shown) => {
    navigationRequest.current += 1;
    opener.current = tile.sourceElement ?? document.activeElement as HTMLElement | null;
    setOutgoing(null);
    requestedIndex.current = 0;
    setIndex(0);
    setShown(tile);
  }, []);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    navigationRequest.current += 1;
    const finish = () => {
      setShown(null);
      opener.current?.focus({ preventScroll: true });
      opener.current = null;
      closing.current = false;
    };
    const element = artwork.current;
    if (!element || !shown?.origin || prefersReducedMotion()) {
      finish();
      return;
    }
    closing.current = true;
    const from = element.getBoundingClientRect();
    zoomAnimation.current?.cancel();
    const destination = opener.current?.querySelector("img, video")?.getBoundingClientRect() ?? shown.origin;
    element.style.position = "fixed";
    Object.assign(element.style, frameAt(from));
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 280, easing: "ease", fill: "forwards",
    });
    [close.current, figure.current?.querySelector("figcaption"), ...Array.from(dialog.current?.querySelectorAll("button") ?? [])].forEach(control => {
      control?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160, easing: "ease", fill: "forwards",
      });
    });
    const visible = index === 0 && destination.width > 0 && destination.top < window.innerHeight &&
      destination.top + destination.height > 0;
    const animation = element.animate(
      visible ? [frameAt(from), frameAt(destination)] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: visible ? CLOSE_DURATION : 220, easing: CLOSE_EASING, fill: "forwards" },
    );
    zoomAnimation.current = animation;
    animation.onfinish = finish;
  }, [shown, index]);

  const navigateRef = useRef(navigate);
  useLayoutEffect(() => { navigateRef.current = navigate; }, [navigate]);
  const dismissRef = useRef(dismiss);
  useLayoutEffect(() => { dismissRef.current = dismiss; }, [dismiss]);
  useEffect(() => {
    if (!shown) return;

    close.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissRef.current();
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !(event.target instanceof HTMLVideoElement)) {
        event.preventDefault();
        // Arrow navigation should leave only the selected thumbnail outlined.
        if (document.activeElement instanceof HTMLElement && thumbnails.current?.contains(document.activeElement)) {
          dialog.current?.focus({ preventScroll: true });
        }
        navigateRef.current(event.key === "ArrowLeft" ? -1 : 1);
      }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button, [href], video[controls], [tabindex='0']") ?? []);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (document.activeElement === dialog.current) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [shown]);

  useLayoutEffect(() => {
    if (!outgoing || prefersReducedMotion()) return;
    slideFade.current = artwork.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: SLIDE_DURATION, easing: SLIDE_EASING,
    }) ?? null;
    return () => { slideFade.current?.cancel(); };
  }, [outgoing]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(() => setOutgoing(null), prefersReducedMotion() ? 0 : SLIDE_DURATION + 20);
    return () => window.clearTimeout(timer);
  }, [outgoing]);

  useEffect(() => {
    const rail = thumbnails.current;
    const selected = rail?.querySelector<HTMLElement>("[aria-current='true']");
    if (!rail || !selected) return;
    rail.scrollTo({ left: selected.offsetLeft - (rail.clientWidth - selected.offsetWidth) / 2, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  }, [index, shown]);

  return (
    <ArtworkContext.Provider value={open}>
      {children}
      {shown && current ? (
        <div
          ref={dialog}
          className={styles.overlay}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-label={`${shown.title ?? "Artwork"} project gallery`}
          /* Anywhere off the artwork closes it, as a lightbox should. */
          onClick={dismiss}
        >
          <div ref={backdrop} className={styles.backdrop} />
          <button
            ref={close}
            type="button"
            className={styles.close}
            onClick={dismiss}
          >
            Close
          </button>

          {/* The artwork itself keeps its clicks, so a stray one does not shut it. */}
          {related.length > 1 ? (
            <>
              <button type="button" className={`${styles.galleryArrow} ${styles.previous}`} aria-label="Previous project media" onClick={event => { event.stopPropagation(); navigate(-1); }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
              <button type="button" className={`${styles.galleryArrow} ${styles.next}`} aria-label="Next project media" onClick={event => { event.stopPropagation(); navigate(1); }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            </>
          ) : null}
          {outgoing ? (
            <div key={outgoing.item.media?.src} className={styles.outgoingMedia} style={outgoing.frame} aria-hidden="true">
              <GalleryMedia item={outgoing.item} controls={false} />
            </div>
          ) : null}
          <figure
            ref={figure}
            className={styles.figure}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={event => {
              // Leave multi-finger zoom and zoomed panning to the browser.
              if (event.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1.01) {
                touchStart.current = null;
                return;
              }
              const touch = event.touches[0];
              const video = event.target instanceof HTMLVideoElement ? event.target : null;
              if (video && touch.clientY > video.getBoundingClientRect().bottom - 64) {
                touchStart.current = null;
                return;
              }
              touchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchMove={event => {
              if (event.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1.01) touchStart.current = null;
            }}
            onTouchCancel={() => { touchStart.current = null; }}
            onTouchEnd={event => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start || (window.visualViewport?.scale ?? 1) > 1.01) return;
              const touch = event.changedTouches[0];
              const dx = touch.clientX - start.x;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(touch.clientY - start.y) * 1.3) navigate(dx < 0 ? 1 : -1);
            }}
          >
            <div
              className={styles.artwork}
              style={{ "--artwork-ratio": current.ratio ?? 1 } as CSSProperties}
            >
            <div ref={artwork} className={styles.movingMedia}>
            <GalleryMedia item={current} />
            </div>
            </div>

            {current.title ? (
              <figcaption className={styles.caption}>
                <span className={styles.name}>{current.title}</span>
                {current.note ? (
                  <span className={styles.note}>{current.note}</span>
                ) : null}
                <span className="visually-hidden" aria-live="polite" aria-atomic="true">Media {index + 1} of {related.length}</span>
              </figcaption>
            ) : null}
          </figure>
          {related.length > 1 ? (
            <div ref={thumbnails} className={styles.thumbnails} data-lenis-prevent="" role="group" aria-label="Project media" onClick={event => event.stopPropagation()}>
              {related.map((item, itemIndex) => (
                <button
                  key={item.media!.src}
                  type="button"
                  className={styles.thumbnail}
                  aria-label={`View ${item.media!.kind === "video" ? "video" : "image"} ${itemIndex + 1} of ${related.length}`}
                  aria-current={index === itemIndex ? "true" : undefined}
                  onClick={() => { if (requestedIndex.current !== itemIndex) void goTo(itemIndex); }}
                >
                  {item.media!.kind === "image" ? (
                    <Image src={item.media!.src} alt="" fill sizes="80px" />
                  ) : item.media!.poster ? (
                    <Image src={item.media!.poster} alt="" fill sizes="80px" />
                  ) : (
                    <video src={item.media!.src} muted playsInline preload="metadata" aria-hidden="true" />
                  )}
                  {item.media!.kind === "video" ? <span className={styles.videoBadge} aria-hidden="true">▶</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </ArtworkContext.Provider>
  );
}

/**
 * The tile's own shell: everything inside it opens the artwork when clicked.
 *
 * A button rather than a link — there is no page to go to, and a link would
 * promise one. The duplicate pass of the mosaic renders its tiles plain, since
 * it exists only to make the loop seamless and is hidden from screen readers;
 * leaving buttons in it would put a second set of everything in the tab order.
 */
export function ArtworkTrigger({
  tile,
  className,
  children,
}: {
  tile: Shown;
  className?: string;
  children: ReactNode;
}) {
  const open = useArtwork();

  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        const media = event.currentTarget.querySelector("img, video");
        const rect = media?.getBoundingClientRect();
        open?.({
          ...tile,
          sourceElement: event.currentTarget,
          // Keyboard activation opens immediately; pointer activation travels
          // from the artwork frame, excluding the caption beneath it.
          origin: event.detail > 0 && rect
            ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
            : undefined,
        });
      }}
      aria-label={tile.title ? `${tile.title} — open` : "Open artwork"}
    >
      {children}
    </button>
  );
}
