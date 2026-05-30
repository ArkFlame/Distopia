import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Distopia',
  description: 'Self-contained community chat app with servers, friends, themes, uploads, webhooks, and moderation.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
