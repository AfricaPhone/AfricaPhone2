import BrandPageClient from './BrandPageClient';

type BrandPageProps = {
  params: {
    brandId: string;
  };
};

export default function BrandPage({ params }: BrandPageProps) {
  return <BrandPageClient brandId={params.brandId} />;
}
