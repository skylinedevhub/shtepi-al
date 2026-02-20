import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ShtëpiAL — Gjej shtëpinë tënde në Shqipëri";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B2A4A",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#D4A843",
            }}
          >
            Shtëpi
          </span>
          <span
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#FFFDF7",
            }}
          >
            AL
          </span>
        </div>
        <p
          style={{
            fontSize: 28,
            color: "#FFFDF7",
            opacity: 0.7,
            marginTop: 16,
          }}
        >
          Gjej shtëpinë tënde në Shqipëri
        </p>
      </div>
    ),
    { ...size }
  );
}
