import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'سياسة الإرجاع',
  description: 'سياسة الإرجاع والاستبدال في متجر جلباب.',
};

export default function ReturnsPolicy() {
  return <InfoPageContent slug="returns" />;
}
