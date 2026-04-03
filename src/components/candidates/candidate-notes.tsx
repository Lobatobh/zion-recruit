"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Note, formatCandidateDate, formatRelativeTime } from "@/types/candidate";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CandidateNotesProps {
  notes: Note[];
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  isLoading?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function NoteItem({
  note,
  onDelete,
  isDeleting,
}: {
  note: Note;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(note.author?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {note.author?.name || "Usuário"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(note.createdAt)}
              </span>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {note.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function CandidateNotes({
  notes,
  onAddNote,
  onDeleteNote,
  isLoading = false,
}: CandidateNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote("");
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDeleteNote(deleteNoteId);
    } catch (error) {
      console.error("Error deleting note:", error);
    } finally {
      setIsDeleting(false);
      setDeleteNoteId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notas
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({notes.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note textarea */}
        <div className="space-y-2">
          <Textarea
            placeholder="Adicione uma nota sobre este candidato..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={isAdding || isLoading}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim() || isAdding || isLoading}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nota
              </>
            )}
          </Button>
        </div>

        {/* Notes list */}
        {notes.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onDelete={() => setDeleteNoteId(note.id)}
                    isDeleting={isDeleting && deleteNoteId === note.id}
                  />
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma nota ainda</p>
            <p className="text-xs mt-1">Adicione notas para acompanhar o candidato</p>
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
