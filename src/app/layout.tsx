import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LunaRov — Lunar Rover Mission Control & Path Simulator',
  description:
    'LunaRov is an interactive educational aerospace simulator for lunar rover mission planning, terrain generation, multi-algorithm pathfinding (A*, Dijkstra, Greedy BFS), obstacle avoidance, and telemetry analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistMono.variable} dark h-full`}>
      <body className="min-h-full flex flex-col bg-[#040711] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
