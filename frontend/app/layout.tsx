import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/providers";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrchestraOS",
  description: "AI-powered Organizational Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
