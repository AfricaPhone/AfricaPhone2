import '@testing-library/jest-dom';
import React from 'react';

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line react/display-name
  default: ({ priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    // Intentionally ignore Next.js optimisations in tests
    return React.createElement('img', props);
  },
}));

jest.mock('next/navigation', () => {
  const push = jest.fn();
  const replace = jest.fn();
  const prefetch = jest.fn();

  return {
    __esModule: true,
    useRouter: () => ({
      push,
      replace,
      prefetch,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      pathname: '/',
    }),
    useSearchParams: () => new URLSearchParams(),
  };
});
