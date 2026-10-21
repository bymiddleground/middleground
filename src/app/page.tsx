import { PillLink } from "@/components/PillLink";
import { DesktopReachOut } from "@/components/DesktopReachOut";
import { Intro, MOSAIC_DELAY } from "@/components/Intro";
import { Mosaic } from "@/components/Mosaic";
import { Monogram } from "@/components/Monogram";
import { CursorPill } from "@/components/CursorPill";
import { Torch } from "@/components/Torch";
import { Stamps } from "@/components/Stamps";
import { absoluteUrl, bookingUrl, site } from "@/data/site";
import { projectIndex } from "@/data/projects";
import {
  FOUNDER,
  JsonLd,
  ORGANISATION,
  pageMetadata,
  pageSchema,
} from "@/lib/seo";

import type { Metadata } from "next";

import styles from "./home.module.css";

/*
 * No title of its own: the homepage takes the default rather than putting a
 * name in front of the studio's.
 */
export const metadata: Metadata = pageMetadata({
  path: "/",
  description: site.description,
});

/**
 * What this page is, and what is on it.
 *
 * The mosaic is the studio's portfolio, and a wall of images is the one thing
 * a crawler cannot read. Listing the work here — each project once, with what
 * it was and when — is how "brand identity for a fintech" becomes something
 * the page can be found by, rather than something only a visitor can see.
 */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      ...pageSchema({
        type: "CollectionPage",
        path: "/",
        name: `${site.name} — Brand Design Studio`,
        description: site.description,
      }),
      mainEntity: {
        "@type": "ItemList",
        name: `Selected work by ${site.name}`,
        numberOfItems: projectIndex.length,
        itemListElement: projectIndex.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: project.title,
            genre: project.discipline,
            ...(project.year ? { dateCreated: project.year } : {}),
            ...(project.image
              ? { image: absoluteUrl(project.image), abstract: project.alt }
              : {}),
            creator: { "@id": ORGANISATION },
            author: { "@id": FOUNDER },
          },
        })),
      },
    },
  ],
};

const PILL_TONES = [
  "var(--color-tone-paper)", "var(--color-tone-lilac)",
  "var(--color-tone-sky)", "var(--color-tone-coral)",
  "var(--color-tone-mint)", "var(--color-tone-butter)",
  "var(--color-tone-blossom)",
];

export default function Home() {
  return (
    <>
      <JsonLd schema={schema} />

      {/*
        The page's one heading. The studio's name is set in the panel as
        artwork rather than as type, so the heading that names it and says what
        it is stands here instead, read rather than seen.
      */}
      <h1 className="visually-hidden">{site.name} — brand design studio</h1>

      <Intro id="home" />

      <div className={styles.panel}>
        {/* The mark, stamped wherever the column is clicked. */}
        <Stamps />

        <div className={styles.topbar} aria-hidden="true" />
        <div className={styles.below}>
          <Monogram className={styles.mark} intro />
          <Torch className={`${styles.introBooking} ${styles.desktopIntroCopy}`} palette={PILL_TONES} parts="[data-part]">
            <a className={styles.introBookingLink} href={bookingUrl} target="_blank" rel="noreferrer" aria-label="Book a call with MiddleGround">
          <h2 className={styles.headline} data-intro="rest" data-part="">
            <span className={styles.studioName}>MiddleGround</span>
            {site.tagline.slice("MiddleGround".length)}
          </h2>
            </a>
            <CursorPill label="BOOK A CALL" />
          </Torch>
          <h2 className={`${styles.headline} ${styles.mobileIntroCopy}`} data-intro="rest">
            <span className={styles.studioName}>MiddleGround</span>
            {site.tagline.slice("MiddleGround".length)}
          </h2>
        </div>
      </div>

      <h2 className="visually-hidden">Selected work</h2>

      <Mosaic
        identity={false}
        flow
        delay={MOSAIC_DELAY}
      />

      <div className={styles.mobileReachOut}>
        <PillLink href="/contact" label="REACH OUT" />
      </div>
      <DesktopReachOut />
    </>
  );
}
