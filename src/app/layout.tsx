import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#87ceeb" },
    { media: "(prefers-color-scheme: dark)", color: "#16193b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "TeaBalloon | Anonymous Secrets in the Sky",
    template: "%s | TeaBalloon",
  },
  description: "Release your deepest secrets, intrusive thoughts, and anonymous confessions into a beautifully animated, real-time digital sky. Vote, reply, and connect with strangers universally.",
  applicationName: "TeaBalloon",
  keywords: [
    "anonymous confessions", "secrets app", "venting", "digital sky", "social experiment", "anonymous social media", 
    "share secrets", "teaballoon", "floating balloons app", "safe space", "confess online", "anonymous message board",
    "mental health vent", "anonymous chat", "secret sharing platform"
  ],
  authors: [{ name: "TeaBalloon Creator" }],
  creator: "TeaBalloon Creator",
  publisher: "TeaBalloon",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "TeaBalloon | Release Anonymous Secrets",
    description: "Write your secret, tie it to a balloon, and let it float into the anonymous digital sky. Read and vote on confessions from strangers around the world.",
    siteName: "TeaBalloon",
    images: [
      {
        url: "/icon.png",
        width: 800,
        height: 600,
        alt: "TeaBalloon Sky Graphic",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TeaBalloon — Anonymous Sky",
    description: "Watch secrets float by in real-time. Release your own burden. The sky is waiting.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/icon.png",
    },
  },
  category: "social",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${caveat.variable}`}>{children}</body>
    </html>
  );
}
