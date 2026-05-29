"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en';
import he from '../locales/he';
import ar from '../locales/ar';
import { getStoreSettings } from '@/lib/db';

const translations = { en, he, ar };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ar');
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    // Fetch global store settings
    const fetchSettings = async () => {
      const settings = await getStoreSettings();
      setStoreSettings(settings);
    };
    fetchSettings();

    // Load from local storage if exists
    const storedLang = localStorage.getItem('store_lang');
    if (storedLang && translations[storedLang]) {
      setLang(storedLang);
    }
  }, []);

  useEffect(() => {
    // Dynamically update document dir and lang for RTL/LTR support
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    localStorage.setItem('store_lang', lang);
  }, [lang]);

  // Translation function
  const t = (key) => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, storeSettings }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
