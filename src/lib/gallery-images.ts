/** Directly served, pre-sized gallery images keep phone decoding predictable. */
export function mobileGalleryImage(src: string, width: 640 | 1280) {
  const [pathname, version] = src.split("?");
  const filename = pathname.replace(/^\/images\//, "").replace(/\.[^/.]+$/, "");
  return `/images/gallery/${filename}-${width}.webp${version ? `?${version}` : ""}`;
}

export function mobileGallerySrcSet(src: string) {
  return `${mobileGalleryImage(src, 640)} 640w, ${mobileGalleryImage(src, 1280)} 1280w`;
}
