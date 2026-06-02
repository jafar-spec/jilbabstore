import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'تواصلي معنا',
  description: 'طرق التواصل مع متجر جلباب وخدمة العملاء.',
};

export default function ContactPage() {
  return <InfoPageContent slug="contact" />;
}
