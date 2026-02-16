import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fappie",
  description: "Transcript to Email & Calendar",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
