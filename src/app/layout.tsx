import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-grotesk",
  display: "swap",
  fallback: ["Arial Black", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "HYPERREEL — WE MAKE THE INTERNET FLINCH.",
  description:
    "HYPERREEL — a 3D motion studio for brands with a pulse. Real-time 3D cinematics, programmatic video, 60fps or nothing.",
  keywords: [
    "HYPERREEL",
    "3D motion studio",
    "real-time 3D",
    "programmatic video",
    "Remotion",
    "Three.js",
  ],
  authors: [{ name: "HYPERREEL" }],
  metadataBase: new URL("https://hyperreel.example"),
  openGraph: {
    title: "HYPERREEL — WE MAKE THE INTERNET FLINCH.",
    description:
      "A 3D motion studio for brands with a pulse. Real-time 3D, programmatic video, 60fps or nothing.",
    siteName: "HYPERREEL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HYPERREEL — WE MAKE THE INTERNET FLINCH.",
    description:
      "A 3D motion studio for brands with a pulse. Real-time 3D, programmatic video, 60fps or nothing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${grotesk.variable} dark`} suppressHydrationWarning>
      <body className="bg-ink font-sans text-chrome antialiased">{children}</body>
    </html>
  );
}
