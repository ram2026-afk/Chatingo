"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 180,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className="h-[180px] w-[180px] bg-soft" />;
  }

  return (
    // The QR image is a generated data URL, not a remote asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      width={180}
      height={180}
      className="h-auto w-[min(180px,100%)] bg-card"
    />
  );
}
