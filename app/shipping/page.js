import InfoPage, { Section } from '@/components/InfoPage';

export const metadata = {
  title: 'الشحن والتوصيل',
  description: 'تفاصيل الشحن والتوصيل وأوقات التسليم.',
};

export default function ShippingPage() {
  return (
    <InfoPage title="الشحن والتوصيل">
      <Section heading="مدة التوصيل">
        <p>يتم تجهيز الطلبات خلال ٢٤–٤٨ ساعة، ويصل الطلب عادةً خلال ٢ إلى ٥ أيام عمل حسب المنطقة.</p>
      </Section>
      <Section heading="تكلفة الشحن">
        <p>تُحتسب تكلفة الشحن عند إتمام الطلب، والشحن مجاني للطلبات التي تتجاوز الحد الموضّح في صفحة الدفع.</p>
      </Section>
      <Section heading="الدفع عند الاستلام">
        <p>يمكنكِ الدفع نقداً للمندوب عند استلام الطلب. يُرجى توفير المبلغ المطلوب.</p>
      </Section>
      <Section heading="تتبع الطلب">
        <p>بعد إتمام الطلب يصلكِ رقم الطلب لتتبّع حالته من صفحة «تتبع طلبي».</p>
      </Section>
    </InfoPage>
  );
}
