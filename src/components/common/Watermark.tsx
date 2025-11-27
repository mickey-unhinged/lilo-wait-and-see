import { cn } from "@/lib/utils";

interface WatermarkProps {
  className?: string;
  variant?: "default" | "light" | "subtle";
}

export function Watermark({ className, variant = "default" }: WatermarkProps) {
  return (
    <p 
      className={cn(
        "text-xs font-medium tracking-wide",
        variant === "default" && "text-muted-foreground/60",
        variant === "light" && "text-primary-foreground/60",
        variant === "subtle" && "text-muted-foreground/40",
        className
      )}
    >
      Powered by Rookie TL
    </p>
  );
}
