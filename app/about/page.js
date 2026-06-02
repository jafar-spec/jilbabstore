import InfoPageContent from '@/components/InfoPageContent';
import { PAGE_DEFAULTS } from '@/lib/pageContent';

export const revalidate = 0; // always reflect the latest admin edits
export const metadata = {
  title: 'من نحن',
  description: 'تعرّفي على متجر جلباب — وجهتكِ للأزياء المحتشمة العصرية.',
};

export default function AboutPage() {
  return <InfoPageContent slug="about" />;
}
