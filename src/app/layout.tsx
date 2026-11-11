import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./font.css";

export const metadata: Metadata = {
  title: "Astra Pattern Studio & Tailor Sheet",
  description:
    "Interactive 2D garment pattern drafting, tailor measurements, cutting layout optimization, and printable SVG/DXF/spec-sheet generator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased bg-[#F8F8F8] text-[#1E1E1E]">
        <Suspense fallback={<div className="min-h-screen bg-[#F8F8F8]" />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}

