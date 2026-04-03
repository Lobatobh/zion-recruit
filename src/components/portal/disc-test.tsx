"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertCircle,
} from "lucide-react";
import { DISC_QUESTIONS } from "@/lib/disc/questions";
import { calculateDISCProfile } from "@/lib/disc/calculator";

interface PortalDiscTestProps {
  token: string;
  testId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface DiscAnswer {
  questionNumber: number;
  mostOption: string;
  leastOption: string;
}

export function PortalDiscTest({ token, testId, onComplete, onCancel }: PortalDiscTestProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<DiscAnswer[]>([]);
  const [testStatus, setTestStatus] = useState<string>('PENDING');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeTest();
  }, [testId]);

  const initializeTest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/disc/${testId}`, {
        headers: {
          'x-portal-token': token,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setTestStatus(data.test.status);

        // Initialize answers array
        if (data.test.status === 'STARTED' && data.test.answers) {
          setAnswers(data.test.answers);
        } else {
          setAnswers(
            DISC_QUESTIONS.map((q) => ({
              questionNumber: q.number,
              mostOption: '',
              leastOption: '',
            }))
          );
        }
      } else {
        setError(data.error || 'Failed to load test');
      }
    } catch (err) {
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/disc/${testId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({ action: 'start' }),
      });

      if (response.ok) {
        setTestStatus('STARTED');
      }
    } catch (err) {
      console.error('Failed to start test:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (type: 'most' | 'least', value: string) => {
    const newAnswers = [...answers];
    const currentAnswer = newAnswers[currentQuestion];

    if (type === 'most') {
      // If selecting "most" and it's already selected as "least", clear "least"
      if (currentAnswer.leastOption === value) {
        currentAnswer.leastOption = '';
      }
      currentAnswer.mostOption = value;
    } else {
      // If selecting "least" and it's already selected as "most", clear "most"
      if (currentAnswer.mostOption === value) {
        currentAnswer.mostOption = '';
      }
      currentAnswer.leastOption = value;
    }

    setAnswers(newAnswers);
  };

  const canProceed = () => {
    const answer = answers[currentQuestion];
    return answer.mostOption && answer.leastOption && answer.mostOption !== answer.leastOption;
  };

  const handleNext = () => {
    if (currentQuestion < DISC_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Calculate profile
      const profile = calculateDISCProfile(
        answers.map((a) => ({
          questionNumber: a.questionNumber,
          mostOption: a.mostOption as 'D' | 'I' | 'S' | 'C',
          leastOption: a.leastOption as 'D' | 'I' | 'S' | 'C',
        }))
      );

      // Submit answers
      const response = await fetch(`/api/disc/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({
          answers: answers.map((a) => ({
            questionNumber: a.questionNumber,
            mostOption: a.mostOption,
            leastOption: a.leastOption,
          })),
          profile,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestStatus('COMPLETED');
        onComplete();
      } else {
        setError(data.error || 'Failed to submit test');
      }
    } catch (err) {
      setError('Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (testStatus === 'COMPLETED') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Assessment Completed!</h2>
          <p className="text-muted-foreground">
            Thank you for completing the DISC assessment. The recruitment team will review your results.
          </p>
          <Button onClick={onComplete} className="mt-4">
            Return to Portal
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (testStatus === 'PENDING') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>DISC Behavioral Assessment</CardTitle>
          <CardDescription>
            This assessment helps us understand your behavioral style and how you work best.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              The assessment takes approximately 10-15 minutes. Please complete it in one sitting.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-medium">Instructions:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• For each question, select the word that <strong>most</strong> describes you</li>
              <li>• Then select the word that <strong>least</strong> describes you</li>
              <li>• Go with your first instinct - there are no right or wrong answers</li>
              <li>• Be honest and consistent in your responses</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={startTest} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Test in progress
  const question = DISC_QUESTIONS[currentQuestion];
  const currentAnswer = answers[currentQuestion];
  const progress = ((currentQuestion + 1) / DISC_QUESTIONS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestion + 1} of {DISC_QUESTIONS.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Which word <span className="text-blue-600">MOST</span> and{' '}
            <span className="text-red-600">LEAST</span> describes you?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Options Grid */}
          <div className="grid gap-4">
            {question.options.map((option) => (
              <div
                key={option.letter}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  currentAnswer.mostOption === option.letter
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : currentAnswer.leastOption === option.letter
                    ? 'border-red-500 bg-red-50 dark:bg-red-950'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{option.letter}</span>
                    <span className="text-sm">{option.word}</span>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`most-${option.letter}`}
                        checked={currentAnswer.mostOption === option.letter}
                        onChange={() => handleAnswerChange('most', option.letter)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-blue-600 font-medium">Most</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`least-${option.letter}`}
                        checked={currentAnswer.leastOption === option.letter}
                        onChange={() => handleAnswerChange('least', option.letter)}
                        className="h-4 w-4 text-red-600"
                      />
                      <span className="text-sm text-red-600 font-medium">Least</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button onClick={handleNext} disabled={!canProceed() || submitting}>
              {currentQuestion === DISC_QUESTIONS.length - 1 ? (
                <>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Assessment
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
