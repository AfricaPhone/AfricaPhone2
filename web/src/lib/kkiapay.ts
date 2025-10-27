'use client';

import type { IData, ListenerData } from 'kkiapay/dist/src/typings';

type KkiapayModule = typeof import('kkiapay');

let modulePromise: Promise<KkiapayModule> | null = null;

const ensureClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('Kkiapay is only available in the browser.');
  }
};

export const loadKkiapay = async (): Promise<KkiapayModule> => {
  ensureClient();
  if (!modulePromise) {
    modulePromise = import('kkiapay');
  }
  return modulePromise;
};

export type { IData as KkiapayWidgetOptions, ListenerData as KkiapayListenerData };
