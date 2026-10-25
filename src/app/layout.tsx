import type { Metadata, Viewport } from "next";
import { Geist, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const brandFont = Poppins({
  subsets: ["latin"],
  weight: ["800", "900"],
  style: "italic",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: {
    default: "Chat-in-go",
    template: "%s · Chat-in-go",
  },
  description:
    "Create a business page. People join with a link or QR code and can message you right away.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e9e9e9",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${brandFont.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-dvh overflow-x-hidden">{children}</body>
    </html>
  );
}
