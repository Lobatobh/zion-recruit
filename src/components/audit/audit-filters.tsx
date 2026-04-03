"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Filters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}

interface AuditFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const ACTIONS = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'IMPORT', label: 'Import' },
  { value: 'PERMISSION_CHANGE', label: 'Permission Change' },
  { value: 'SETTINGS_CHANGE', label: 'Settings Change' },
  { value: 'API_KEY_CREATED', label: 'API Key Created' },
  { value: 'API_KEY_REVOKED', label: 'API Key Revoked' },
  { value: 'AGENT_RUN', label: 'Agent Run' },
  { value: 'CANDIDATE_STAGE_CHANGE', label: 'Stage Change' },
  { value: 'JOB_PUBLISHED', label: 'Job Published' },
  { value: 'JOB_CLOSED', label: 'Job Closed' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
  { value: 'INTERVIEW_CANCELLED', label: 'Interview Cancelled' },
  { value: 'DISC_TEST_SENT', label: 'DISC Test Sent' },
  { value: 'MESSAGE_SENT', label: 'Message Sent' },
];

const ENTITY_TYPES = [
  { value: 'Candidate', label: 'Candidate' },
  { value: 'Job', label: 'Job' },
  { value: 'User', label: 'User' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'ApiCredential', label: 'API Credential' },
  { value: 'AIAgent', label: 'AI Agent' },
  { value: 'AITask', label: 'AI Task' },
  { value: 'Interview', label: 'Interview' },
  { value: 'DISCTest', label: 'DISC Test' },
  { value: 'Message', label: 'Message' },
  { value: 'Conversation', label: 'Conversation' },
  { value: 'PipelineStage', label: 'Pipeline Stage' },
  { value: 'Notification', label: 'Notification' },
  { value: 'Subscription', label: 'Subscription' },
];

export function AuditFilters({ filters, onFilterChange }: AuditFiltersProps) {
  const [localUserId, setLocalUserId] = useState(filters.userId || '');

  const handleActionChange = (action: string) => {
    onFilterChange({
      ...filters,
      action: action === 'all' ? undefined : action,
    });
  };

  const handleEntityTypeChange = (entityType: string) => {
    onFilterChange({
      ...filters,
      entityType: entityType === 'all' ? undefined : entityType,
    });
  };

  const handleUserIdChange = () => {
    onFilterChange({
      ...filters,
      userId: localUserId || undefined,
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onFilterChange({
      ...filters,
      startDate: date,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onFilterChange({
      ...filters,
      endDate: date,
    });
  };

  const clearFilters = () => {
    setLocalUserId('');
    onFilterChange({});
  };

  const hasActiveFilters = 
    filters.action || 
    filters.entityType || 
    filters.userId || 
    filters.startDate || 
    filters.endDate;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Action Filter */}
      <div className="w-[180px]">
        <Select
          value={filters.action || 'all'}
          onValueChange={handleActionChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entity Type Filter */}
      <div className="w-[180px]">
        <Select
          value={filters.entityType || 'all'}
          onValueChange={handleEntityTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITY_TYPES.map((entity) => (
              <SelectItem key={entity.value} value={entity.value}>
                {entity.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User ID Filter */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="User ID"
          value={localUserId}
          onChange={(e) => setLocalUserId(e.target.value)}
          className="w-[200px]"
        />
        <Button variant="secondary" size="sm" onClick={handleUserIdChange}>
          Apply
        </Button>
      </div>

      {/* Start Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[180px] justify-start text-left font-normal",
              !filters.startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.startDate ? format(filters.startDate, "PP") : "Start Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.startDate}
            onSelect={handleStartDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* End Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[180px] justify-start text-left font-normal",
              !filters.endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.endDate ? format(filters.endDate, "PP") : "End Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.endDate}
            onSelect={handleEndDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
