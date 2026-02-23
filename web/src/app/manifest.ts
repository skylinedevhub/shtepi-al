import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShtëpiAL — Gjej shtëpinë tënde në Shqipëri",
    short_name: "ShtëpiAL",
    description:
      "Agregator i njoftimeve të pasurive të paluajtshme në Shqipëri.",
    start_url: "/",
    display: "standalone",
    background_color: "#FDF8F0",
    theme_color: "#1B2A4A",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
