import type { Metadata, Viewport } from "next";

import type { CSSProperties } from "react";

import { CENTRE_WIDTH, COLUMNS_WIDTH, GUTTER } from "@/data/design";
import { SiteNav } from "@/components/SiteNav";
import {
  NavigationProvider,
  PageTransition,
} from "@/components/PageTransition";
import { SmoothScroll } from "@/components/SmoothScroll";
import { founder, site, siteUrl } from "@/data/site";
import { JsonLd, siteGraph } from "@/lib/seo";

import styles from "./layout.module.css";
import "./globals.css";

/**
 * What every page inherits.
 *
 * `metadataBase` is what makes the rest of this work: without it, every
 * relative URL below — the share image, the canonical on each page — is a
 * build error, and with the wrong one every canonical on the site quietly
 * points at a preview deployment. It is resolved from one place for that
 * reason (see `siteUrl`).
 *
 * The title template puts the studio's name after the page's own rather than
 * before it. A result list truncates from the right, and "About" is the part
 * worth reading first; the name is what the visitor already searched for.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Brand Design Studio`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: founder.name }],
  creator: founder.name,
  publisher: site.name,
  /*
   * The work is the point of this site, so the crawlers are told to show it.
   * `max-image-preview: large` is the difference between a portfolio appearing
   * in results as a thumbnail the size of a postage stamp and appearing as the
   * artwork; `max-snippet: -1` lets the description run its full length.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — Brand Design Studio`,
    description: site.description,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Brand Design Studio`,
    description: site.description,
    site: "@bymiddleground",
    creator: "@bymiddleground",
  },
  /*
   * Search Console wants a token in the head before it will show the site its
   * own data. Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION and the tag appears;
   * leave it unset and nothing is rendered.
   */
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#000000",
  /*
   * The canvas is black to the edges, and this is also what makes
   * env(safe-area-inset-*) report anything at all on a phone with a cutout —
   * the header and the pages anchored to the bottom edge read those.
   */
  viewportFit: "cover",
};

/**
 * Marks the document as scripted before first paint, so the entrance states in
 * globals.css only apply when there is JavaScript to animate them away again.
 */
const MARK_SCRIPTED = 'document.documentElement.classList.add("js")';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* Browser extensions inject attributes onto html and body before
       hydration, which React would otherwise report as a mismatch. */
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MARK_SCRIPTED }} />
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/swz5frw.css?v=20261021-medium-2" />
      </head>
      <body suppressHydrationWarning>
        {/*
          The studio, its founder and this site, described for the things that
          read the page rather than look at it. It sits in the layout because
          all three are true on every page; a page adds only what it is itself.
        */}
        <JsonLd schema={siteGraph} />
        <a className="skip-link" href="#main">
          Skip to work
        </a>
        <SmoothScroll />
        {/*
          The navigation lives here rather than inside each page so it survives
          every route change. That is what lets the active pill grow, shrink and
          change colour between pages instead of cutting.
        */}
        <NavigationProvider>
          {/*
            The grid's two constants, handed to CSS from the one place they are
            defined, so the stylesheets can work out the scale without keeping
            their own copy of either.
          */}
          <div
            className={styles.page}
            style={
              {
                "--gap": `${GUTTER}px`,
                "--columns": COLUMNS_WIDTH,
                "--centre": CENTRE_WIDTH,
              } as CSSProperties
            }
          >
            <header className={styles.header} data-band="">
              <SiteNav />
            </header>
            <main id="main">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}
