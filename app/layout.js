import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import { WishlistProvider } from '@/context/WishlistContext'
import ClientWrapper from '@/components/ClientWrapper'
import Analytics from '@/components/Analytics'
import CookieConsent from '@/components/CookieConsent'
import { Suspense } from 'react'

export const metadata = {
  metadataBase: new URL('https://jilbab.store'),
  title: {
    default: 'متجر جلباب | Jilbab Store',
    template: '%s | Jilbab Store',
  },
  description: 'أزياء محتشمة عصرية — جلابيب وخمارات بلمسة أنيقة. Premium modest fashion.',
  keywords: ['جلباب', 'خمار', 'عباية', 'أزياء محتشمة', 'jilbab', 'khimar', 'modest fashion', 'abaya'],
  icons: {
    icon: '/assets/logo.png',
    shortcut: '/assets/logo.png',
    apple: '/assets/logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Jilbab Store',
    title: 'متجر جلباب | Jilbab Store',
    description: 'أزياء محتشمة عصرية — جلابيب وخمارات بلمسة أنيقة.',
    images: ['/assets/logo.png'],
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }) {
  // Note: dir="rtl" and lang="ar" will be dynamically overridden by LanguageProvider on the client
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <WishlistProvider>
                  <ClientWrapper>
                    {children}
                  </ClientWrapper>
                  <CookieConsent />
                </WishlistProvider>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
