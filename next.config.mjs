/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [72, 75, 85, 90, 95],
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            // Balanced CSP: blocks injected/3rd-party scripts, framing and base
            // hijacking, while allowing the services the app actually uses
            // (Firebase, Google Analytics, reCAPTCHA, Algolia, Font Awesome,
            // map tiles). 'unsafe-inline' is required for our inline styles +
            // gtag/JSON-LD; external script ORIGINS are still locked down.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://cdnjs.cloudflare.com https://*.algolia.net https://*.algolianet.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://cdnjs.cloudflare.com",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://www.google.com https://recaptcha.google.com https://*.firebaseapp.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
