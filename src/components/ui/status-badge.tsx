import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          className: 'bg-success-light text-success border-success/20'
        };
      case 'submitted':
        return {
          label: 'Pending Review',
          className: 'bg-warning-light text-warning border-warning/20'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      default:
        return {
          label: 'Draft',
          className: 'bg-muted text-muted-foreground border-border'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}