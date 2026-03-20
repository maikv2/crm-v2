"use client";

import { useEffect, useState } from "react";

export default function MobileAppear({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition:
          "opacity 0.28s ease, transform 0.28s ease",
      }}
    >
      {children}
    </div>
  );
}