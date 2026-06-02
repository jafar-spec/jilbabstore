import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'سياسة الخصوصية',
  description: 'سياسة الخصوصية لمتجر جلباب.',
};

export default function PrivacyPolicy() {
  return <InfoPageContent slug="privacy" />;
}
