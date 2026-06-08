// Site-wide JSON-LD: Organization (brand/logo) + WebSite (with a SearchAction
// so search engines can surface a sitelinks search box pointing at /search?q=).
// Static + server-rendered for reliable crawler pickup.
const SITE_URL = 'https://jilbab.store';

export default function StructuredData() {
  const graph = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Jilbab Store',
      alternateName: 'متجر جلباب',
      url: SITE_URL,
      logo: `${SITE_URL}/assets/logo.png`,
      image: `${SITE_URL}/assets/logo.png`,
      description: 'أزياء محتشمة عصرية — جلابيب وخمارات بلمسة أنيقة. Premium modest fashion.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Jilbab Store',
      url: SITE_URL,
      inLanguage: ['ar', 'he', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
