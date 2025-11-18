/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="next/navigation-types/compat/navigation" />

declare module '*.svg' {
  import type { ReactElement, SVGProps } from 'react';
  const content: ReactElement<SVGProps<SVGSVGElement>>;
  export default content;
}
