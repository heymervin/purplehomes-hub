import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface ScheduledPost {
  id: string;
  date: string;
  [key: string]: any;
}

interface ScheduleQuickStatsProps {
  posts: ScheduledPost[];
}

export function ScheduleQuickStats({ posts }: ScheduleQuickStatsProps) {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Calculate stats
  const thisWeekCount = posts.filter(post => {
    const postDate = new Date(post.date);
    return postDate >= now && postDate <= oneWeekFromNow;
  }).length;

  const next7DaysCount = thisWeekCount; // Same as this week
  const totalScheduled = posts.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{thisWeekCount}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{next7DaysCount}</p>
              <p className="text-xs text-muted-foreground">Next 7 Days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalScheduled}</p>
              <p className="text-xs text-muted-foreground">Total Scheduled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
