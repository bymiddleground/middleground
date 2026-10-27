import posthog from "posthog-js";

// This is the public, browser-side ingestion token, not a personal API key.
if (process.env.NODE_ENV === "production") {
  posthog.init("phc_v7ArcsCJgL8HsVMKsXtF6cVqyMxdz8rUxSUhCFzg66QJ", {
    api_host: "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    defaults: "2026-08-30",
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: true,
    person_profiles: "identified_only",
    disable_session_recording: true,
    disable_surveys: true,
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest("button, a");
    if (!control) return;
    const label = (control.getAttribute("aria-label") || control.textContent || "").trim().replace(/\s+/g, " ").slice(0, 160);
    const href = control.getAttribute("href");
    const gallery = control.closest('[role="dialog"]');
    posthog.capture(label.endsWith("— open") ? "project_opened" : "button_clicked", {
      label,
      destination: href?.split("?")[0] ?? null,
      location: gallery ? "project_gallery" : "page",
      page: window.location.pathname,
    });
  }, true);

  for (const type of ["play", "pause", "ended"] as const) {
    document.addEventListener(type, (event) => {
      const video = event.target;
      // Grid previews autoplay; only measure the controllable gallery videos.
      if (!(video instanceof HTMLVideoElement) || !video.controls) return;
      posthog.capture(`video_${type}`, {
        media: new URL(video.currentSrc || video.src, window.location.href).pathname,
        position_seconds: Math.round(video.currentTime),
        page: window.location.pathname,
      });
    }, true);
  }
}
