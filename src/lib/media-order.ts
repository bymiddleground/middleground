/** Stable variation keeps server/client markup identical and refreshes predictable. */
function hash(value: string) {
  let number = 2166136261;
  for (let index = 0; index < value.length; index++) number = Math.imul(number ^ value.charCodeAt(index), 16777619);
  return number >>> 0;
}

type MediaItem = { title?: string; media?: { kind: string; src: string }; ratio?: number };
function shuffled<T>(items: readonly T[], key: (item: T) => string, seed: string): T[] {
  return [...items].sort((a, b) => hash(seed + key(a)) - hash(seed + key(b)));
}

/** Space a project's tiles through the actual column-flow order, never in a run. */
export function spreadProjectMedia<T extends MediaItem>(items: readonly T[], project: string, featuredSource?: string): T[] {
  const selected = shuffled(items.filter(item => item.title === project), item => item.media?.src ?? "", "homepage-maison-v2");
  if (!selected.length) return [...items];
  const featuredIndex = selected.findIndex(item => item.media?.src === featuredSource);
  if (featuredIndex > 0) [selected[0], selected[featuredIndex]] = [selected[featuredIndex], selected[0]];
  const rest = items.filter(item => item.title !== project);
  const slots = new Map<number, T>();
  let previousSlot = -1;
  selected.forEach((item, index) => {
    const jitter = .3 + (hash(item.media?.src ?? "") % 350) / 1000;
    // A small lead brings more of the project into the top of each column.
    const desired = index === 0 && featuredSource ? 0 : Math.max(0, Math.floor((index + jitter) * items.length / selected.length) - 2);
    const slot = Math.max(previousSlot + 1, Math.min(items.length - selected.length + index, desired));
    slots.set(slot, item);
    previousSlot = slot;
  });
  let otherIndex = 0;
  return Array.from({ length: items.length }, (_, index) => slots.get(index) ?? rest[otherIndex++]);
}

/** Mix landscape images, portrait images and films rather than sorting by type. */
export function mixGalleryMedia<T extends MediaItem>(items: readonly T[], seed: string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of shuffled(items, item => item.media?.src ?? "", seed)) {
    const category = item.media?.kind === "video" ? "video" : (item.ratio ?? 1) >= 1 ? "landscape" : "portrait";
    const group = groups.get(category) ?? [];
    group.push(item);
    groups.set(category, group);
  }
  const result: T[] = [];
  let previous = "";
  let round = 0;
  while (result.length < items.length) {
    const categories = shuffled([...groups.keys()].filter(key => groups.get(key)!.length), key => key, `${seed}:${round++}`);
    if (categories.length > 1 && categories[0] === previous) [categories[0], categories[1]] = [categories[1], categories[0]];
    for (const category of categories) {
      result.push(groups.get(category)!.shift()!);
      previous = category;
    }
  }
  return result;
}
