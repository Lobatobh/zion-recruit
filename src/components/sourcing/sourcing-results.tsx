/**
 * Sourcing Results - Zion Recruit
 * 
 * Component for displaying sourcing search results
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Eye,
  CheckSquare,
  Square,
  ArrowLeft,
  MapPin,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { SourcedCandidate, getSourceColor, getSourceLabel } from '@/lib/sourcing/types';

interface SourcingResultsProps {
  candidates: SourcedCandidate[];
  onSelectCandidate: (candidate: SourcedCandidate) => void;
  onImport: (candidates: SourcedCandidate[]) => void;
  onNewSearch: () => void;
}

export function SourcingResults({
  candidates,
  onSelectCandidate,
  onImport,
  onNewSearch,
}: SourcingResultsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  };

  // Select all / none
  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  };

  // Get selected candidates
  const getSelectedCandidates = () => {
    return candidates.filter(c => selected.has(c.id));
  };

  // Get score color
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum candidato encontrado</h3>
        <p className="text-muted-foreground text-center mb-4">
          Tente ajustar seus critérios de busca ou selecionar fontes diferentes
        </p>
        <Button variant="outline" onClick={onNewSearch}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Nova Busca
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onNewSearch}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <span className="text-sm text-muted-foreground">
            {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} encontrados
          </span>
        </div>
        {selected.size > 0 && (
          <Button size="sm" onClick={() => onImport(getSelectedCandidates())}>
            <UserPlus className="h-4 w-4 mr-2" />
            Importar Selecionados ({selected.size})
          </Button>
        )}
      </div>

      {/* Results Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selected.size === candidates.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Candidato</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead className="text-right">Compatibilidade</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow
                key={candidate.id}
                className={`cursor-pointer hover:bg-muted/50 ${
                  selected.has(candidate.id) ? 'bg-muted/30' : ''
                }`}
                onClick={() => onSelectCandidate(candidate)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(candidate.id)}
                    onCheckedChange={() => toggleSelect(candidate.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      {candidate.email && (
                        <p className="text-xs text-muted-foreground">{candidate.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{candidate.title}</p>
                    {candidate.company && (
                      <p className="text-xs text-muted-foreground">{candidate.company}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {candidate.location && (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {candidate.location}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getSourceColor(candidate.source)}>
                    {getSourceLabel(candidate.source)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {candidate.relevanceScore !== undefined && (
                    <span className={`font-medium ${getScoreColor(candidate.relevanceScore)}`}>
                      {candidate.relevanceScore}%
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelectCandidate(candidate)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onImport([candidate])}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Importar para Pipeline
                      </DropdownMenuItem>
                      {candidate.sourceUrl && (
                        <DropdownMenuItem asChild>
                          <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Fonte
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Footer with selected count */}
      {selected.size > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {selected.size} candidato{selected.size !== 1 ? 's' : ''} selecionados
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Limpar Seleção
              </Button>
              <Button size="sm" onClick={() => onImport(getSelectedCandidates())}>
                <UserPlus className="h-4 w-4 mr-2" />
                Importar Selecionados
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
