import InfoPage, { Section } from '@/components/InfoPage';
import Link from 'next/link';

export const metadata = {
  title: 'تواصلي معنا',
  description: 'طرق التواصل مع متجر جلباب وخدمة العملاء.',
};

export default function ContactPage() {
  return (
    <InfoPage title="تواصلي معنا">
      <Section>
        <p>يسعدنا تواصلكِ معنا لأي استفسار أو مساعدة. فريق خدمة العملاء جاهز لمساعدتكِ.</p>
      </Section>
      <Section heading="خدمة العملاء">
        <p>افتحي نافذة «خدمة العملاء» في أسفل الموقع لإرسال رسالتكِ، وسنردّ في أقرب وقت ممكن.</p>
      </Section>
      <Section heading="تتبع طلب">
        <p>لمتابعة حالة طلبكِ توجّهي إلى صفحة <Link href="/track" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>تتبع طلبي</Link>.</p>
      </Section>
    </InfoPage>
  );
}
