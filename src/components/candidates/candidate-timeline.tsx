"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CandidateActivity,
  activityTypeConfig,
  formatRelativeTime,
  ActivityType,
} from "@/types/candidate";
import {
  FileText,
  ArrowRight,
  Star,
  MessageSquare,
  Mail,
  RefreshCw,
  Sparkles,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

interface CandidateTimelineProps {
  activities: CandidateActivity[];
  maxItems?: number;
  compact?: boolean;
}

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  FileText,
  ArrowRight,
  Star,
  MessageSquare,
  Mail,
  RefreshCw,
  Sparkles,
};

function TimelineItem({
  activity,
  index,
}: {
  activity: CandidateActivity;
  index: number;
}) {
  const config = activityTypeConfig[activity.type as ActivityType];
  const Icon = iconMap[config?.icon || "FileText"] || FileText;
  const color = config?.color || "text-gray-500";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {/* Timeline line */}
      <div className="absolute left-[15px] top-8 w-px h-full bg-border last:hidden" />

      {/* Icon */}
      <div
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted ${color}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{config?.label || activity.type}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activity.description}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(activity.createdAt)}
          </span>
        </div>

        {/* Author */}
        {activity.member?.user && (
          <p className="text-xs text-muted-foreground mt-1">
            por {activity.member.user.name || activity.member.user.email}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function TimelineItemCompact({
  activity,
  index,
}: {
  activity: CandidateActivity;
  index: number;
}) {
  const config = activityTypeConfig[activity.type as ActivityType];
  const Icon = iconMap[config?.icon || "FileText"] || FileText;
  const color = config?.color || "text-gray-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={`flex-shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{activity.description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(activity.createdAt)}
      </span>
    </motion.div>
  );
}

export function CandidateTimeline({
  activities,
  maxItems,
  compact = false,
}: CandidateTimelineProps) {
  const displayedActivities = useMemo(() => {
    if (maxItems) {
      return activities.slice(0, maxItems);
    }
    return activities;
  }, [activities, maxItems]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma atividade ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {displayedActivities.map((activity, index) => (
              <TimelineItemCompact
                key={activity.id}
                activity={activity}
                index={index}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
          {maxItems && activities.length > maxItems && (
            <span className="text-xs text-muted-foreground font-normal">
              ({maxItems} de {activities.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-1">
            {displayedActivities.map((activity, index) => (
              <TimelineItem
                key={activity.id}
                activity={activity}
                index={index}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
