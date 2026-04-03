"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useJobsStore } from "@/stores/jobs-store";
import {
  createJobSchema,
  updateJobSchema,
  CreateJobInput,
  UpdateJobInput,
  Job,
  jobTypeOptions,
  jobStatusOptions,
} from "@/types/job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface JobFormProps {
  job?: Job | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function JobForm({ job, onSuccess, onCancel }: JobFormProps) {
  const { createJob, updateJob, isLoading } = useJobsStore();

  const isEditing = !!job;

  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: job?.title || "",
      department: job?.department || "",
      location: job?.location || "",
      type: job?.type || "FULL_TIME",
      remote: job?.remote || false,
      salaryMin: job?.salaryMin || undefined,
      salaryMax: job?.salaryMax || undefined,
      currency: job?.currency || "BRL",
      description: job?.description || "",
      requirements: job?.requirements || "",
      benefits: job?.benefits || "",
      status: job?.status || "DRAFT",
    },
  });

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      form.reset({
        title: job.title,
        department: job.department || "",
        location: job.location || "",
        type: job.type,
        remote: job.remote,
        salaryMin: job.salaryMin || undefined,
        salaryMax: job.salaryMax || undefined,
        currency: job.currency,
        description: job.description,
        requirements: job.requirements,
        benefits: job.benefits || "",
        status: job.status,
      });
    }
  }, [job, form]);

  const onSubmit = async (data: CreateJobInput) => {
    let success = false;

    if (isEditing && job) {
      const result = await updateJob(job.id, data as UpdateJobInput);
      success = !!result;
    } else {
      const result = await createJob(data);
      success = !!result;
    }

    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informações Básicas</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Título da Vaga *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Desenvolvedor Full Stack Senior"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Engenharia" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: São Paulo, SP" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contratação</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jobTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remote"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-8">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Trabalho Remoto</FormLabel>
                    <FormDescription>
                      Aceita candidatos remotos
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Salary Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Salário</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="salaryMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salário Mínimo</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 5000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? parseInt(e.target.value)
                          : null;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salaryMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salário Máximo</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 8000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? parseInt(e.target.value)
                          : null;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moeda</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Description Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Descrição da Vaga</h3>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva as responsabilidades e atividades do cargo..."
                    className="min-h-32 resize-y"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Suporta Markdown para formatação
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requisitos *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Liste os requisitos obrigatórios e desejáveis..."
                    className="min-h-32 resize-y"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Suporta Markdown para formatação
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="benefits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Benefícios</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Liste os benefícios oferecidos..."
                    className="min-h-24 resize-y"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Suporta Markdown para formatação
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Status Section */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {jobStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Vagas publicadas serão visíveis para candidatos
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Criar Vaga"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
