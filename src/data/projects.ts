import dimensions from "./media-dimensions.json";
import {
  CENTRE_COLUMN,
  CENTRE_WIDTH,
  COLUMN_WIDTHS,
  COLUMN_X,
  GUTTER,
  ROW_GUTTER,
  IDENTITY_CONTENT_HEIGHT,
  type Place,
  type Rect,
} from "./design";

/**
 * A tile holds either a still or a silent looping clip, and takes the shape of
 * whichever it holds: a tile's height is its artwork's height, so nothing is
 * ever cropped to fit a slot it was not made for.
 */
export type TileMedia =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string; poster?: string };

export type Tile = {
  /** Unique key for the tile. */
  id: string;
  /** Figma node id, present on the tiles lifted straight from the design. */
  node?: string;
  /** Position on the canvas, in design pixels, as the frame draws it. */
  rect: Rect;
  /** The same position counted in gutters and artwork, for any wider screen. */
  place: Place;
  /** Artwork. Leave undefined and the tile stays the grey placeholder. */
  media?: TileMedia;
  /** Describe the work, not the file — this is what screen readers announce. */
  alt?: string;
  /** Project name, as it is written under the work. */
  title?: string;
  /** What the work was, and when — the line under the name. */
  note?: string;
  /** Optional link to a case study. */
  href?: string;
};

/**
 * A piece of work: what it is, and the proportions it was made in.
 *
 * The ratio is the file's own, measured from it rather than guessed — it is
 * what gives the tile its height, so a wrong figure here is a stretched or
 * cropped piece on the page.
 */
type Art = Pick<Tile, "media" | "alt" | "title" | "note"> & {
  ratio: number;
};

/**
 * How each project is signed: its name, and the line under it saying what the
 * work was and when.
 *
 * The years are the one thing here not taken from the files or the design —
 * they are placeholders, and want correcting against the studio's own record
 * before this goes anywhere public.
 */
type Project = { title: string; note: string };

const ARTEMIS: Project = { title: "Artemis", note: "Brand Identity, 2026" };
const MOLARS: Project = {
  title: "Outsmarted My Molars",
  note: "Campaign, 2025",
};
const GLASS: Project = { title: "Glass Banking", note: "Brand Identity, 2025" };
const DABA: Project = { title: "DABA", note: "Brand Identity, 2024" };
const WOKA: Project = { title: "woka", note: "Brand Identity, 2024" };
const TWF: Project = {
  title: "Tech for the World Forum",
  note: "Brand Identity, 2023",
};
const NOMADI: Project = { title: "Nomadi", note: "Brand Identity, 2023" };
const MOFOOD: Project = { title: "MO.FOOD", note: "Packaging, 2025" };
const MOTION: Project = { title: "Motion", note: "3D & Motion, 2026" };

/**
 * Artwork helpers. Each returns the media plus the descriptions that travel
 * with it, so a tile only has to name the piece it carries.
 */
function work(
  src: string,
  alt: string,
  { title, note }: Project,
  ratio: number,
): Art {
  return {
    media: { kind: "image", src: `/images/${src}` },
    alt,
    title,
    note,
    ratio,
  };
}

function clip(n: number, ratio = 720 / 900): Art {
  return {
    media: {
      kind: "video",
      src: `/images/motion-${String(n).padStart(2, "0")}.mp4`,
      poster: `/images/motion-${String(n).padStart(2, "0")}-poster.webp`,
    },
    alt: "Motion study",
    title: MOTION.title,
    note: MOTION.note,
    ratio,
  };
}

/** The one clip shot wide, which only the middle column can seat. */
const widescreen = () => clip(4, 1920 / 1080);

/** Artemis — brand identity for a fossil identification app. */
const artemis = (n: number) =>
  work(
    `artemis-${String(n).padStart(2, "0")}.jpg`,
    "Artemis — brand identity for a fossil identification app",
    ARTEMIS,
    2160 / 2700,
  );

/** Outsmarted My Molars — sticker campaign. */
const molars = (n: number) =>
  work(
    `molars-${String(n).padStart(2, "0")}.jpg`,
    "Outsmarted My Molars — sticker campaign",
    MOLARS,
    1080 / 1350,
  );

/** Glass Banking — identity for a fintech product. */
const GLASS_ALT = [
  "Glass Banking — the logotype over a pattern of translucent cards",
  "Glass Banking — case study opener, set on black with layered glass forms",
  "Glass Banking — the black payment card, its name showing through the face",
  "Glass Banking — a pull quote from the client on building a transparent brand",
];
const glass = (n: number) =>
  work(`glass-0${n}.jpg`, GLASS_ALT[n - 1], GLASS, 1440 / 1440);

/** DABA — identity for a body care range. */
const DABA_ALT = [
  "DABA — the logotype set across a close-up portrait",
  "DABA — body wash bottles photographed against the brand's terracotta palette",
];
const daba = (n: number) =>
  work(`daba-0${n}.jpg`, DABA_ALT[n - 1], DABA, 1440 / 1800);

/** woka — identity for a finance platform for digital workers. */
const WOKA_ALT = [
  "woka — the logotype beneath its mark, a sunburst drawn as an open hand",
  "woka — the mark set out on its construction grid",
  "woka — the mark opened out into rays across the brand's deep red",
  "woka — campaign image: finance infrastructure for digital workers",
];
const woka = (n: number) =>
  work(`woka-0${n}.jpg`, WOKA_ALT[n - 1], WOKA, 3198 / 3198);

/** Tech for the World Forum — identity for a technology conference. */
const TWF_ALT = [
  "Tech for the World Forum — the stacked logotype beneath its globe mark",
  "Tech for the World Forum — the logotype with the globe set into the word",
];
const twf = (n: number) =>
  work(`twf-0${n}.jpg`, TWF_ALT[n - 1], TWF, 2184 / 2184);

/** Nomadi — identity for a travel brand. */
const nomadi = () =>
  work(
    "nomadi-01.jpg",
    "Nomadi — the wordmark over a portrait at the shoreline",
    NOMADI,
    1638 / 2048,
  );

/** MO.FOOD — packaging for a dried seafood range. */
const mofood = () =>
  work(
    "mofood-01.avif",
    "MO.FOOD — packaging for the dried, ground and smoked shrimp range",
    MOFOOD,
    2048 / 1602,
  );

/**
 * The caption at the foot of a tile: the air above the project's name, the two
 * line heights it and its note stand in, and the sizes they are set at.
 *
 * These are pixels, not design units. The caption is text at a size someone
 * chose, the same on a laptop as on a wall — so the band it stands in holds
 * too, and a tile is artwork that grows plus a band that does not, the way a
 * column is artwork plus gutters.
 *
 * The stylesheet is given these rather than holding its own copy, because the
 * band has to come to exactly the same figure. Anything left spare inside it
 * shows up under the caption as space the gutter appears to gain.
 */
export const CAPTION = {
  /** Between the work and the name under it. */
  top: 8,
  /** Line height for both, as a multiple of their size. */
  line: 1.2,
  name: 14,
  /* The size of the name above it; the grey is what tells them apart. */
  note: 14,
} as const;

/** The band those three make, in pixels — and nothing besides them. */
export const TITLE_BAND =
  CAPTION.top + (CAPTION.name + CAPTION.note) * CAPTION.line;

/**
 * How tall the artwork in a tile is — the tile itself is this plus the band,
 * which is added where the two kinds of height are kept apart. It depends on
 * the column, since the middle one is wider than the rest.
 */
function artworkHeight(column: number, ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error("Media must have a positive aspect ratio");
  return COLUMN_WIDTHS[column] / ratio;
}

/** Native dimensions are generated from the actual optimized files before dev/build.
 * No cropping or padding is needed to fit a predetermined tile shape.
 */
const maisonImages = { 1: dimensions["maison-1.webp"], 3: dimensions["maison-3.webp"], 7: dimensions["maison-7.webp"], 8: dimensions["maison-8.webp"] } as const;
const maisonVideos = { orbs: dimensions["maison-orbs.mp4"], type: dimensions["maison-type.mp4"] } as const;

// A changed file gets a new URL in both browser and Next.js image caches.
const homepageMediaUrl = (file: keyof typeof dimensions) =>
  `/images/homepage/${file}?v=${dimensions[file].version}`;

const maisonImage = (n: keyof typeof maisonImages, alt: string): Art => ({
  media: { kind: "image", src: homepageMediaUrl(`maison-${n}.webp`) },
  title: "Maison Music Fest",
  note: "Visual Identity",
  alt,
  ratio: maisonImages[n].width / maisonImages[n].height,
});

const maisonVideo = (name: keyof typeof maisonVideos, alt: string): Art => ({
  media: {
    kind: "video",
    src: homepageMediaUrl(`maison-${name}.mp4`),
    poster: homepageMediaUrl(`maison-${name}-poster.webp`),
  },
  title: "Maison Music Fest",
  note: "Motion",
  alt,
  ratio: maisonVideos[name].width / maisonVideos[name].height,
});

const COLUMN_ART: Art[][] = [
  [maisonImage(1, "Maison Music Fest — festival poster with a blue and lilac gradient"), woka(1), molars(1), artemis(2), glass(1), clip(1), artemis(3)],
  [maisonVideo("type", "Maison Music Fest — animated typography"), maisonImage(7, "Maison Music Fest — colourful artist and attendee wristbands"), twf(1), molars(2), artemis(5), woka(2), daba(1)],
  // The middle column, and the wide piece stands first: the name below it then
  // lands where the design puts it on the first screen. The main page gives
  // this column to its panel, so what stands here is what /alt shows.
  [mofood(), artemis(6), glass(2), nomadi(), widescreen(), woka(3)],
  [maisonVideo("orbs", "Maison Music Fest — animated orbs"), molars(3), glass(3), artemis(8), clip(3), twf(2), artemis(9)],
  [maisonImage(3, "Maison Music Fest — ticket artwork with a performer portrait"), maisonImage(8, "Maison Music Fest — festival lineup poster"), woka(4), molars(4), artemis(11), glass(4), clip(5)],
];

/** The tile the studio's name stands under, in the column that is its own. */
const IDENTITY_ROW = 0;

/** How much artwork a stack of pieces comes to — the part that grows. */
function columnArtwork(column: number, pieces: Art[]) {
  return pieces.reduce(
    (total, piece) => total + artworkHeight(column, piece.ratio),
    0,
  );
}

/**
 * The height of the name's block, clamped to leave readable space for the identity.
 *
 * Only the artwork is counted. Every column carries seven gutters and seven
 * bands whatever stands in it — the name's block takes a band of its own, so
 * that stays true — which leaves the artwork as the one part that has to be
 * made to agree, and this is what makes it agree.
 *
 * The block is a logotype, a tagline and air between them, and the air is the
 * one measurement on the page with no work of its own to fit. If a change to
 * the artwork ever pushed it somewhere unreasonable, the check below says so.
 */
export const IDENTITY_HEIGHT = Math.max(
  IDENTITY_CONTENT_HEIGHT + 120 - TITLE_BAND,
  Math.min(
    IDENTITY_CONTENT_HEIGHT + 360 - TITLE_BAND,
    columnArtwork(0, COLUMN_ART[0]) -
      columnArtwork(CENTRE_COLUMN, COLUMN_ART[CENTRE_COLUMN]),
  ),
);

/**
 * Stacks one column, leaving room for the identity block where it sits.
 *
 * Each tile is given its position twice over: as a design coordinate, and as
 * the count of gutters and artwork that coordinate is made of. The second is
 * what holds up past the design width, where the gutters stop growing and the
 * artwork does not.
 */
function stack(column: number, pieces: Art[]): Tile[] {
  const x = COLUMN_X[column];
  const width = COLUMN_WIDTHS[column];
  let y = GUTTER;
  let gaps = 1;
  let bands = 0;
  let stacked = 0;

  return pieces.map((piece, row) => {
    const artwork = artworkHeight(column, piece.ratio);
    const tile: Tile = {
      id: `c${column + 1}-r${row + 1}`,
      rect: { x, y, width, height: artwork + TITLE_BAND },
      place: { column, gaps, bands, stacked },
      media: piece.media,
      alt: piece.alt,
      title: piece.title,
      note: piece.note,
    };

    y += artwork + TITLE_BAND + ROW_GUTTER;
    gaps += 1;
    bands += 1;
    stacked += artwork;

    // The name's block, which takes a band of its own so that every column
    // carries the same count of them however it is made up.
    if (column === CENTRE_COLUMN && row === IDENTITY_ROW) {
      y += IDENTITY_HEIGHT + TITLE_BAND + ROW_GUTTER;
      gaps += 1;
      bands += 1;
      stacked += IDENTITY_HEIGHT;
    }

    return tile;
  });
}

const COLUMN_TILES = COLUMN_ART.map((pieces, column) => stack(column, pieces));

// Columns may finish at different heights: artwork keeps its native proportions.

/** Every tile, ordered by row then column. */
export const tiles: Tile[] = COLUMN_TILES.flat().sort(
  (a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x,
);

/**
 * The work as a list of projects rather than a wall of tiles.
 *
 * The mosaic shows a project several times over — four frames of Artemis, four
 * of woka — which is right on the page and wrong everywhere else. Anything
 * being told what the studio has made wants each project once, with the first
 * frame of it as the image and the line under it read apart into what the work
 * was and when.
 *
 * Derived from the tiles rather than written out again, so a project added to
 * the grid is a project the structured data already knows about.
 */
export type ProjectEntry = {
  title: string;
  /** What the work was — the first half of the tile's note. */
  discipline: string;
  /** And when, where the note gives a year. */
  year?: string;
  /** The first frame of it shown on the page. */
  image?: string;
  /** What that frame shows. */
  alt?: string;
};

export const projectIndex: ProjectEntry[] = tiles.reduce<ProjectEntry[]>(
  (found, tile) => {
    if (!tile.title || found.some((entry) => entry.title === tile.title)) {
      return found;
    }

    /* "Brand Identity, 2026" — the discipline, then the year. */
    const [discipline, year] = (tile.note ?? "").split(",").map((part) => part.trim());

    found.push({
      title: tile.title,
      discipline: discipline || "Brand Design",
      year: year || undefined,
      image: tile.media?.kind === "image" ? tile.media.src : undefined,
      alt: tile.alt,
    });

    return found;
  },
  [],
);

/**
 * Where the studio's name stands on the first screen.
 *
 * It follows the tile above it rather than sitting at a figure of its own: that
 * tile is now as tall as the piece it holds, so the block's place is wherever
 * the column has reached by then.
 */
const FIRST_IN_COLUMN_THREE = artworkHeight(
  CENTRE_COLUMN,
  COLUMN_ART[CENTRE_COLUMN][IDENTITY_ROW].ratio,
);

export const identityRect: Rect = {
  x: COLUMN_X[CENTRE_COLUMN],
  y: GUTTER + ROW_GUTTER + TITLE_BAND + FIRST_IN_COLUMN_THREE,
  width: CENTRE_WIDTH,
  height: IDENTITY_HEIGHT + TITLE_BAND,
};

export const identityPlace: Place = {
  column: CENTRE_COLUMN,
  gaps: 2,
  bands: 1,
  stacked: FIRST_IN_COLUMN_THREE,
};

/**
 * Where the studio's name can stand in the grid besides its place on the first
 * screen.
 *
 * A slot is simply a tile: the name takes that tile's exact footprint, so the
 * gutters around it are the grid's own and it sits in the composition like
 * anything else. The logotype goes to the top and the tagline to the foot, with
 * the space between falling out of the tile's height — which is why a host only
 * has to be tall enough to hold both with a decent gap left over.
 */
const MIN_IDENTITY_GAP = 120;
const MIN_HOST_HEIGHT = IDENTITY_CONTENT_HEIGHT + MIN_IDENTITY_GAP;

export type IdentitySlot = {
  /** The tile this slot replaces. */
  tile: string;
  /** Its footprint, which the name takes over whole. */
  rect: Rect;
  /** And where that footprint sits, counted as the grid counts it. */
  place: Place;
};

/** Whether a tile is the one directly above or below the block on screen one. */
function bordersTheFixedBlock({ rect }: Tile) {
  if (rect.x !== identityRect.x) return false;
  const above = identityRect.y - (rect.y + rect.height);
  const below = rect.y - (identityRect.y + identityRect.height);
  return Math.abs(above) <= ROW_GUTTER || Math.abs(below) <= ROW_GUTTER;
}

export const identitySlots: IdentitySlot[] = tiles
  .filter(
    (tile) =>
      tile.rect.height >= MIN_HOST_HEIGHT && !bordersTheFixedBlock(tile),
  )
  .map((tile) => ({ tile: tile.id, rect: tile.rect, place: tile.place }));

/**
 * How far each column reaches, in the two parts a height is made of: the
 * gutters, which hold at GUTTER whatever the screen, and the artwork between
 * them, which grows with it.
 *
 * The canvas is as tall as the deepest of them — and which one that is can
 * change with the width, since one column may carry more gutters and another
 * more artwork, so the stylesheet is given all five and takes the maximum
 * itself rather than being handed a winner chosen at one width.
 */
export const COLUMN_METRICS = COLUMN_TILES.map((column) => {
  const last = column[column.length - 1];
  return {
    gaps: last.place.gaps,
    bands: last.place.bands + 1,
    stacked: last.place.stacked + (last.rect.height - TITLE_BAND),
  };
});

/**
 * Height of the canvas at the design width: the lowest tile edge, with no
 * margin beneath it.
 *
 * The page loops, so there is no bottom of the page to leave room under — the
 * next pass brings its own top margin, and that alone is the gap at the seam.
 */
export const canvasHeight = Math.max(
  ...tiles.map((tile) => tile.rect.y + tile.rect.height),
);

/**
 * How much shorter than the deepest each column finishes, at the design width.
 *
 * A column that finishes short leaves that much extra above the seam where the
 * page repeats — the one place the grid's 24px does not hold, and the price of
 * every piece keeping its own proportions.
 */
export const COLUMN_SLACK = COLUMN_TILES.map((column) => {
  const last = column[column.length - 1];
  return Math.round(canvasHeight - (last.rect.y + last.rect.height));
});
