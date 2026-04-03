"use client";

/**
 * Add/Edit Stage Dialog - Zion Recruit
 * Form for creating or editing pipeline stages
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Palette } from "lucide-react";
import { usePipelineStore } from "@/stores/pipeline-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { STAGE_COLORS } from "@/types/pipeline";

// Form schema
const stageSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(50, "Nome muito longo"),
  color: z.string(),
});

type StageForm = z.infer<typeof stageSchema>;

export function AddStageDialog() {
  const {
    isAddStageOpen,
    closeAddStage,
    editingStage,
    setEditingStage,
    createStage,
    updateStageData,
  } = usePipelineStore();

  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<StageForm>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: "",
      color: "#6B7280",
    },
  });

  // Update form when editing
  useEffect(() => {
    if (editingStage) {
      form.setValue("name", editingStage.name);
      form.setValue("color", editingStage.color);
    } else {
      form.reset({
        name: "",
        color: "#6B7280",
      });
    }
  }, [editingStage, form]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAddStage();
      setEditingStage(null);
      form.reset();
    }
  };

  const onSubmit = async (data: StageForm) => {
    setIsLoading(true);
    try {
      if (editingStage) {
        await updateStageData(editingStage.id, data);
        toast.success("Etapa atualizada com sucesso");
      } else {
        await createStage(data);
        toast.success("Etapa criada com sucesso");
      }
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar etapa"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Etapa</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Triagem, Entrevista, Teste..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Color Picker */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cor
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-6 gap-2">
                  {STAGE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => field.onChange(color.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        field.value === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: form.watch("color") }}
          />
          <span className="font-medium">
            {form.watch("name") || "Nome da etapa"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingStage ? "Atualizar" : "Criar"} Etapa
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={isAddStageOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>
              {editingStage ? "Editar Etapa" : "Nova Etapa"}
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isAddStageOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingStage ? "Editar Etapa" : "Nova Etapa"}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
