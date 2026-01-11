import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Image as ImageIcon, Send, Calendar, List,
  ChevronLeft, ChevronRight, Layers, BarChart3, Sparkles, ListOrdered
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useScheduledPosts } from '@/services/ghlApi';
import { SocialAnalytics } from '@/components/social/SocialAnalytics';
import { CreateWizard } from '@/components/social/create-wizard';
import { BatchWizard } from '@/components/social/batch-wizard';
import { QuickPostForm } from '@/components/social/quick-post';
import { QuickBatchForm } from '@/components/social/quick-batch';
import { PipelineView } from '@/components/social/queue';
import { cn } from '@/lib/utils';
import type { ScheduleViewMode, PipelinePost } from '@/lib/queue/types';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, isToday
} from 'date-fns';

type MainTab = 'create' | 'batch' | 'schedule' | 'analytics';

export default function SocialMedia() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial tab based on URL hash
  const getInitialTab = (): MainTab => {
    const hash = location.hash.replace('#', '');
    if (hash === 'batch' || hash === 'schedule' || hash === 'analytics') return hash;
    return 'create';
  };

  const [mainTab, setMainTab] = useState<MainTab>(getInitialTab());
  const [createMode, setCreateMode] = useState<'quick' | 'wizard'>('quick');
  const [batchMode, setBatchMode] = useState<'quick' | 'wizard'>('quick');

  // Schedule/Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('pipeline');

  // GHL API hooks for scheduled posts
  const { data: scheduledPostsData } = useScheduledPosts();

  // Update URL when tab changes
  useEffect(() => {
    const newHash = mainTab === 'create' ? '' : `#${mainTab}`;
    if (location.hash !== newHash) {
      navigate(`/social${newHash}`, { replace: true });
    }
  }, [mainTab, location.hash, navigate]);

  // ============ SCHEDULE TAB ============
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get scheduled posts from GHL (for calendar view)
  const scheduledPosts = useMemo(() => {
    const ghlPosts = scheduledPostsData?.posts || [];
    return ghlPosts.map(post => ({
      id: post.id,
      scheduledDate: post.scheduleDate || post.createdAt,
      caption: post.summary,
      image: post.media?.[0]?.url || '/placeholder.svg',
      platforms: post.accountIds,
      status: post.status,
      property: null,
      propertyId: null,
    }));
  }, [scheduledPostsData]);

  // Transform to PipelinePost format for PipelineView
  const pipelinePosts: PipelinePost[] = useMemo(() => {
    const ghlPosts = scheduledPostsData?.posts || [];
    return ghlPosts.map(post => ({
      id: post.id,
      content: post.summary || '',
      imageUrl: post.media?.[0]?.url,
      platforms: post.accountIds || [],
      scheduledAt: new Date(post.scheduleDate || post.createdAt),
      status: post.status === 'scheduled' ? 'scheduled' : post.status === 'published' ? 'published' : 'failed',
      accountIds: post.accountIds || [],
    }));
  }, [scheduledPostsData]);

  const getPostsForDay = (day: Date) => {
    return scheduledPosts.filter(post => isSameDay(new Date(post.scheduledDate), day));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleTodayClick = () => setCurrentDate(new Date());

  const handleEditPost = (postId: string) => {
    console.log('Edit post:', postId);
    // TODO: Implement edit functionality
  };

  const handleDeletePost = (postId: string) => {
    console.log('Delete post:', postId);
    // TODO: Implement delete functionality
  };

  const handleCreatePost = () => {
    setMainTab('create');
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Social Hub</h1>
          <p className="text-muted-foreground mt-1">
            Create posts, batch operations & schedule
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="create" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Batch</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* CREATE TAB - Quick Form or Wizard */}
        <TabsContent value="create" className="mt-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={createMode === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreateMode('quick')}
                className={cn(
                  "gap-2",
                  createMode === 'quick' && "bg-purple-600 hover:bg-purple-700"
                )}
              >
                <Sparkles className="h-4 w-4" />
                Quick Post
              </Button>
              <Button
                variant={createMode === 'wizard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreateMode('wizard')}
                className={cn(
                  "gap-2",
                  createMode === 'wizard' && "bg-purple-600 hover:bg-purple-700"
                )}
              >
                <ListOrdered className="h-4 w-4" />
                Step-by-Step
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {createMode === 'quick'
                ? 'Fill in the blanks to create a post quickly'
                : 'Use the guided wizard for more control'}
            </p>
          </div>

          {/* Content based on mode */}
          {createMode === 'quick' ? <QuickPostForm /> : <CreateWizard />}
        </TabsContent>

        {/* BATCH TAB - Quick Form or Step-by-Step Wizard */}
        <TabsContent value="batch" className="mt-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={batchMode === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBatchMode('quick')}
                className={cn(
                  "gap-2",
                  batchMode === 'quick' && "bg-purple-600 hover:bg-purple-700"
                )}
              >
                <Sparkles className="h-4 w-4" />
                Quick Batch
              </Button>
              <Button
                variant={batchMode === 'wizard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBatchMode('wizard')}
                className={cn(
                  "gap-2",
                  batchMode === 'wizard' && "bg-purple-600 hover:bg-purple-700"
                )}
              >
                <ListOrdered className="h-4 w-4" />
                Step-by-Step
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {batchMode === 'quick'
                ? 'Create batch posts with sentence-style form'
                : 'Use the guided wizard for granular control'}
            </p>
          </div>

          {/* Content based on mode */}
          {batchMode === 'quick' ? <QuickBatchForm /> : <BatchWizard />}
        </TabsContent>

        {/* SCHEDULE TAB - Pipeline or Calendar View */}
        <TabsContent value="schedule" className="mt-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <Tabs value={scheduleViewMode} onValueChange={(v) => setScheduleViewMode(v as ScheduleViewMode)}>
              <TabsList>
                <TabsTrigger value="pipeline" className="gap-2">
                  <List className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Pipeline View */}
          {scheduleViewMode === 'pipeline' && (
            <Card>
              <CardContent className="pt-6">
                <PipelineView
                  posts={pipelinePosts}
                  onEditPost={handleEditPost}
                  onDeletePost={handleDeletePost}
                  onCreatePost={handleCreatePost}
                />
              </CardContent>
            </Card>
          )}

          {/* Calendar View */}
          {scheduleViewMode === 'calendar' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scheduledPosts.filter(p => p.status === 'scheduled').length} scheduled posts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleTodayClick}>Today</Button>
                  <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dayPosts = getPostsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedScheduleDate && isSameDay(day, selectedScheduleDate);
                    const hasPosts = dayPosts.length > 0;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedScheduleDate(day)}
                        className={cn(
                          "min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer",
                          isCurrentMonth ? "bg-background" : "bg-muted/20",
                          isToday(day) && "ring-2 ring-primary ring-offset-2",
                          isSelected && "bg-purple-50 dark:bg-purple-950/30 border-purple-500",
                          !isSelected && !isToday(day) && "border-border hover:border-purple-300",
                          hasPosts && !isSelected && "bg-purple-50/50 dark:bg-purple-950/10"
                        )}
                      >
                        {/* Day Number */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-sm font-medium",
                            !isCurrentMonth && "text-muted-foreground",
                            isToday(day) && "text-primary font-bold"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {hasPosts && (
                            <Badge
                              variant={isSelected ? "default" : "secondary"}
                              className="text-[10px] h-5 px-1.5"
                            >
                              {dayPosts.length}
                            </Badge>
                          )}
                        </div>

                        {/* Post Previews */}
                        {hasPosts && (
                          <div className="space-y-1 mt-1">
                            {dayPosts.slice(0, 2).map((post, i) => (
                              <div
                                key={post.id || i}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground truncate"
                              >
                                <span className="truncate">
                                  {format(new Date(post.scheduledDate), 'h:mm a')}
                                </span>
                              </div>
                            ))}
                            {dayPosts.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{dayPosts.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Day Details */}
                {selectedScheduleDate && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(selectedScheduleDate, 'EEEE, MMMM d, yyyy')}
                    </h3>

                    {getPostsForDay(selectedScheduleDate).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No posts scheduled for this day
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {getPostsForDay(selectedScheduleDate).map((post) => (
                          <div
                            key={post.id}
                            className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            {/* Post Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {post.image ? (
                                <img src={post.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Post Details */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {post.property?.address || 'Social Post'}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {post.caption?.substring(0, 60)}...
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                {post.platforms?.map((platform) => (
                                  <Badge key={platform} variant="outline" className="text-[10px] h-5">
                                    {platform}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Time */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium">
                                {format(new Date(post.scheduledDate), 'h:mm a')}
                              </p>
                              <Badge
                                variant={post.status === 'scheduled' ? 'secondary' : 'default'}
                                className="text-[10px] mt-1"
                              >
                                {post.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="mt-6">
          <SocialAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
