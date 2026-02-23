import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B2A4A",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 700,
            color: "#D4A843",
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size }
  );
}
