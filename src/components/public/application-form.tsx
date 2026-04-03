"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Send, 
  CheckCircle2, 
  FileText, 
  Linkedin, 
  Github, 
  Globe,
  Mail,
  Phone,
  User,
  AlertCircle
} from "lucide-react";

const applicationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido"),
  phone: z.string().max(50).optional().nullable(),
  resumeUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  linkedin: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  github: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  portfolio: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  coverLetter: z.string().max(5000).optional().nullable(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  source?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  referrer?: string;
}

export function ApplicationForm({
  jobId,
  jobTitle,
  companyName,
  isOpen,
  onClose,
  source,
  utmParams,
  referrer,
}: ApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      resumeUrl: "",
      linkedin: "",
      github: "",
      portfolio: "",
      coverLetter: "",
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/jobs/${jobId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          source,
          utmSource: utmParams?.source,
          utmMedium: utmParams?.medium,
          utmCampaign: utmParams?.campaign,
          referrer,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("Você já se candidatou a esta vaga.");
        } else if (result.details) {
          // Validation errors
          const firstError = Object.values(result.details)[0];
          setError(Array.isArray(firstError) ? firstError[0] : "Erro de validação");
        } else {
          setError(result.error || "Erro ao enviar candidatura");
        }
        return;
      }

      setIsSuccess(true);
      form.reset();
    } catch (err) {
      setError("Erro de conexão. Tente novamente.");
      console.error("Application error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false);
      setError(null);
      onClose();
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Candidatura Enviada!
            </DialogTitle>
            <DialogDescription>
              Sua candidatura foi enviada com sucesso.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground mb-4">
              Recebemos sua candidatura para a vaga de <strong>{jobTitle}</strong> na <strong>{companyName}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Entraremos em contato pelo email informado se seu perfil for selecionado.
            </p>
          </div>

          <Button onClick={handleClose} className="w-full">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidatar-se</DialogTitle>
          <DialogDescription>
            Vaga: {jobTitle} em {companyName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Personal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Nome completo *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
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
                      <Mail className="h-3.5 w-3.5" />
                      Email *
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resumeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      URL do Currículo
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://drive.google.com/..." 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Professional Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Links Profissionais</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Linkedin className="h-3.5 w-3.5" />
                        LinkedIn
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://linkedin.com/in/..." 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="github"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Github className="h-3.5 w-3.5" />
                        GitHub
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://github.com/..." 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        Portfolio
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://seusite.com" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Cover Letter */}
            <FormField
              control={form.control}
              name="coverLetter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carta de Apresentação</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte-nos por que você é o candidato ideal para esta vaga..."
                      className="min-h-[120px] resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar candidatura
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
