"use client";

/**
 * Add Candidate Dialog - Zion Recruit
 * Form for adding new candidates with resume parsing preview
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Linkedin,
  Globe,
  FileText,
  Sparkles,
  Loader2,
  Check,
  X,
  Briefcase,
} from "lucide-react";
import { usePipelineStore } from "@/stores/pipeline-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

// Form schema
const addCandidateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  linkedin: z.string().url("URL inválida").optional().or(z.literal("")),
  portfolio: z.string().url("URL inválida").optional().or(z.literal("")),
  jobId: z.string().optional(),
  resumeText: z.string().optional(),
});

type AddCandidateForm = z.infer<typeof addCandidateSchema>;

// Parsed data preview type
interface ParsedPreview {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    years?: number;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
  }>;
  summary?: string;
}

export function AddCandidateDialog() {
  const { isAddCandidateOpen, closeAddCandidate, fetchPipeline } = usePipelineStore();
  const isMobile = useIsMobile();

  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedPreview | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; department?: string | null }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<AddCandidateForm>({
    resolver: zodResolver(addCandidateSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      linkedin: "",
      portfolio: "",
      jobId: "",
      resumeText: "",
    },
  });

  // Fetch jobs when dialog opens
  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs?status=PUBLISHED");
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Silently fail
    }
  };

  // Handle dialog open change
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAddCandidate();
      form.reset();
      setParsedPreview(null);
      setShowPreview(false);
    } else {
      fetchJobs();
    }
  };

  // Parse resume preview
  const handleParsePreview = async () => {
    const resumeText = form.getValues("resumeText");
    if (!resumeText || resumeText.trim().length < 50) {
      toast.error("Insira mais conteúdo do currículo para análise");
      return;
    }

    setIsParsing(true);
    try {
      const response = await fetch("/api/candidates/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });

      if (response.ok) {
        const data = await response.json();
        setParsedPreview(data);
        setShowPreview(true);

        // Auto-fill form if fields are empty (API returns { success, data: { ... } })
        const parsed = data.data;
        if (parsed) {
          if (!form.getValues("name") && parsed.name) {
            form.setValue("name", parsed.name);
          }
          if (!form.getValues("email") && parsed.email) {
            form.setValue("email", parsed.email);
          }
          if (!form.getValues("phone") && parsed.phone) {
            form.setValue("phone", parsed.phone);
          }
        }

        toast.success("Currículo analisado com sucesso");
      } else {
        toast.error("Erro ao analisar currículo");
      }
    } catch {
      toast.error("Erro ao analisar currículo");
    } finally {
      setIsParsing(false);
    }
  };

  // Submit form
  const onSubmit = async (data: AddCandidateForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: data.jobId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          linkedin: data.linkedin || null,
          portfolio: data.portfolio || null,
          resumeText: data.resumeText || null,
        }),
      });

      if (response.ok) {
        toast.success("Candidato adicionado com sucesso");
        handleOpenChange(false);
        fetchPipeline();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao adicionar candidato");
      }
    } catch {
      toast.error("Erro ao adicionar candidato");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Job Selection */}
            <FormField
              control={form.control}
              name="jobId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Vaga
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a vaga" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                          {job.department && ` - ${job.department}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Informações Básicas
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nome
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+55 11 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="portfolio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Portfolio
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Resume Text */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Currículo (Texto)
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleParsePreview}
                  disabled={isParsing || !form.watch("resumeText")}
                >
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analisar com IA
                </Button>
              </div>

              <FormField
                control={form.control}
                name="resumeText"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Cole o texto do currículo aqui..."
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parsed Preview */}
              <AnimatePresence>
                {showPreview && parsedPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border rounded-lg p-4 bg-muted/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Dados Extraídos</span>
                    </div>

                    {parsedPreview.summary && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {parsedPreview.summary}
                      </p>
                    )}

                    {parsedPreview.skills && parsedPreview.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {parsedPreview.skills.slice(0, 10).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {parsedPreview.skills.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{parsedPreview.skills.length - 10} mais
                          </Badge>
                        )}
                      </div>
                    )}

                    {parsedPreview.experience && parsedPreview.experience.length > 0 && (
                      <div className="space-y-2 text-sm">
                        <span className="font-medium">Experiência:</span>
                        {parsedPreview.experience.slice(0, 3).map((exp, i) => (
                          <div key={i} className="pl-2 border-l-2 border-border">
                            <span className="font-medium">{exp.title}</span>
                            {exp.company && (
                              <span className="text-muted-foreground">
                                {" "}
                                - {exp.company}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4 bg-background">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar Candidato
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={isAddCandidateOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Novo Candidato
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isAddCandidateOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Novo Candidato
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
