import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snap",
  description: "Invoice and expense reporting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-snap-bg text-snap-textMain">{children}</body>
    </html>
  );
}
