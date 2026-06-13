import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceIO CRM — Premium Interior Design CRM',
  description: 'Dynamic quotation engine, project tracking, and billing system for designers & architects.',
  icons: {
    icon: [
      { url: '/spacio_logo.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/spacio_logo.png', sizes: '180x180', type: 'image/png' }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/spacio_logo.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/spacio_logo.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
