"use client";

/**
 * Public DISC Test Page - Zion Recruit
 * Allows candidates to complete DISC assessment without authentication
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DISCQuestion } from "@/lib/disc/questions";

// ============================================
// Types
// ============================================

interface DISCTestData {
  id: string;
  status: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    job: {
      id: string;
      title: string;
    };
  };
  answers: Array<{
    questionNumber: number;
    mostOption: string;
    leastOption: string;
  }>;
  questions: DISCQuestion[] | null;
}

// ============================================
// Component
// ============================================

export function PublicDISCTest() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testId = searchParams.get("testId");

  const [test, setTest] = useState<DISCTestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { most: string; least: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch test data
  useEffect(() => {
    if (!testId) {
      setError("ID do teste não fornecido");
      setIsLoading(false);
      return;
    }

    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await fetch(`/api/disc/${testId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar teste");
      }

      setTest(data.test);

      // Load existing answers
      if (data.test.answers && data.test.answers.length > 0) {
        const loadedAnswers: Record<number, { most: string; least: string }> = {};
        data.test.answers.forEach((a: { questionNumber: number; mostOption: string; leastOption: string }) => {
          loadedAnswers[a.questionNumber] = {
            most: a.mostOption,
            least: a.leastOption,
          };
        });
        setAnswers(loadedAnswers);
      }

      // Check if already completed
      if (data.test.status === "COMPLETED") {
        setIsCompleted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar teste");
    } finally {
      setIsLoading(false);
    }
  };

  const questions = test?.questions || [];
  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const currentQ = questions[currentQuestion];

  const handleAnswer = (type: "most" | "least", option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: {
        ...prev[currentQuestion],
        [type]: option,
      },
    }));
  };

  const canProceed = () => {
    const answer = answers[currentQuestion];
    return answer?.most && answer?.least && answer.most !== answer.least;
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1);
      autoSave();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const autoSave = useCallback(async () => {
    if (!testId || Object.keys(answers).length === 0) return;

    try {
      await fetch(`/api/disc/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "STARTED",
          answers: Object.entries(answers).map(([num, ans]) => ({
            questionNumber: parseInt(num),
            mostOption: ans.most,
            leastOption: ans.least,
          })),
        }),
      });
    } catch {
      // Silent fail for auto-save
    }
  }, [testId, answers]);

  const handleSubmit = async () => {
    if (!canProceed() || !testId) return;

    setIsSubmitting(true);

    try {
      // Save all answers
      await fetch(`/api/disc/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "STARTED",
          answers: Object.entries(answers).map(([num, ans]) => ({
            questionNumber: parseInt(num),
            mostOption: ans.most,
            leastOption: ans.least,
          })),
        }),
      });

      // Submit test
      const response = await fetch(`/api/disc/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar teste");
      }

      setIsCompleted(true);
      toast.success("Teste enviado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar teste");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando teste...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Ops! Algo deu errado</h2>
                <p className="text-muted-foreground mt-1">{error || "Teste não encontrado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed state
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="p-4 rounded-full bg-green-500/10"
                >
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </motion.div>

                <div>
                  <h2 className="text-2xl font-bold">Teste Concluído!</h2>
                  <p className="text-muted-foreground mt-2">
                    Obrigado por completar a avaliação DISC, {test.candidate.name}!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nossa equipe entrará em contato em breve com os próximos passos.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  Vaga: {test.candidate.job?.title || "Não especificada"}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold">Avaliação DISC</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    {test.candidate.name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Vaga</p>
                <p className="text-sm font-medium">{test.candidate.job?.title || "Não especificada"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Questão {currentQuestion + 1} de {totalQuestions}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% completo
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Selecione as opções que mais e menos descrevem você
                </CardTitle>
                <CardDescription>
                  Escolha uma opção para "Mais" (mais se parece com você) e outra para "Menos" (menos se parece com você)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentQ?.options.map((option) => {
                    const answer = answers[currentQuestion];
                    const isMostSelected = answer?.most === option.key;
                    const isLeastSelected = answer?.least === option.key;

                    return (
                      <div
                        key={option.key}
                        className="p-4 rounded-lg border transition-all"
                        style={{
                          borderColor: isMostSelected
                            ? "#22C55E"
                            : isLeastSelected
                            ? "#EF4444"
                            : undefined,
                          backgroundColor: isMostSelected
                            ? "rgba(34, 197, 94, 0.1)"
                            : isLeastSelected
                            ? "rgba(239, 68, 68, 0.1)"
                            : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.text}</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={isMostSelected ? "default" : "outline"}
                              className={
                                isMostSelected
                                  ? "bg-green-500 hover:bg-green-600"
                                  : ""
                              }
                              onClick={() => handleAnswer("most", option.key)}
                              disabled={answer?.least === option.key}
                            >
                              Mais
                            </Button>
                            <Button
                              size="sm"
                              variant={isLeastSelected ? "default" : "outline"}
                              className={
                                isLeastSelected
                                  ? "bg-red-500 hover:bg-red-600"
                                  : ""
                              }
                              onClick={() => handleAnswer("least", option.key)}
                              disabled={answer?.most === option.key}
                            >
                              Menos
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {answers[currentQuestion]?.most === answers[currentQuestion]?.least && (
                  <Alert className="mt-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você deve selecionar opções diferentes para "Mais" e "Menos"
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-1">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentQuestion
                    ? "bg-primary"
                    : answers[idx]?.most && answers[idx]?.least
                    ? "bg-green-500"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {currentQuestion < totalQuestions - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Próxima
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enviar Teste
                </>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Instruções:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Não há respostas certas ou erradas</li>
                  <li>• Responda com honestidade e rapidez</li>
                  <li>• Seu progresso é salvo automaticamente</li>
                  <li>• O teste leva aproximadamente 10-15 minutos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
