import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'James Kocher',
  description:
    'James Kocher — Product Manager and builder who cares about making great products with scale in mind.',
  metadataBase: new URL('https://jameskocher.com'),
  openGraph: {
    title: 'James Kocher',
    description:
      'Product Manager and builder who cares about making great products with scale in mind.',
    url: 'https://jameskocher.com',
    siteName: 'James Kocher',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta
          name="robots"
          content="index, follow, noai, noimageai, notrain, max-image-preview:large"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
