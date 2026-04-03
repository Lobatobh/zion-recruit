"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
} from 'lucide-react';

interface AuditStatsData {
  totalLogs: number;
  byAction: { action: string; count: number }[];
  byEntityType: { entityType: string; count: number }[];
  byUser: { userId: string | null; userName: string | null; count: number }[];
  recentActivity: { date: string; count: number }[];
}

interface AuditStatsProps {
  stats: AuditStatsData;
  loading?: boolean;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  LOGIN: 'bg-emerald-500',
  LOGOUT: 'bg-gray-500',
  LOGIN_FAILED: 'bg-orange-500',
  EXPORT: 'bg-purple-500',
  IMPORT: 'bg-indigo-500',
  PERMISSION_CHANGE: 'bg-amber-500',
  SETTINGS_CHANGE: 'bg-cyan-500',
  API_KEY_CREATED: 'bg-teal-500',
  API_KEY_REVOKED: 'bg-rose-500',
  AGENT_RUN: 'bg-violet-500',
  CANDIDATE_STAGE_CHANGE: 'bg-sky-500',
  JOB_PUBLISHED: 'bg-lime-500',
  JOB_CLOSED: 'bg-stone-500',
  INTERVIEW_SCHEDULED: 'bg-pink-500',
  INTERVIEW_CANCELLED: 'bg-red-500',
  DISC_TEST_SENT: 'bg-fuchsia-500',
  MESSAGE_SENT: 'bg-blue-500',
};

const formatAction = (action: string) => {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function AuditStats({ stats, loading }: AuditStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const maxActionCount = Math.max(...stats.byAction.map(a => a.count), 1);
  const maxEntityCount = Math.max(...stats.byEntityType.map(e => e.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            All time audit events
          </p>
        </CardContent>
      </Card>

      {/* Top Action */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Action</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.byAction[0] ? (
            <>
              <div className="text-2xl font-bold">
                {formatAction(stats.byAction[0].action)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.byAction[0].count.toLocaleString()} occurrences
              </p>
            </>
          ) : (
            <div className="text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>

      {/* Most Active User */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Active User</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.byUser[0] ? (
            <>
              <div className="text-2xl font-bold truncate">
                {stats.byUser[0].userName || 'System'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.byUser[0].count.toLocaleString()} actions
              </p>
            </>
          ) : (
            <div className="text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.recentActivity.reduce((sum, a) => sum + a.count, 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Events in the past week
          </p>
        </CardContent>
      </Card>

      {/* Actions Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actions Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byAction.slice(0, 5).map((item) => (
              <div key={item.action} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{formatAction(item.action)}</span>
                  <span className="text-muted-foreground">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={(item.count / maxActionCount) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entity Types Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byEntityType.slice(0, 5).map((item) => (
              <div key={item.entityType} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.entityType}</span>
                  <span className="text-muted-foreground">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={(item.count / maxEntityCount) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
