import { getPage } from '@/lib/db';
import { PAGE_DEFAULTS } from '@/lib/pageContent';
import InfoPage, { Section } from '@/components/InfoPage';

// Server component: renders an editable page from Firestore, falling back to the
// built-in defaults until an admin saves content.
export default async function InfoPageContent({ slug }) {
  const data = (await getPage(slug)) || PAGE_DEFAULTS[slug] || { title: '', blocks: [] };
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  return (
    <InfoPage title={data.title}>
      {blocks.map((b, i) => (
        <Section key={i} heading={b.heading}>
          {String(b.body || '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map((p, j) => <p key={j} style={{ marginBottom: '0.5rem' }}>{p}</p>)}
        </Section>
      ))}
    </InfoPage>
  );
}
