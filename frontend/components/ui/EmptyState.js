import { cn } from '@/lib/utils';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
          <Icon size={20} className="text-gray-400" />
        </div>
      )}
      {title && (
        <p className="text-sm font-semibold text-gray-700">{title}</p>
      )}
      {description && (
        <p className="text-sm text-gray-400 mt-1.5 max-w-xs">{description}</p>
      )}
      {action && actionLabel && (
        <Button size="sm" onClick={action} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
