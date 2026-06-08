import InfoPageContent from '@/components/InfoPageContent';

export const revalidate = 0;
export const metadata = {
  title: 'دليل المقاسات | טבלת מידות',
  description: 'دليل المقاسات لمتجر جلباب — قارني قياساتك لاختيار المقاس المناسب.',
};

export default function SizeGuidePage() {
  return <InfoPageContent slug="sizeguide" />;
}
