import type { Metadata } from "next";
import { Outfit, Caveat } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "700", "900"],
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "TeaBalloon",
  description: "Anonymous secrets floating in the sky.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${caveat.variable}`}>{children}</body>
    </html>
  );
}
