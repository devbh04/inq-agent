import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eximple | Autonomous Marine Freight Voice Operations",
  description: "Enterprise voice intelligence for ocean freight dispatching, container load specifications, and telephony pulse analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f9fa] text-[#141414] antialiased selection:bg-[#141414] selection:text-white">
        {children}
      </body>
    </html>
  );
}
