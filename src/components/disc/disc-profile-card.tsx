"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DISCFactor } from "@/lib/disc/questions";
import { getProfileDescription, getFactorColors } from "@/lib/disc/profiles";

interface DiscProfileCardProps {
  primaryProfile: DISCFactor;
  secondaryProfile: DISCFactor | null;
  profileCombo: string;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
}

export function DiscProfileCard({
  primaryProfile,
  secondaryProfile,
  profileCombo,
  scores,
}: DiscProfileCardProps) {
  const primaryDesc = getProfileDescription(primaryProfile);
  const colors = getFactorColors();
  
  const factors: DISCFactor[] = ['D', 'I', 'S', 'C'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>DISC Profile</CardTitle>
          <Badge 
            style={{ backgroundColor: primaryDesc.color }}
            className="text-white"
          >
            {profileCombo}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Summary */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" style={{ color: primaryDesc.color }}>
            {primaryDesc.name} - {primaryDesc.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {primaryDesc.description.slice(0, 200)}...
          </p>
        </div>

        {/* Score Bars */}
        <div className="space-y-4">
          {factors.map((factor) => {
            const desc = getProfileDescription(factor);
            const score = scores[factor];
            const isPrimary = factor === primaryProfile;
            const isSecondary = factor === secondaryProfile;
            
            return (
              <div key={factor} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-medium"
                      style={{ color: colors[factor] }}
                    >
                      {factor} - {desc.name}
                    </span>
                    {isPrimary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                    {isSecondary && (
                      <Badge variant="secondary" className="text-xs">Secondary</Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium">{score}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${score}%`,
                      backgroundColor: colors[factor],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Primary Style</p>
            <p className="font-medium">{primaryDesc.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Communication</p>
            <p className="font-medium text-sm">{primaryDesc.communicationStyle.slice(0, 50)}...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
