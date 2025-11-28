import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showAll?: boolean;
  href?: string;
  sectionKey?: string;
}

export function SectionHeader({ title, subtitle, showAll = true, href, sectionKey }: SectionHeaderProps) {
  const linkHref = href || (sectionKey ? `/section/${sectionKey}` : "#");
  
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold font-display">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {showAll && (
        <Link 
          to={linkHref}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          See all
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
