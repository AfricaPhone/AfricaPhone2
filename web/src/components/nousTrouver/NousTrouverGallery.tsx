import Image from 'next/image';
import type { GalleryImage } from '@/data/nousTrouver';

export function NousTrouverGallery({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map(image => (
        <div
          key={image.src}
          className="relative h-56 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:h-64 lg:h-72"
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover object-center"
            priority
          />
        </div>
      ))}
    </section>
  );
}
