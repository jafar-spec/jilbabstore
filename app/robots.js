export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Keep private/account/admin areas out of the index.
        disallow: ['/admin', '/courier', '/profile', '/checkout', '/api/'],
      },
    ],
    sitemap: 'https://jilbab.store/sitemap.xml',
  };
}
