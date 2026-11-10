import './globals.css';
import type { Metadata } from 'next';
import SessionGuard from './components/SessionGuard';
import FeedbackButton from './components/FeedbackButton';
import ToastProvider from './components/ToastProvider';

export const metadata: Metadata = {
  title: 'SpaceIO CRM — Premium Interior Design CRM',
  description: 'Dynamic quotation engine, project tracking, and billing system for designers & architects.',
  icons: {
    icon: [
      { url: '/spaceio_logo.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/spaceio_logo.png', sizes: '180x180', type: 'image/png' }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('spacio-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <link rel="icon" href="/spaceio_logo.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/spaceio_logo.png" />
      </head>
      <body className="antialiased">
        <ToastProvider>
          {children}
          <FeedbackButton />
        </ToastProvider>
        <SessionGuard />
      </body>
    </html>
  );
}
