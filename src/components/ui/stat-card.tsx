import { cn } from '@/lib/utils'
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  trend?: {
    value: number
    label: string
    direction?: 'up' | 'down' | 'neutral'
  }
  icon?: LucideIcon
  className?: string
  onClick?: () => void
}

export function StatCard({ label, value, trend, icon: Icon, className, onClick }: StatCardProps) {
  const isPositive = trend?.direction === 'up' || (trend && !trend.direction && trend.value > 0)
  const isNegative = trend?.direction === 'down' || (trend && !trend.direction && trend.value < 0)

  return (
    <div
      className={cn(
        'p-5 rounded-lg border bg-card',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-[28px] font-bold tabular-nums text-foreground leading-none">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive && <TrendingUp className="h-3 w-3 text-emerald-600" />}
          {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
          <span className={cn(
            'text-xs',
            isPositive && 'text-emerald-600',
            isNegative && 'text-red-500',
            !isPositive && !isNegative && 'text-muted-foreground'
          )}>
            {trend.value > 0 ? '+' : ''}{trend.value}
          </span>
          <span className="text-xs text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
