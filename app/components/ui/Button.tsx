"use client";

import React, { useState } from "react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

export default function Button({
  children,
  onClick,
  type = "button",
}: ButtonProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [hover, setHover] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: hover ? colors.text : colors.cardBg,
        color: hover ? colors.cardBg : colors.text,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}