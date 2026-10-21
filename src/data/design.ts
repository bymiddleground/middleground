/**
 * Canvas constants for the homepage mosaic.
 *
 * The mosaic is hand-placed rather than a uniform grid, so tiles are stored as
 * raw design coordinates. Every dimension is rendered as
 * `calc(<design px> * var(--s))`, where `--s` is a single scale factor defined
 * in page.module.css. At the 1440px design width `--s` is exactly 1, so the
 * page is pixel-identical to Figma; at other widths the whole composition zooms
 * in step, preserving every proportion.
 */

/** Width of the Figma frame, and the width every coordinate is authored against. */
export const CANVAS_WIDTH = 1440;

/**
 * Margin around the mosaic, and the spacing between tiles — the same figure
 * above, below and either side of every piece. Column width falls out of it,
 * so this is the only number to change to open the grid up or close it.
 */
export const GUTTER = 16;
/** Space from a caption's bottom to the next artwork. */
export const ROW_GUTTER = 24;

/**
 * Height of the Figma frame "Homepage" (node 2056:2). The frame crops the
 * artwork at 850px; it is kept here only as a reference point, since the live
 * canvas height is derived from the tiles themselves.
 */
export const FIGMA_FRAME_HEIGHT = 850;

/** Which of the five columns is the studio's own rather than the work's. */
export const CENTRE_COLUMN = 2;

/**
 * The middle column, set to the line it has to hold rather than to the grid.
 *
 * It carries the studio's name, what it does and the way through — type, not
 * artwork — and type has a width it wants. So this one is given that width and
 * the four columns of work divide what is left.
 */
export const CENTRE_WIDTH = 324;

/**
 * Width of a column of artwork: the canvas, less its side margins, less the
 * four gaps between columns, less the middle column, divided four ways. Every
 * gap in the mosaic — between columns, between tiles, and at the join where the
 * page loops — is GUTTER.
 */
export const COLUMN_WIDTH =
  (CANVAS_WIDTH - 6 * GUTTER - CENTRE_WIDTH) / 4;

/** The five columns, four of one width and one of another. */
export const COLUMN_WIDTHS = [0, 1, 2, 3, 4].map((index) =>
  index === CENTRE_COLUMN ? CENTRE_WIDTH : COLUMN_WIDTH,
);

/**
 * How much column stands before each one — the part of a position that grows
 * with the screen, since the gutters between them do not.
 */
export const COLUMN_BEFORE = COLUMN_WIDTHS.map((_, index) =>
  COLUMN_WIDTHS.slice(0, index).reduce((total, width) => total + width, 0),
);

/** And where each one starts: that, plus the gutters up to it. */
export const COLUMN_X = COLUMN_BEFORE.map(
  (before, index) => (index + 1) * GUTTER + before,
);

/**
 * All five columns together, which is what the canvas has for artwork once its
 * six gutters are taken out. The scale every measurement in the grid is a share
 * of — see `--u` in layout.module.css.
 */
export const COLUMNS_WIDTH = COLUMN_BEFORE[4] + COLUMN_WIDTHS[4];

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Where something sits in the grid, counted rather than measured.
 *
 * Past the design width the gutters hold at GUTTER while the artwork takes all
 * the room there is, so a position is no longer one number scaled — it is a
 * number of gutters, which never change, plus a distance through the artwork,
 * which does. This is what lets the stylesheet work both out at any width.
 */
export type Place = {
  /** Which of the five columns, counted from the left. */
  column: number;
  /** Gutters above it, the margin at the top of the canvas included. */
  gaps: number;
  /** Caption bands above it, which hold their size as the gutters do. */
  bands: number;
  /** Artwork above it in its column, in design units. */
  stacked: number;
};

/**
 * Turns a rect and its place into the custom properties the stylesheets
 * position from.
 *
 * Deliberately not `left`/`top`/`width`/`height` themselves: an inline
 * declaration cannot be overridden by a media query, and below the desktop
 * breakpoint the composition has to leave absolute layout altogether. Handing
 * CSS the numbers instead lets it decide what to do with them at each width.
 *
 * The parts of a position are kept apart — `--xg`/`--yg` count gutters, `--yb`
 * counts caption bands, and `--xd`/`--yd` measure artwork — because only the
 * last of them grows with the screen. The gutters and the captions are set in
 * pixels and stay there. Added up again they come to the design's own
 * coordinates at 1440, where the two agree.
 */
export function toStyle(
  { width, height }: Rect,
  { column, gaps, bands, stacked }: Place,
) {
  return {
    "--xg": column + 1,
    "--xd": COLUMN_BEFORE[column],
    "--yg": gaps,
    "--yb": bands,
    "--yd": stacked,
    "--w": width,
    "--h": height,
  };
}


/** Logo artwork (node 2056:4), at its exported size. */
export const LOGO_SIZE = { width: 84.865, height: 45.2375 };

/** Logotype plus three lines of tagline — everything but the gap between them. */
export const IDENTITY_CONTENT_HEIGHT = LOGO_SIZE.height + 3 * 16 * 1.2;



