import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Content OS",
    short_name: "Content OS",
    description: "Idea → script → schedule → publish → review.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1917",
    theme_color: "#1c1917",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
