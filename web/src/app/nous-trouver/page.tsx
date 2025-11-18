'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

type BoutiqueInfoDocument = {
  name?: unknown;
  description?: unknown;
  coverImageUrl?: unknown;
  profileImageUrl?: unknown;
  whatsappNumber?: unknown;
  phoneNumber?: unknown;
  websiteUrl?: unknown;
  catalogUrl?: unknown;
  address?: unknown;
  mapUrl?: unknown;
};

type BoutiquePageData = {
  name: string;
  coverImage: string;
  avatarImage: string;
  address: string;
  contactDisplay: string;
  contactTelHref: string;
  whatsappLink: string;
  mapLink: string;
};

const DEFAULT_PAGE_DATA: BoutiquePageData = {
  name: 'Africa PHONE',
  coverImage: '',
  avatarImage: '/logo.png',
  address: 'Immeuble AfricaPhone, Rue 352, Ganhi - Cotonou, Benin',
  contactDisplay: '+229 0154151522',
  contactTelHref: 'tel:+2290154151522',
  whatsappLink: 'https://wa.me/2290154151522',
  mapLink: 'https://goo.gl/maps/oMaa8b2oZ9cQmRBN9?g_st=am',
};

const safeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, '');

const ensurePhoneDisplay = (value: string): string => {
  const digits = digitsOnly(value);
  if (digits.length === 0) {
    return value;
  }

  if (digits.startsWith('229') && digits.length > 3) {
    return `+229 ${digits.slice(3)}`;
  }

  if (digits.length >= 11) {
    const parts = [
      digits.slice(0, digits.length - 8),
      digits.slice(-8, -6),
      digits.slice(-6, -4),
      digits.slice(-4, -2),
      digits.slice(-2),
    ].filter(Boolean);
    return parts.join(' ').trim();
  }

  if (digits.length >= 8) {
    const parts = [
      digits.slice(0, digits.length - 4),
      digits.slice(-4, -2),
      digits.slice(-2),
    ].filter(Boolean);
    return parts.join(' ').trim();
  }

  return value;
};

const toWhatsappLink = (value: string, fallback: string): string => {
  const digits = digitsOnly(value);
  if (!digits) {
    return fallback;
  }
  const sanitized = digits.startsWith('00') ? digits.slice(2) : digits;
  return `https://wa.me/${sanitized}`;
};

const toTelHref = (value: string, fallback: string): string => {
  const digits = digitsOnly(value);
  if (!digits) {
    return fallback;
  }
  if (value.trim().startsWith('+')) {
    return `tel:+${digits}`;
  }
  return `tel:${digits}`;
};

const buildPageData = (raw: BoutiqueInfoDocument | null | undefined): BoutiquePageData => {
  if (!raw) {
    return DEFAULT_PAGE_DATA;
  }

  const name = safeString(raw.name) ?? DEFAULT_PAGE_DATA.name;
  const coverImage = safeString(raw.coverImageUrl) ?? DEFAULT_PAGE_DATA.coverImage;
  const avatarImage = safeString(raw.profileImageUrl) ?? DEFAULT_PAGE_DATA.avatarImage;
  const phoneSource =
    safeString(raw.whatsappNumber) ??
    safeString(raw.phoneNumber) ??
    DEFAULT_PAGE_DATA.contactDisplay;
  const contactDisplay = ensurePhoneDisplay(phoneSource);

  const address =
    safeString(raw.address) ??
    safeString(raw.description) ??
    DEFAULT_PAGE_DATA.address;

  const whatsappLink = toWhatsappLink(phoneSource, DEFAULT_PAGE_DATA.whatsappLink);
  const contactTelHref = toTelHref(phoneSource, DEFAULT_PAGE_DATA.contactTelHref);
  const mapLink = safeString(raw.mapUrl) ?? DEFAULT_PAGE_DATA.mapLink;

  return {
    name,
    coverImage,
    avatarImage,
    address,
    contactDisplay,
    contactTelHref,
    whatsappLink,
    mapLink,
  };
};

export default function NousTrouverPage() {
  const [pageData, setPageData] = useState<BoutiquePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const handleCoverError = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      event.currentTarget.onerror = null;
      setPageData((prev) => (prev ? { ...prev, coverImage: '' } : prev));
    },
    [],
  );

  const handleAvatarError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_PAGE_DATA.avatarImage;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBoutiqueInfo = async () => {
      try {
        const docRef = doc(db, 'config', 'boutiqueInfo');
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          if (isMounted) {
            setPageData(null);
            setLoadError(true);
          }
          return;
        }
        const data = snapshot.data() as BoutiqueInfoDocument;
        if (isMounted) {
          setPageData(buildPageData(data));
          setLoadError(false);
        }
      } catch (error) {
        console.error('Unable to load boutiqueInfo document', error);
        if (isMounted) {
          setPageData(null);
          setLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBoutiqueInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"
            aria-label="Chargement des informations"
          />
          <p className="text-sm text-slate-600">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-slate-900">
        <p className="px-6 text-center text-base text-slate-700">
          {loadError
            ? 'Impossible de charger les informations de la boutique pour le moment.'
            : 'Les informations de la boutique ne sont pas disponibles pour le moment.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-md flex-col pb-10">
        <section className="relative">
          <div className="relative flex w-full justify-center bg-slate-200">
            {pageData.coverImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pageData.coverImage}
                  alt={`Vitrine de ${pageData.name}`}
                  className="h-auto w-auto max-w-full"
                  loading="eager"
                  onError={handleCoverError}
                />
              </>
            ) : (
              <div className="h-40 w-full" aria-hidden="true" />
            )}
          </div>
          <div className="absolute left-4 -bottom-11">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white shadow-lg outline outline-[4px] outline-blue-600">
              <div className="relative h-[88px] w-[88px] overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pageData.avatarImage}
                  alt={`Logo ${pageData.name}`}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  onError={handleAvatarError}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pt-16">
          <h1 className="text-[26px] font-bold leading-tight text-slate-900">{pageData.name}</h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Ouvert tous les jours de 7h Ã  22h Â· 7J/7
          </p>
        </section>

        <section className="px-4 pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                Adresse de la boutique
              </p>
              <p className="mt-2 text-base text-slate-900">{pageData.address}</p>
            </div>
            <p className="text-base text-slate-800">
              Appel &amp; WhatsApp :{' '}
              <a href={pageData.contactTelHref} className="font-semibold text-slate-900 hover:underline">
                {pageData.contactDisplay}
              </a>
            </p>
            <Link
              href={pageData.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <DirectionsIcon className="h-5 w-5" aria-hidden="true" />
              Voir la localisation Google Maps
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function DirectionsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m12.94 4.44 6.62 6.62a1 1 0 0 1 0 1.41l-6.62 6.62a1 1 0 0 1-1.41 0l-6.62-6.62a1 1 0 0 1 0-1.41l6.62-6.62a1 1 0 0 1 1.41 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 7h2.5a.5.5 0 0 1 .5.5V10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 13h2l-2-2 2-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
