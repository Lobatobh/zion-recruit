"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { DISCQuestion } from "@/lib/disc/questions";
import { cn } from "@/lib/utils";

interface DiscQuestionCardProps {
  question: DISCQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedMost: string | null;
  selectedLeast: string | null;
  onMostSelect: (optionId: string) => void;
  onLeastSelect: (optionId: string) => void;
}

export function DiscQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedMost,
  selectedLeast,
  onMostSelect,
  onLeastSelect,
}: DiscQuestionCardProps) {
  const isComplete = selectedMost !== null && selectedLeast !== null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          {isComplete && (
            <Badge variant="default" className="bg-green-500">
              Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm mb-4">
          For each row, select the option that is <strong>most</strong> like you and the option that is <strong>least</strong> like you.
        </p>
        
        <div className="space-y-2">
          {/* Header Row */}
          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-2 px-3 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
            <div>Statement</div>
            <div className="w-20 text-center">Most</div>
            <div className="w-20 text-center">Least</div>
          </div>
          
          {/* Options */}
          {question.options.map((option) => {
            const isMost = selectedMost === option.id;
            const isLeast = selectedLeast === option.id;
            const isDisabled = isMost || isLeast;
            
            return (
              <div
                key={option.id}
                className={cn(
                  "grid grid-cols-[1fr,auto,auto] gap-2 items-center py-3 px-3 rounded-lg transition-colors",
                  isMost && "bg-green-500/10 border border-green-500/30",
                  isLeast && "bg-red-500/10 border border-red-500/30",
                  !isDisabled && "hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="text-sm">{option.text}</div>
                
                {/* Most Button */}
                <Button
                  variant={isMost ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-20",
                    isMost && "bg-green-500 hover:bg-green-600",
                    isLeast && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => onMostSelect(option.id)}
                  disabled={isLeast}
                >
                  {isMost ? <Check className="h-4 w-4" /> : "Most"}
                </Button>
                
                {/* Least Button */}
                <Button
                  variant={isLeast ? "destructive" : "outline"}
                  size="sm"
                  className={cn(
                    "w-20",
                    isMost && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => onLeastSelect(option.id)}
                  disabled={isMost}
                >
                  {isLeast ? <X className="h-4 w-4" /> : "Least"}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
