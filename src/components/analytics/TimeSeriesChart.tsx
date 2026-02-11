import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format, parseISO } from 'date-fns';

interface TimeSeriesDataPoint {
  date: string; // YYYY-MM-DD
  sessions: number;
  conversions: number;
  engaged: number;
  ctaClicked: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  conversionRate: number;
}

interface Props {
  data: TimeSeriesDataPoint[];
  comparisonData?: TimeSeriesDataPoint[];
  metric: 'sessions' | 'conversions' | 'conversionRate' | 'engaged' | 'avgScrollDepth' | 'avgTimeOnPage';
  label?: string;
  height?: number;
  showComparison?: boolean;
  valueFormatter?: (value: number) => string;
}

export function TimeSeriesChart({
  data,
  comparisonData,
  metric,
  label,
  height = 250,
  showComparison,
  valueFormatter = (v) => String(v)
}: Props) {
  const chartConfig = {
    current: { label: 'Current Period', color: '#8b5cf6' }, // Purple
    comparison: { label: 'Comparison Period', color: '#d8b4fe' }, // Light purple
  };

  // Merge datasets for Recharts (aligns dates for overlays)
  const mergedData = data.map((point, idx) => ({
    date: point.date,
    current: point[metric],
    comparison: showComparison && comparisonData?.[idx] ? comparisonData[idx][metric] : undefined,
  }));

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
      <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
        <LineChart data={mergedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(parseISO(date), 'MMM d')}
            fontSize={10}
            stroke="#9ca3af"
          />
          <YAxis
            tickFormatter={valueFormatter}
            fontSize={10}
            stroke="#9ca3af"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => valueFormatter(Number(value))}
                labelFormatter={(label) => format(parseISO(String(label)), 'MMM d, yyyy')}
              />
            }
          />
          {showComparison && <Legend />}
          <Line
            type="monotone"
            dataKey="current"
            stroke="var(--color-current)"
            strokeWidth={2}
            dot={false}
            name={chartConfig.current.label}
          />
          {showComparison && comparisonData && (
            <Line
              type="monotone"
              dataKey="comparison"
              stroke="var(--color-comparison)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name={chartConfig.comparison.label}
            />
          )}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
