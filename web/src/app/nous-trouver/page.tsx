import { NousTrouverGallery } from '@/components/nousTrouver/NousTrouverGallery';
import { NousTrouverHero } from '@/components/nousTrouver/NousTrouverHero';
import { NousTrouverLocations } from '@/components/nousTrouver/NousTrouverLocations';
import { NousTrouverSupport } from '@/components/nousTrouver/NousTrouverSupport';
import { NousTrouverAppointment } from '@/components/nousTrouver/NousTrouverAppointment';
import { NousTrouverMap } from '@/components/nousTrouver/NousTrouverMap';
import { galleryImages, locations, supportChannels } from '@/data/nousTrouver';

export default function NousTrouverPage() {
  const logisticsInfo = {
    label: 'Horaires centre logistique',
    hours: {
      weekday: 'Lundi - Samedi, 8h00 - 20h00',
      weekend: 'Dimanche, 10h00 - 17h00 (assistance distante)',
    },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <NousTrouverGallery images={galleryImages} />

        <NousTrouverHero
          eyebrow="Nous rencontrer"
          title="Ou nous trouver"
          description="Passez nous voir dans l une de nos boutiques ou convenez d un rendez-vous prive avec un expert AfricaPhone. Nous sommes disponibles pour vous aider a choisir le bon appareil, configurer vos services et assurer un suivi apres-vente complet."
        />

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <NousTrouverLocations locations={locations} />
          <NousTrouverSupport
            channels={supportChannels}
            logisticsLabel={logisticsInfo.label}
            logisticsHours={logisticsInfo.hours}
          />
        </section>

        <NousTrouverMap
          title="Localisation Google Maps"
          mapSrc="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.479638142375!2d2.432964375831585!3d6.462064623576394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1023574372053ac7%3A0x7d4f4f667a212f2d!2sGanhi%2C%20Cotonou%2C%20Benin!5e0!3m2!1sen!2sbj!4v1718035200000!5m2!1sen!2sbj"
        />

        <NousTrouverAppointment />
      </main>
    </div>
  );
}
