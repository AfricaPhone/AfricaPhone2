'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { getCartCount, subscribeToCart } from '@/lib/cart';
import { auth } from '@/lib/firebaseClient';

type NavItem = {
  label: string;
  href: string;
  icon: (props: IconProps) => JSX.Element;
  badge?: string;
};

type IconProps = {
  className?: string;
};

type NotificationsApiResponse = {
  unreadCount?: number;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Catalogue', href: '/', icon: HomeIcon },
  { label: 'Panier', href: '/panier', icon: CartIcon },
  { label: 'Commandes', href: '/commandes', icon: PackageSearchIcon },
  { label: 'Notifs', href: '/notifs', icon: BellIcon },
  { label: 'Compte', href: '/compte', icon: UserIcon },
];

const formatBadgeCount = (count: number) => (count > 9 ? '9+' : String(count));

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setCartCount(getCartCount());
    return subscribeToCart(() => setCartCount(getCartCount()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUnreadNotifications = async (user: User | null = auth.currentUser) => {
      if (!user) {
        if (!cancelled) {
          setNotificationCount(0);
        }
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const body = (await response.json().catch(() => null)) as NotificationsApiResponse | null;

        if (!response.ok) {
          throw new Error('notifications unavailable');
        }

        if (!cancelled) {
          const nextCount = typeof body?.unreadCount === 'number' ? body.unreadCount : 0;
          setNotificationCount(Math.max(0, nextCount));
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(0);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, user => {
      void loadUnreadNotifications(user);
    });
    const handleRefresh = () => {
      void loadUnreadNotifications();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        void loadUnreadNotifications();
      }
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('africaphone:notifications-updated', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('africaphone:notifications-updated', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <nav
      aria-label="Navigation principale AfricaPhone"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.65)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname === item.href;
          const badge =
            item.label === 'Panier' && cartCount > 0
              ? formatBadgeCount(cartCount)
              : item.label === 'Notifs' && notificationCount > 0
                ? formatBadgeCount(notificationCount)
                : item.badge;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
                isActive ? 'text-[#059669]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon className="h-[22px] w-[22px]" />
                {badge ? (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-extrabold leading-none text-white shadow-sm ring-2 ring-white">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m3 10.5 9-7 9 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10v10h14V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l2.1 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.5L21 8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21h.01M18 21h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PackageSearchIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 7 4v7.5L12 19l-7-4.5V7l7-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m5.5 7.3 6.5 3.8 6.5-3.8M12 11v7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m9 5.2 7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M17.5 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM20 20l1.5 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
