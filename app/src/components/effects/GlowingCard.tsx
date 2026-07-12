import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export function GlowingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (innerRef.current) innerRef.current.style.opacity = "1";
    if (borderRef.current) borderRef.current.style.opacity = "1";
  }

  function onLeave() {
    if (innerRef.current) innerRef.current.style.opacity = "0";
    if (borderRef.current) borderRef.current.style.opacity = "0";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("glow-card rounded", className)}
    >
      <div ref={borderRef} className="glow-card-border" />
      <div ref={innerRef} className="glow-card-inner" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
