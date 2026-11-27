import type { MetadataRoute } from "next";

// "Add to Home Screen": Next.js serves this as /manifest.webmanifest and links it from every page.
// With it, the phone opens the app full screen (no browser bars), on the oatmeal page color.
// The icons in public/icons are rendered from app/icon.svg. The "maskable" one fills the whole
// square and keeps the mark inside the middle 80%, so Android can crop it to any shape.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Health Tracker",
    short_name: "Family Health",
    description: "Set a goal. Check in each day. Cheer each other on.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#f7f1e8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
