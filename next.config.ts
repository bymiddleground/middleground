import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/images/homepage/**" },
      { pathname: "/images/**", search: "" },
    ],
    /*
     * AVIF first, WebP behind it, the original behind that.
     *
     * This site is a wall of photographs — the largest thing on the first
     * screen is always artwork, so the bytes it takes to arrive are the bytes
     * that decide the page's Largest Contentful Paint, which is the one part
     * of a site's speed search engines actually weigh. AVIF is roughly a fifth
     * smaller than WebP for the same picture; it costs more to encode the
     * first time a size is asked for, and nothing on every request after.
     */
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
