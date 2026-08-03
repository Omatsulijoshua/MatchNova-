import type { Metadata } from 'next';
import { Geist, Geist_Mono, Outfit } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MatchNova | AI-Powered Premium Dating',
  description: 'Experience meaningful connections powered by advanced AI compatibility matching.',
  keywords: ['MatchNova', 'dating', 'AI dating', 'premium matchmaking', 'love tech'],
  authors: [{ name: 'MatchNova Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="bg-[#09090b] text-[#fafafa] min-h-screen flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
