/**
 * Import Dialog - Zion Recruit
 * 
 * Dialog for importing candidates to pipeline
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { toast } from "sonner";
import { SourcedCandidate, getSourceColor, getSourceLabel } from '@/lib/sourcing/types';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  candidates: SourcedCandidate[];
  jobId: string;
  onComplete: (imported: number) => void;
}

interface ImportResult {
  candidateId?: string;
  success: boolean;
  isDuplicate?: boolean;
  error?: string;
}

export function ImportDialog({
  open,
  onClose,
  candidates,
  jobId,
  onComplete,
}: ImportDialogProps) {
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set(candidates.map(c => c.id))
  );

  // Toggle candidate selection
  const toggleCandidate = (id: string) => {
    const newSet = new Set(selectedCandidates);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCandidates(newSet);
  };

  // Select/deselect all
  const toggleAll = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c.id)));
    }
  };

  // Import candidates
  const handleImport = async () => {
    const candidatesToImport = candidates.filter(c => selectedCandidates.has(c.id));
    
    if (candidatesToImport.length === 0) return;
    
    setImporting(true);
    setResults([]);

    try {
      const response = await fetch('/api/sourcing/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: candidatesToImport,
          jobId,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (data.results) {
        setResults(data.results);
      }

      if (data.success) {
        // Wait a moment to show results, then complete
        setTimeout(() => {
          onComplete(data.imported);
        }, 1500);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Falha na importação. Tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = selectedCandidates.size;
  const isComplete = results.length > 0;
  const importedCount = results.filter(r => r.success).length;
  const duplicateCount = results.filter(r => r.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? 'Importação Concluída' : 'Importar Candidatos'}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `${importedCount} candidato(s) importado(s) com sucesso`
              : `Importar ${selectedCount} candidato(s) para seu pipeline`}
          </DialogDescription>
        </DialogHeader>

        {!isComplete ? (
          <>
            {/* Candidate Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Candidatos ({selectedCount} selecionados)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                  className="text-xs"
                >
                  {selectedCount === candidates.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                        selectedCandidates.has(candidate.id) ? 'bg-muted' : ''
                      }`}
                      onClick={() => toggleCandidate(candidate.id)}
                    >
                      <Checkbox
                        checked={selectedCandidates.has(candidate.id)}
                        onCheckedChange={() => toggleCandidate(candidate.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {candidate.title}
                        </p>
                      </div>
                      <Badge className={getSourceColor(candidate.source)}>
                        {getSourceLabel(candidate.source)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">
                <Tag className="h-4 w-4 inline mr-2" />
                Tags (opcional)
              </Label>
              <Input
                id="tags"
                placeholder="ex: sourced, prioridade, frontend"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Tags separados por vírgula</p>
            </div>
          </>
        ) : (
          /* Results */
          <ScrollArea className="h-48 border rounded-lg">
            <div className="p-2 space-y-1">
              {candidates.map((candidate, index) => {
                const result = results[index];
                return (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-2 p-2 rounded"
                  >
                    {result?.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : result?.isDuplicate ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {result?.success
                          ? 'Importado com sucesso'
                          : result?.isDuplicate
                          ? 'Candidato duplicado'
                          : result?.error || 'Falha na importação'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {isComplete ? (
            <Button onClick={() => onComplete(importedCount)}>
              Concluído
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={importing}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Importar {selectedCount} Candidato{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
