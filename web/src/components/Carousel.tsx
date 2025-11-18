'use client';

import type { PropsWithChildren, ReactNode } from 'react';

type CarouselProps = PropsWithChildren<{
  className?: string;
}>;

export default function Carousel({ children, className }: CarouselProps) {
  const items: ReactNode[] = Array.isArray(children) ? children : [children];
  return (
    <div className={className}>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((child, index) => (
          <div key={index} className="snap-start">
            {child}
          </div>
        ))}
      </div>
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
