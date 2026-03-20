import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon({
  params,
}: {
  params: { size?: string };
}) {
  const requestedSize = Number(params?.size ?? 512);
  const safeSize =
    requestedSize === 192 || requestedSize === 512 ? requestedSize : 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #60a5fa 100%)",
          color: "#ffffff",
          borderRadius: safeSize * 0.22,
          fontSize: safeSize * 0.24,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        CRM
      </div>
    ),
    {
      width: safeSize,
      height: safeSize,
    }
  );
}