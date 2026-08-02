import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/providers";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "OrchestraOS — Dynamic AI Organizations",
    template: "%s · OrchestraOS",
  },
  description:
    "Organizational Intelligence Platform — compile objectives into AI organizations, then orchestrate planning, risk, decisions and execution in real time.",
  metadataBase: new URL("https://orchestraos-nine.vercel.app"),
  openGraph: {
    title: "OrchestraOS — Dynamic AI Organizations",
    description:
      "Compile objectives into AI organizations. Orchestrate planning, risk, decisions and execution in real time.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
