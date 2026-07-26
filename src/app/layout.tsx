import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import { BookingProvider } from '@/context/BookingContext';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Hill View — Boutique Hillside Retreat',
  description:
    'Escape to the serene heights of Hill View. Book your stay in our luxurious rooms with breathtaking valley views. Adventures, relaxation, and unforgettable memories await.',
  keywords: [
    'lodge',
    'hillside retreat',
    'boutique hotel',
    'valley view',
    'booking',
    'vacation',
  ],
  openGraph: {
    title: 'Hill View — Boutique Hillside Retreat',
    description:
      'Wake up above the clouds — your peaceful hillside escape awaits.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased flex flex-col min-h-dvh">
        <BookingProvider>
          <Navbar />
          <div className="flex-grow">
            <PageTransition>{children}</PageTransition>
          </div>
          <Footer />
        </BookingProvider>
      </body>
    </html>
  );
}

