"use client";

import { useEffect } from "react";
import { useJobsStore } from "@/stores/jobs-store";
import { Job } from "@/types/job";
import { JobForm } from "./job-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NewJobDialog() {
  const { isNewJobDialogOpen, closeNewJobDialog } = useJobsStore();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  const handleSuccess = () => {
    closeNewJobDialog();
  };

  if (isDesktop) {
    return (
      <Dialog open={isNewJobDialogOpen} onOpenChange={(open) => !open && closeNewJobDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nova Vaga</DialogTitle>
            <DialogDescription>
              Preencha as informações para criar uma nova vaga
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <JobForm onSuccess={handleSuccess} onCancel={closeNewJobDialog} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={isNewJobDialogOpen} onOpenChange={(open) => !open && closeNewJobDialog()}>
      <SheetContent side="bottom" className="h-[90vh] px-4">
        <SheetHeader className="text-left">
          <SheetTitle>Nova Vaga</SheetTitle>
          <SheetDescription>
            Preencha as informações para criar uma nova vaga
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(90vh-100px)] mt-4 pb-8">
          <JobForm onSuccess={handleSuccess} onCancel={closeNewJobDialog} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function EditJobDialog() {
  const { editingJob, closeEditJobDialog } = useJobsStore();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  const handleSuccess = () => {
    closeEditJobDialog();
  };

  if (isDesktop) {
    return (
      <Dialog open={!!editingJob} onOpenChange={(open) => !open && closeEditJobDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Vaga</DialogTitle>
            <DialogDescription>
              Atualize as informações da vaga
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <JobForm
              job={editingJob}
              onSuccess={handleSuccess}
              onCancel={closeEditJobDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={!!editingJob} onOpenChange={(open) => !open && closeEditJobDialog()}>
      <SheetContent side="bottom" className="h-[90vh] px-4">
        <SheetHeader className="text-left">
          <SheetTitle>Editar Vaga</SheetTitle>
          <SheetDescription>
            Atualize as informações da vaga
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(90vh-100px)] mt-4 pb-8">
          <JobForm
            job={editingJob}
            onSuccess={handleSuccess}
            onCancel={closeEditJobDialog}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
