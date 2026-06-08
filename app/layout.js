import './globals.css'
import { Cairo, El_Messiri, Playfair_Display } from 'next/font/google'
import { CartProvider } from '@/context/CartContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import { WishlistProvider } from '@/context/WishlistContext'
import ClientWrapper from '@/components/ClientWrapper'
import Analytics from '@/components/Analytics'
import CookieConsent from '@/components/CookieConsent'
import AccessibilityWidget from '@/components/AccessibilityWidget'
import NewsletterPopup from '@/components/NewsletterPopup'
import WhatsAppButton from '@/components/WhatsAppButton'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import StructuredData from '@/components/StructuredData'
import { Suspense } from 'react'

// Self-hosted fonts (no render-blocking Google Fonts request; swap to avoid FOIT)
const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-cairo', display: 'swap' })
const elMessiri = El_Messiri({ subsets: ['arabic', 'latin'], weight: ['500', '600', '700'], variable: '--font-elmessiri', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-playfair', display: 'swap' })

export const viewport = {
  themeColor: '#141414',
}

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
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Jilbab Store' },
}

export default function RootLayout({ children }) {
  // Note: dir="rtl" and lang="ar" will be dynamically overridden by LanguageProvider on the client
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${elMessiri.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <StructuredData />
        <a href="#main-content" className="skip-link">تخطّ إلى المحتوى</a>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <WishlistProvider>
                  <ClientWrapper>
                    <div id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
                      {children}
                    </div>
                  </ClientWrapper>
                  <CookieConsent />
                  <AccessibilityWidget />
                  <WhatsAppButton />
                  <NewsletterPopup />
                  <ServiceWorkerRegister />
                </WishlistProvider>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
