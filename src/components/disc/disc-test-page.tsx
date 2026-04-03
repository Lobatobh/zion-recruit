"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Shield,
  Zap,
  Users,
  Eye,
  ChevronDown,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DiscQuestionCard } from "./disc-question-card";
import { DiscResults } from "./disc-results";
import { DISC_QUESTIONS, TOTAL_QUESTIONS } from "@/lib/disc/questions";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface Answer {
  questionNumber: number;
  mostOption: string;
  leastOption: string;
}

interface TestState {
  id: string;
  status: string;
  candidate?: {
    name: string;
    job: {
      title: string;
    };
  };
  profileD?: number;
  profileI?: number;
  profileS?: number;
  profileC?: number;
  primaryProfile?: string;
  secondaryProfile?: string | null;
  profileCombo?: string;
  aiAnalysis?: string | null;
  aiStrengths?: string | null;
  aiWeaknesses?: string | null;
  aiWorkStyle?: string | null;
  jobFitScore?: number | null;
  jobFitDetails?: string | null;
}

interface DiscTestPageProps {
  testId: string;
  initialTest?: TestState;
}

// ============================================
// Animation Variants
// ============================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

// ============================================
// Sub-components
// ============================================

function InfoCard({
  icon: Icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={staggerItem}
      custom={delay}
      className="relative group"
    >
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md mb-3 group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            {value}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </CardContent>
        {/* Decorative gradient corner */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-100 to-transparent rounded-bl-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Card>
    </motion.div>
  );
}

function TimerDisplay({ startTime, isCompleted }: { startTime: Date | null; isCompleted: boolean }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!startTime || isCompleted) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(
        `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg">
      <Clock className="h-3.5 w-3.5" />
      <span className="tabular-nums tracking-wide">{elapsed}</span>
    </div>
  );
}

function QuestionNavigatorDot({
  index,
  isComplete,
  isCurrent,
  onClick,
}: {
  index: number;
  isComplete: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 shrink-0",
        isCurrent && "ring-2 ring-violet-500 ring-offset-2 scale-110",
        isComplete && !isCurrent && "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm",
        !isComplete && !isCurrent && "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      {isComplete && !isCurrent ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <span>{index + 1}</span>
      )}
      {isCurrent && (
        <motion.div
          className="absolute inset-0 rounded-full bg-violet-500/20"
          layoutId="currentQuestionDot"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        />
      )}
    </motion.button>
  );
}

// ============================================
// Main Component
// ============================================

export function DiscTestPage({ testId, initialTest }: DiscTestPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [test, setTest] = useState<TestState | null>(initialTest || null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialTest);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isStartingTest, setIsStartingTest] = useState(false);

  // Load test data if not provided
  useEffect(() => {
    if (!initialTest && testId) {
      fetchTest();
    }
  }, [testId, initialTest]);

  // Start timer when test begins
  useEffect(() => {
    if (test?.status === "STARTED" && !startTime) {
      setStartTime(new Date());
    }
    if (test?.status === "COMPLETED") {
      setIsCompleted(true);
    }
  }, [test?.status, startTime]);

  const fetchTest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/disc/${testId}`);
      if (!response.ok) throw new Error("Falha ao carregar o teste");

      const data = await response.json();
      setTest(data.test);

      // Load existing answers if any
      if (data.test.answers && data.test.answers.length > 0) {
        setAnswers(data.test.answers);
      }

      if (data.test.status === "COMPLETED") {
        setIsCompleted(true);
      }

      // If STARTED, restore timer
      if (data.test.status === "STARTED") {
        setStartTime(new Date());
      }
    } catch (err) {
      setError("Falha ao carregar o teste. Tente novamente.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startTest = async () => {
    setIsStartingTest(true);
    try {
      const response = await fetch(`/api/disc/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "STARTED" }),
      });

      if (!response.ok) throw new Error("Falha ao iniciar o teste");

      const data = await response.json();
      setTest(data.test);
      setStartTime(new Date());
    } catch (err) {
      setError("Falha ao iniciar o teste. Tente novamente.");
      console.error(err);
    } finally {
      setIsStartingTest(false);
    }
  };

  const handleMostSelect = useCallback(
    (optionId: string) => {
      const questionNum = currentQuestion + 1;
      setAnswers((prev) => {
        const existing = prev.find((a) => a.questionNumber === questionNum);
        if (existing) {
          return prev.map((a) =>
            a.questionNumber === questionNum
              ? { ...a, mostOption: optionId }
              : a
          );
        }
        return [
          ...prev,
          { questionNumber: questionNum, mostOption: optionId, leastOption: "" },
        ];
      });
    },
    [currentQuestion]
  );

  const handleLeastSelect = useCallback(
    (optionId: string) => {
      const questionNum = currentQuestion + 1;
      setAnswers((prev) => {
        const existing = prev.find((a) => a.questionNumber === questionNum);
        if (existing) {
          return prev.map((a) =>
            a.questionNumber === questionNum
              ? { ...a, leastOption: optionId }
              : a
          );
        }
        return [
          ...prev,
          { questionNumber: questionNum, mostOption: "", leastOption: optionId },
        ];
      });
    },
    [currentQuestion]
  );

  // Auto-save on answer change (debounced)
  useEffect(() => {
    if (test?.status !== "STARTED") return;

    const timeout = setTimeout(() => {
      const currentAnswer = answers.find(
        (a) => a.questionNumber === currentQuestion + 1
      );
      if (currentAnswer && (currentAnswer.mostOption || currentAnswer.leastOption)) {
        saveAnswer(currentAnswer);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [answers, currentQuestion, test?.status]);

  const saveAnswer = async (answer: Answer) => {
    try {
      await fetch(`/api/disc/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: [answer],
        }),
      });
    } catch (err) {
      console.error("Falha ao salvar resposta:", err);
    }
  };

  const saveAllAnswers = useCallback(async () => {
    try {
      await fetch(`/api/disc/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
    } catch (err) {
      console.error("Falha ao salvar respostas:", err);
    }
  }, [testId, answers]);

  const goNext = () => {
    if (currentQuestion < TOTAL_QUESTIONS - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all answers
    const allAnswered =
      answers.length === TOTAL_QUESTIONS &&
      answers.every((a) => a.mostOption && a.leastOption);

    if (!allAnswered) {
      setError("Responda todas as questões antes de enviar.");
      // Navigate to first unanswered question
      for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        const ans = answers.find((a) => a.questionNumber === i + 1);
        if (!ans?.mostOption || !ans?.leastOption) {
          setCurrentQuestion(i);
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Save all answers first
      await saveAllAnswers();

      const response = await fetch(`/api/disc/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Falha ao enviar o teste");
      }

      const data = await response.json();
      setTest(data.test);
      setIsCompleted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao enviar o teste"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const answeredCount = answers.filter(
    (a) => a.mostOption && a.leastOption
  ).length;
  const progress = (answeredCount / TOTAL_QUESTIONS) * 100;
  const currentAnswer = answers.find(
    (a) => a.questionNumber === currentQuestion + 1
  );
  const isCurrentComplete =
    currentAnswer?.mostOption && currentAnswer?.leastOption;
  const isLastQuestion = currentQuestion === TOTAL_QUESTIONS - 1;
  const unansweredCount = TOTAL_QUESTIONS - answeredCount;

  // ============================================
  // Loading State
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 mx-auto rounded" />
                <Skeleton className="h-4 w-64 mx-auto rounded" />
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando avaliação...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // Error State (fatal)
  // ============================================
  if (error && !test) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-400 via-rose-500 to-pink-600" />
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Ops! Algo deu errado</h2>
                <p className="text-muted-foreground mt-1">{error}</p>
              </div>
              <Button onClick={fetchTest} variant="outline" className="mt-2">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // STATE 3: Completed
  // ============================================
  if (isCompleted && test) {
    return (
      <DiscResults
        testId={testId}
        scores={{
          D: test.profileD || 0,
          I: test.profileI || 0,
          S: test.profileS || 0,
          C: test.profileC || 0,
        }}
        primaryProfile={test.primaryProfile as "D" | "I" | "S" | "C"}
        secondaryProfile={
          test.secondaryProfile as "D" | "I" | "S" | "C" | null
        }
        profileCombo={test.profileCombo || test.primaryProfile || "D"}
        aiAnalysis={test.aiAnalysis}
        aiStrengths={test.aiStrengths}
        aiWeaknesses={test.aiWeaknesses}
        aiWorkStyle={test.aiWorkStyle}
        jobFitScore={test.jobFitScore}
        jobFitDetails={test.jobFitDetails}
        candidateName={test.candidate?.name}
        jobTitle={test.candidate?.job?.title}
      />
    );
  }

  // ============================================
  // STATE 1: Intro Screen (PENDING or SENT)
  // ============================================
  if (test?.status === "PENDING" || test?.status === "SENT") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-200/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-100/20 blur-3xl" />
        </div>

        <motion.div
          className="w-full max-w-2xl relative z-10"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Header Card */}
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-2xl overflow-hidden">
              {/* Gradient top */}
              <div className="relative h-40 sm:h-48 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-4 right-8 w-24 h-24 rounded-full bg-white/10 blur-sm" />
                <div className="absolute bottom-2 left-12 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-fuchsia-400/20" />

                {/* Content overlay */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg mb-4"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                  >
                    <Brain className="h-8 w-8 text-white" />
                  </motion.div>
                  <motion.h1
                    className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Avaliação Comportamental DISC
                  </motion.h1>
                  <motion.div
                    className="flex items-center gap-2 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Powered by IA
                    </Badge>
                    <span className="text-white/70 text-sm">Zion Recruit</span>
                  </motion.div>
                </div>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-8">
                {/* Candidate greeting */}
                {test.candidate?.name && (
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-muted-foreground">
                      Olá, <span className="font-semibold text-foreground">{test.candidate.name}</span>
                    </p>
                    {test.candidate.job?.title && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Vaga: <span className="font-medium">{test.candidate.job.title}</span>
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Info Cards */}
                <motion.div
                  className="grid grid-cols-3 gap-3 sm:gap-4"
                  variants={staggerContainer}
                >
                  <InfoCard
                    icon={Zap}
                    label="Questões"
                    value="30"
                  />
                  <InfoCard
                    icon={Clock}
                    label="Duração"
                    value="~15 min"
                  />
                  <InfoCard
                    icon={Shield}
                    label="Confidencial"
                    value="Seguro"
                  />
                </motion.div>

                {/* Instructions */}
                <motion.div variants={staggerItem} className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Como funciona
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center mt-0.5">
                        <Eye className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Leia cada afirmação</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Cada questão apresenta 4 afirmações sobre comportamento profissional.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mt-0.5">
                        <MousePointerClick className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Selecione <strong>Mais</strong> e <strong>Menos</strong></p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Escolha a afirmação que <strong>mais</strong> descreve você e a que <strong>menos</strong> descreve você.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mt-0.5">
                        <Users className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Não há respostas certas ou erradas</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Seja sincero e siga seu primeiro instinto. Não tente impressionar.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Important notice */}
                <motion.div
                  variants={staggerItem}
                  className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100"
                >
                  <AlertCircle className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-violet-800">
                    <p className="font-medium">Importante</p>
                    <p className="text-violet-600 mt-0.5">
                      Responda de acordo com seu comportamento <strong>no ambiente de trabalho</strong>. 
                      As respostas são analisadas por IA para gerar um perfil comportamental completo.
                    </p>
                  </div>
                </motion.div>

                {/* Start Button */}
                <motion.div variants={staggerItem}>
                  <Button
                    size="lg"
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={startTest}
                    disabled={isStartingTest}
                  >
                    {isStartingTest ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Preparando avaliação...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Iniciar Avaliação
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Seu progresso será salvo automaticamente
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // STATE 2: Test Questions (STARTED)
  // ============================================
  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 -mx-1">
        <Card className="border-b-0 rounded-b-2xl shadow-lg overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />

          <CardContent className="py-3 px-4 space-y-3">
            {/* Top row: title + timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-tight">
                    Avaliação DISC
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Questão {currentQuestion + 1} de {TOTAL_QUESTIONS}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 tabular-nums text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {answeredCount}/{TOTAL_QUESTIONS}
                </Badge>
                <TimerDisplay startTime={startTime} isCompleted={isCompleted} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative">
              <Progress
                value={progress}
                className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:via-purple-500 [&>div]:to-fuchsia-500"
              />
              <p className="text-right text-xs text-muted-foreground mt-1 tabular-nums">
                {Math.round(progress)}% concluído
              </p>
            </div>

            {/* Question Navigator */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {DISC_QUESTIONS.map((_, idx) => {
                const answer = answers.find(
                  (a) => a.questionNumber === idx + 1
                );
                const isComplete = answer?.mostOption && answer?.leastOption;
                const isCurrent = idx === currentQuestion;

                return (
                  <QuestionNavigatorDot
                    key={idx}
                    index={idx}
                    isComplete={!!isComplete}
                    isCurrent={isCurrent}
                    onClick={() => setCurrentQuestion(idx)}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Counter Banner */}
      {unansweredCount > 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-center text-muted-foreground">
            {unansweredCount === TOTAL_QUESTIONS
              ? "Comece selecionando as opções para cada afirmação"
              : unansweredCount > 0
              ? `Faltam ${unansweredCount} ${
                  unansweredCount === 1 ? "questão" : "questões"
                } para responder`
              : null}
          </p>
        </motion.div>
      )}

      {/* Current Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <DiscQuestionCard
            question={DISC_QUESTIONS[currentQuestion]}
            questionNumber={currentQuestion + 1}
            totalQuestions={TOTAL_QUESTIONS}
            selectedMost={currentAnswer?.mostOption || null}
            selectedLeast={currentAnswer?.leastOption || null}
            onMostSelect={handleMostSelect}
            onLeastSelect={handleLeastSelect}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <motion.div
        className="flex items-center justify-between pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentQuestion === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {/* Question progress dots (mobile-friendly) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 5))}
            disabled={currentQuestion <= 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
          >
            ...
          </button>
          {Array.from({ length: Math.min(7, TOTAL_QUESTIONS) }, (_, i) => {
            const start = Math.max(
              0,
              Math.min(currentQuestion - 3, TOTAL_QUESTIONS - 7)
            );
            const idx = start + i;
            if (idx >= TOTAL_QUESTIONS) return null;
            const answer = answers.find((a) => a.questionNumber === idx + 1);
            const isComplete = answer?.mostOption && answer?.leastOption;
            const isCurrent = idx === currentQuestion;
            return (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  isCurrent && "w-4 h-2 rounded-full bg-violet-500",
                  isComplete && !isCurrent && "bg-emerald-400",
                  !isComplete && !isCurrent && "bg-muted-foreground/25"
                )}
              />
            );
          })}
          <button
            onClick={() =>
              setCurrentQuestion(
                Math.min(TOTAL_QUESTIONS - 1, currentQuestion + 5)
              )
            }
            disabled={currentQuestion >= TOTAL_QUESTIONS - 1}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
          >
            ...
          </button>
        </div>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={!isCurrentComplete || isSubmitting || unansweredCount > 0}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Concluir e Enviar
              </>
            )}
          </Button>
        ) : (
          <Button onClick={goNext} className="gap-2 bg-violet-600 hover:bg-violet-700">
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </motion.div>

      {/* Unanswered warning for final submit */}
      {isLastQuestion && unansweredCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            Você ainda tem{" "}
            <strong>
              {unansweredCount} {unansweredCount === 1 ? "questão" : "questões"}
            </strong>{" "}
            sem resposta. Responda todas para concluir.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-amber-700 border-amber-300 hover:bg-amber-100 h-7 text-xs"
            onClick={() => {
              for (let i = 0; i < TOTAL_QUESTIONS; i++) {
                const ans = answers.find((a) => a.questionNumber === i + 1);
                if (!ans?.mostOption || !ans?.leastOption) {
                  setCurrentQuestion(i);
                  break;
                }
              }
            }}
          >
            Ir para não respondida
          </Button>
        </motion.div>
      )}

      {/* Collapsible Instructions */}
      <Collapsible
        open={isInstructionsOpen}
        onOpenChange={setIsInstructionsOpen}
      >
        <Card className="bg-muted/30 border-dashed">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 rounded-xl transition-colors">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                <span className="font-medium">Instruções</span>
              </div>
              <motion.div
                animate={{ rotate: isInstructionsOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 space-y-3">
              <Separator className="mb-3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Não há respostas certas ou erradas
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Responda com base no ambiente de trabalho
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Seu progresso é salvo automaticamente
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Siga seu primeiro instinto nas respostas
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Tempo estimado: 10-15 minutos. Você pode navegar entre as
                questões livremente usando os números acima.
              </p>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
