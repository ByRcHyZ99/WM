import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WM Tippspiel",
  description: "Privates Tippspiel für WM-Spiele mit Freunden"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
