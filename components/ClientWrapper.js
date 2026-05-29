"use client";
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartSidebar from '@/components/CartSidebar';
import CustomerServiceWidget from '@/components/CustomerServiceWidget';

export default function ClientWrapper({ children }) {
  const pathname = usePathname();
  
  // Do not render consumer layout in the admin dashboard
  if (pathname && pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '80vh' }}>
        {children}
      </main>
      <CartSidebar />
      <CustomerServiceWidget />
      <Footer />
    </>
  );
}
