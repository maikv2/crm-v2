import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  const logo = await fetch(
    new URL("../public/logo_branca.svg", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
        }}
      >
        <img
          src={`data:image/svg+xml;base64,${Buffer.from(logo).toString(
            "base64"
          )}`}
          style={{
            width: 110,
            height: 110,
          }}
        />
      </div>
    ),
    {
      width: 180,
      height: 180,
    }
  );
}