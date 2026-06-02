import InfoPage, { Section } from '@/components/InfoPage';

export const metadata = {
  title: 'من نحن',
  description: 'تعرّفي على متجر جلباب — وجهتكِ للأزياء المحتشمة العصرية.',
};

export default function AboutPage() {
  return (
    <InfoPage title="من نحن">
      <Section>
        <p>متجر جلباب هو وجهتكِ للأزياء المحتشمة الراقية. نقدّم تشكيلات مختارة بعناية من الجلابيب والخمارات بخامات مريحة وتصاميم عصرية تجمع بين الأناقة والاحتشام.</p>
      </Section>
      <Section heading="رؤيتنا">
        <p>أن نوفّر لكل امرأة ملابس محتشمة عالية الجودة بأسعار عادلة وتجربة تسوّق سهلة وموثوقة، مع خدمة عملاء تهتم بأدق التفاصيل.</p>
      </Section>
      <Section heading="لماذا نحن؟">
        <ul style={{ paddingInlineStart: '1.2rem' }}>
          <li>خامات منتقاة وجودة عالية في التفاصيل.</li>
          <li>توصيل سريع وإمكانية الدفع عند الاستلام.</li>
          <li>دعم عملاء سريع الاستجابة.</li>
          <li>سياسة إرجاع واضحة وعادلة.</li>
        </ul>
      </Section>
    </InfoPage>
  );
}
