import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'الشروط والأحكام',
  description: 'شروط وأحكام استخدام متجر جلباب.',
};

export default function TermsPage() {
  return <InfoPageContent slug="terms" />;
}
