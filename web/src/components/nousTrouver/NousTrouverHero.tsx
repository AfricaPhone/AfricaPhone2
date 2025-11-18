import Image from "next/image";
import Link from "next/link";
import type { StoreOverview } from "@/data/nousTrouver";

export function NousTrouverHero({ overview }: { overview: StoreOverview }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="relative h-56 w-full sm:h-64">
        <Image
          src={overview.coverImage}
          alt={`Couverture ${overview.name}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1280px"
          className="object-cover object-center"
          priority
        />
      </div>
      <div className="px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center gap-4">
          <div className="-mt-24 h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg outline outline-4 outline-blue-500">
            <Image src={overview.logo} alt="Logo AfricaPhone" fill className="object-contain p-4" sizes="128px" priority />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{overview.category}</p>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{overview.name}</h1>
            <p className="text-sm text-slate-600 sm:text-base">{overview.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-700">
            <span>{overview.followersCount}</span>
            <span aria-hidden="true" className="text-slate-300">
              &bull;
            </span>
            <span>{overview.followingCount}</span>
          </div>
          <p className="max-w-2xl text-sm text-slate-700 sm:text-base">{overview.profileDescription}</p>
          <div className="space-y-1 text-sm font-semibold text-slate-800">
            <p>NOTRE CATALOGUE DE PRIX :</p>
            <Link href={overview.catalogUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {overview.catalogLabel}
            </Link>
          </div>
          <p className="text-sm text-slate-700 sm:text-base">{overview.contactLine}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200"
            >
              Following
            </button>
            <Link
              href={overview.contact.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              WhatsApp
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Plus
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
