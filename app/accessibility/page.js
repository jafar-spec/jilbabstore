import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'إمكانية الوصول | הצהרת נגישות',
  description: 'بيان إمكانية الوصول لمتجر جلباب — التزامنا بإتاحة الموقع للجميع.',
};

export default function AccessibilityPage() {
  return <InfoPageContent slug="accessibility" />;
}
