'use client';

import type { PropsWithChildren } from "react";

type CarouselProps = PropsWithChildren<{
  className?: string;
}>;

export default function Carousel({ children, className }: CarouselProps) {
  return (
    <div className={className}>
      <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none]">
        {Array.isArray(children)
          ? children.map((child, index) => (
              <div key={index} className="snap-start">
                {child}
              </div>
            ))
          : children}
      </div>
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
