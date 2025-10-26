import { NousTrouverGallery } from '@/components/nousTrouver/NousTrouverGallery';
import { NousTrouverHero } from '@/components/nousTrouver/NousTrouverHero';
import { NousTrouverLocations } from '@/components/nousTrouver/NousTrouverLocations';
import { NousTrouverInfoSections } from '@/components/nousTrouver/NousTrouverInfoSections';
import { NousTrouverAppointment } from '@/components/nousTrouver/NousTrouverAppointment';
import { NousTrouverMap } from '@/components/nousTrouver/NousTrouverMap';
import { storeOverview } from '@/data/nousTrouver';

export default function NousTrouverPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-2 pb-16 pt-10 sm:px-3 lg:px-5">
        <NousTrouverHero overview={storeOverview} />

        <NousTrouverGallery images={storeOverview.gallery} />

        <NousTrouverInfoSections overview={storeOverview} />

        <NousTrouverLocations overview={storeOverview} />

        <NousTrouverMap title="Localisation Google Maps" mapSrc={storeOverview.mapEmbed} />

        <NousTrouverAppointment />
      </main>
    </div>
  );
}
