import '@/styles.css';
import SiteShell from '@/components/SiteShell';

export const metadata = {
  title: 'SKR — Sivabhagya | Hotels in Kodaikanal & Madurai',
  description: 'SKR Sivabhagya — an adventure resort in Kodaikanal, a business class hotel in Aarapalayam and service apartments in Kochadai, Madurai.',
  icons: {
    icon: '/assets/favicon.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="js">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteShell>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
