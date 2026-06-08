// Web App Manifest (Next metadata route) — makes the store installable / "Add to Home Screen".
export default function manifest() {
  return {
    name: 'متجر جلباب | Jilbab Store',
    short_name: 'Jilbab Store',
    description: 'أزياء محتشمة عصرية — جلابيب وخمارات بلمسة أنيقة. Premium modest fashion.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f1f3',
    theme_color: '#141414',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      { src: '/assets/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/assets/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/assets/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
