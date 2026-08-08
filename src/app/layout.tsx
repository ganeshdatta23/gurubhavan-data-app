import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guru Bhavan Registry',
  description: 'Simple devotee data management for Guru Bhavan volunteers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
