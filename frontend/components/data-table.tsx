import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DataTableProps {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function DataTable({ headers, children, className, footer }: DataTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/30", className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/20 bg-muted/20">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {footer && <div className="border-t border-border/10 px-4 py-2">{footer}</div>}
    </div>
  );
}

export function DataTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/10 text-[12px] text-foreground/70 transition-colors last:border-0 hover:bg-muted/15",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-2.5 align-middle", className)}>{children}</td>;
}

export function TablePill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/20 bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60",
        className
      )}
    >
      {children}
    </span>
  );
}
