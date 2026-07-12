import { useRef, type ReactNode, type MouseEvent, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: "primary" | "ghost";
};

export function SpotlightButton({
  children,
  className,
  variant = "primary",
  ...rest
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  function onMove(e: MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    if (glowRef.current) glowRef.current.style.opacity = "1";
  }
  function onLeave() {
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }

  const base =
    "spot-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded transition-colors";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border text-foreground hover:border-foreground/30 bg-transparent";

  return (
    <a
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(base, styles, className)}
      {...rest}
    >
      <span ref={glowRef} className="spot-btn-glow" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </a>
  );
}
