import type { LucideIcon } from "lucide-react";

// Uma medida e um traço para todos os ícones de interface.
export function UiIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon size={16} strokeWidth={1.75} className={className} aria-hidden="true" focusable="false" />;
}
