import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BeamBorder({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("beam-border rounded p-[1px]", className)}>
      <div className="beam-inner" />
      <div className="relative z-10 rounded bg-background">{children}</div>
    </div>
  );
}
