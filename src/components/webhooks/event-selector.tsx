'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  WebhookEventType,
  EventTypeInfo,
  EventCategory,
  getEventsGroupedByCategory,
  WebhookEventTypeValue,
} from '@/lib/webhooks';

interface EventSelectorProps {
  value: WebhookEventTypeValue[];
  onChange: (events: WebhookEventTypeValue[]) => void;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  [EventCategory.CANDIDATE]: 'Candidate',
  [EventCategory.JOB]: 'Job',
  [EventCategory.INTERVIEW]: 'Interview',
  [EventCategory.DISC]: 'DISC',
  [EventCategory.MESSAGE]: 'Message',
  [EventCategory.TASK]: 'Task',
};

export function EventSelector({ value, onChange, className }: EventSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const eventsByCategory = getEventsGroupedByCategory();
  
  const handleSelect = (eventType: WebhookEventTypeValue) => {
    if (value.includes(eventType)) {
      onChange(value.filter((e) => e !== eventType));
    } else {
      onChange([...value, eventType]);
    }
  };
  
  const handleSelectCategory = (category: string) => {
    const categoryEvents = eventsByCategory[category] || [];
    const allSelected = categoryEvents.every((e) => value.includes(e));
    
    if (allSelected) {
      // Deselect all in category
      onChange(value.filter((e) => !categoryEvents.includes(e)));
    } else {
      // Select all in category
      const newEvents = new Set([...value, ...categoryEvents]);
      onChange(Array.from(newEvents));
    }
  };
  
  const handleSelectAll = () => {
    const allEvents = Object.values(WebhookEventType) as WebhookEventTypeValue[];
    if (value.length === allEvents.length) {
      onChange([]);
    } else {
      onChange(allEvents);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <span className="truncate">
            {value.length === 0
              ? 'Select events...'
              : value.length === 1
              ? EventTypeInfo[value[0]]?.label
              : `${value.length} events selected`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search events..." />
          <CommandList>
            <CommandEmpty>No events found.</CommandEmpty>
            
            {/* Select All */}
            <div className="border-b px-2 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleSelectAll}
              >
                <Checkbox
                  checked={
                    value.length === Object.keys(WebhookEventType).length
                  }
                  className="mr-2"
                />
                Select All Events
              </Button>
            </div>
            
            {/* Events by category */}
            {Object.entries(eventsByCategory).map(([category, events]) => {
              const categoryEvents = events as WebhookEventTypeValue[];
              const allSelected = categoryEvents.every((e) => value.includes(e));
              const someSelected = categoryEvents.some((e) => value.includes(e));
              
              return (
                <CommandGroup key={category} heading={categoryLabels[category] || category}>
                  {/* Category header - select all in category */}
                  <CommandItem
                    onSelect={() => handleSelectCategory(category)}
                    className="font-medium"
                  >
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected && !allSelected;
                        }
                      }}
                      className="mr-2"
                    />
                    All {categoryLabels[category]} Events
                  </CommandItem>
                  
                  {/* Individual events */}
                  {categoryEvents.map((eventType) => {
                    const info = EventTypeInfo[eventType];
                    const isSelected = value.includes(eventType);
                    
                    return (
                      <CommandItem
                        key={eventType}
                        onSelect={() => handleSelect(eventType)}
                        className="pl-8"
                      >
                        <Checkbox checked={isSelected} className="mr-2" />
                        <div className="flex-1">
                          <div className="font-medium">{info.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {info.description}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Display selected events as badges
interface EventBadgesProps {
  events: WebhookEventTypeValue[];
  onRemove?: (event: WebhookEventTypeValue) => void;
  maxDisplay?: number;
  className?: string;
}

export function EventBadges({ events, onRemove, maxDisplay = 5, className }: EventBadgesProps) {
  const displayEvents = events.slice(0, maxDisplay);
  const remaining = events.length - maxDisplay;
  
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayEvents.map((event) => {
        const info = EventTypeInfo[event];
        return (
          <Badge
            key={event}
            variant="secondary"
            className="text-xs"
          >
            {info?.label || event}
            {onRemove && (
              <button
                onClick={() => onRemove(event)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            )}
          </Badge>
        );
      })}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
