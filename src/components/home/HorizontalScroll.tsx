import { ReactNode } from "react";

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className = "" }: HorizontalScrollProps) {
  return (
    <div className={`overflow-x-auto hide-scrollbar -mx-4 px-4 ${className}`}>
      <div className="flex gap-4">
        {children}
      </div>
    </div>
  );
}
