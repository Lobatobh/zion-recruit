"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  createCandidateSchema,
  CreateCandidateInput,
} from "@/types/candidate";
import { Job } from "@/types/job";
import { ResumeUpload } from "./resume-upload";
import { Loader2, User, Mail, Phone, Linkedin, Globe, Briefcase, Save } from "lucide-react";
import { motion } from "framer-motion";

// Extended schema for form
const formSchema = createCandidateSchema.extend({
  // Already has: jobId, name, email, phone, linkedin, portfolio, resumeText, resumeBase64, source
});

interface ParsedData {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  skills: Array<{ name: string; level?: string }>;
  experience: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    years?: number;
  }>;
  education: Array<{
    institution?: string;
    degree: string;
    year?: string;
  }>;
  languages: Array<{ name: string; level?: string }>;
  summary?: string;
  confidence: number;
}

interface CandidateFormProps {
  jobs: Job[];
  onSubmit: (data: CreateCandidateInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<CreateCandidateInput>;
}

export function CandidateForm({
  jobs,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: CandidateFormProps) {
  const [parsedResumeText, setParsedResumeText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateCandidateInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobId: initialData?.jobId || "",
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || null,
      linkedin: initialData?.linkedin || null,
      portfolio: initialData?.portfolio || null,
      resumeText: initialData?.resumeText || null,
      resumeBase64: initialData?.resumeBase64 || null,
      source: initialData?.source || null,
    },
  });

  // Handle parsed resume data
  const handleResumeParsed = (text: string, data: ParsedData) => {
    setParsedResumeText(text);
    // Also update form's resumeText field so it's included on submit
    form.setValue("resumeText", text);

    // Auto-fill form fields if they're empty
    if (data.name && !form.getValues("name")) {
      form.setValue("name", data.name);
    }
    if (data.email && !form.getValues("email")) {
      form.setValue("email", data.email);
    }
    if (data.phone && !form.getValues("phone")) {
      form.setValue("phone", data.phone);
    }
    if (data.linkedin && !form.getValues("linkedin")) {
      form.setValue("linkedin", data.linkedin);
    }
  };

  // Handle form submission
  const handleSubmit = async (data: CreateCandidateInput) => {
    setIsSubmitting(true);
    try {
      // Include parsed resume text if available
      const submitData = {
        ...data,
        resumeText: parsedResumeText || data.resumeText,
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter only published jobs
  const availableJobs = jobs.filter((job) => job.status === "PUBLISHED");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading || isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma vaga" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableJobs.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Nenhuma vaga publicada disponível
                    </div>
                  ) : (
                    availableJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                        {job.department && ` - ${job.department}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Resume Upload */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Currículo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResumeUpload
              onResumeParsed={handleResumeParsed}
              disabled={isLoading || isSubmitting}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome completo"
                        {...field}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="LinkedIn, Indeed, Indicação..."
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      De onde o candidato veio
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* LinkedIn */}
            <FormField
              control={form.control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://linkedin.com/in/usuario"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Portfolio */}
            <FormField
              control={form.control}
              name="portfolio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="h-3 w-3" />
                    Portfolio
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://portfolio.com"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Candidato
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
