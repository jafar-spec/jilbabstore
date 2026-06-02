import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'الأسئلة الشائعة',
  description: 'إجابات على أكثر الأسئلة شيوعاً حول الطلب والشحن والإرجاع.',
};

export default function FaqPage() {
  return <InfoPageContent slug="faq" />;
}
