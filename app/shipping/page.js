import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'الشحن والتوصيل',
  description: 'تفاصيل الشحن والتوصيل وأوقات التسليم.',
};

export default function ShippingPage() {
  return <InfoPageContent slug="shipping" />;
}
