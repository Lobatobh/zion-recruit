/**
 * Source Selector - Zion Recruit
 * 
 * Component for selecting sourcing channels
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Linkedin,
  Github,
  Briefcase,
  Database,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { SourcingSource, SourceConfig, getSourceColor } from '@/lib/sourcing/types';

interface SourceSelectorProps {
  selected: SourcingSource[];
  onChange: (sources: SourcingSource[]) => void;
}

// Source icons mapping
const sourceIcons: Record<SourcingSource, React.ReactNode> = {
  linkedin: <Linkedin className="h-5 w-5" />,
  indeed: <Briefcase className="h-5 w-5" />,
  github: <Github className="h-5 w-5" />,
  internal: <Database className="h-5 w-5" />,
};

// Source colors
const sourceColors: Record<SourcingSource, string> = {
  linkedin: 'border-blue-500 bg-blue-50',
  indeed: 'border-purple-500 bg-purple-50',
  github: 'border-gray-500 bg-gray-50',
  internal: 'border-green-500 bg-green-50',
};

export function SourceSelector({ selected, onChange }: SourceSelectorProps) {
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sourcing/sources');
      const data = await response.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (sourceId: SourcingSource, checked: boolean) => {
    if (checked) {
      onChange([...selected, sourceId]);
    } else {
      onChange(selected.filter(s => s !== sourceId));
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Sourcing Channels</label>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Sourcing Channels</label>
      <div className="grid grid-cols-2 gap-3">
        {sources.map((source) => {
          const isSelected = selected.includes(source.id);
          const isLimited = source.rateLimitStatus?.isLimited;

          return (
            <Card
              key={source.id}
              className={`cursor-pointer transition-all ${
                isSelected ? sourceColors[source.id] : 'border-border'
              } ${isLimited ? 'opacity-50' : ''}`}
              onClick={() => handleToggle(source.id, !isSelected)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggle(source.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {sourceIcons[source.id]}
                      <span className="font-medium text-sm">{source.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {source.description}
                    </p>
                    {source.rateLimitStatus && (
                      <div className="flex items-center gap-1 mt-2">
                        {isLimited ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Rate Limited
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {source.rateLimitStatus.requestsRemaining} requests left
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
