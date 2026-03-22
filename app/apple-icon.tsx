import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  const logoPath = path.join(process.cwd(), "public", "logo_branca.svg");
  const logo = await fs.readFile(logoPath, "utf8");
  const logoBase64 = Buffer.from(logo).toString("base64");

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
          src={`data:image/svg+xml;base64,${logoBase64}`}
          style={{
            width: 110,
            height: 110,
          }}
          alt="V2"
        />
      </div>
    ),
    {
      width: 180,
      height: 180,
    }
  );
}