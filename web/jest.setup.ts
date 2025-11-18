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
