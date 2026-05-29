"use client";
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import CartSidebar from '@/components/CartSidebar';
import Footer from '@/components/Footer';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getProducts, getSections } from '@/lib/db';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dbProducts, dbSections] = await Promise.all([
          getProducts(),
          getSections()
        ]);
        setProducts(dbProducts);
        setSections(dbSections);
      } catch (error) {
        console.error("Error loading home data", error);
        setProducts([]);
        setSections([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <main>
      <Hero />
      
      {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', fontFamily: 'var(--font-serif)', color: 'var(--text-secondary)' }}>
            {t('loading') || "Loading..."}
          </div>
      ) : (
          <>
            {sections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                {t('noSections')}
              </div>
            ) : (
              sections.map((section, index) => {
                const sectionProducts = products.filter(p => p.sectionId === section.id);
                const secTitleKey = section.title_en ? section.title_en.toLowerCase() : '';
                const sectionTitle = t(secTitleKey) !== secTitleKey ? t(secTitleKey) : (lang === 'en' ? section.title_en : section.title_ar);
                
                return (
                  <div key={section.id} id={index === 0 ? 'shop' : undefined}>
                    <div id={`section-${section.id}`}>
                      <ProductGrid 
                        title={sectionTitle} 
                        products={sectionProducts} 
                        emptyMessage={t('emptySection')} 
                      />
                    </div>
                    {/* Add divider except for the last section */}
                    {index < sections.length - 1 && (
                      <div style={{ width: '80%', margin: '0 auto', borderBottom: '1px solid var(--border-color)' }}></div>
                    )}
                  </div>
                );
              })
            )}
          </>
      )}

      
      
    </main>
  );
}
