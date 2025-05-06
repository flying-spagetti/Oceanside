import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "700"], // Assuming you want to use regular and bold weights
  variable: "--font-Poppins",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oceanside",
  description: "Oceanside brings studio-grade, locally-recorded audio and video interviews to the cloud — reliably, asynchronously, beautifully.",
  
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
