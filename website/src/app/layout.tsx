import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MelodyGen",
  description: "An AI powered music generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-center">
        {children}
      </body>
    </html>
  );
}
