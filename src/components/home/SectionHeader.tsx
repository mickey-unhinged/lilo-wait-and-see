import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showAll?: boolean;
  href?: string;
  sectionKey?: string;
  icon?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, showAll = true, href, sectionKey, icon }: SectionHeaderProps) {
  const linkHref = href || (sectionKey ? `/section/${sectionKey}` : "#");
  
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold font-display">{title}</h2>
        </div>
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
