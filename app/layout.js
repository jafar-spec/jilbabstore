import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import { WishlistProvider } from '@/context/WishlistContext'
import ClientWrapper from '@/components/ClientWrapper'
import Analytics from '@/components/Analytics'
import { Suspense } from 'react'

export const metadata = {
  metadataBase: new URL('https://jilbabstore.com'),
  title: 'متجر جلباب | Jilbab Store',
  description: 'אופנה צנועה יוקרתית | Premium Modest Fashion',
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
                </WishlistProvider>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
