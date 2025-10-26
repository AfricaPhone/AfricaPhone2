import Image from 'next/image';
import type { GalleryImage } from '@/data/nousTrouver';

const GALLERY_SCROLL_CLASS = 'nous-trouver-gallery-scroll';

export function NousTrouverGallery({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Un apercu de nos espaces</h2>
        {images.length > 3 ? (
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-orange-500 lg:inline">
            Faites defiler
          </span>
        ) : null}
      </div>
      <div className={`${GALLERY_SCROLL_CLASS} flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 lg:pb-3`}>
        {images.map(image => (
          <div
            key={image.src}
            className="relative h-52 min-w-[260px] snap-start overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:h-60 sm:min-w-[300px] lg:h-64 lg:min-w-[340px]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 30vw"
              className="object-cover object-center"
              priority
            />
          </div>
        ))}
      </div>
      <style jsx global>{`
        .${GALLERY_SCROLL_CLASS} {
          scrollbar-width: none;
        }
        .${GALLERY_SCROLL_CLASS}::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
