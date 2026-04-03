/**
 * Sourcing Panel - Zion Recruit
 * 
 * Main sourcing interface component
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Loader2,
  Users,
  Filter,
  Sparkles,
  Database,
  Linkedin,
  Github,
  Briefcase,
} from 'lucide-react';
import { toast } from "sonner";
import { SourceSelector } from './source-selector';
import { SourcingResults } from './sourcing-results';
import { CandidatePreview } from './candidate-preview';
import { ImportDialog } from './import-dialog';
import { SourcedCandidate, SourcingSource, getSourceIcon, getSourceColor } from '@/lib/sourcing/types';

interface SourcingPanelProps {
  jobId: string;
  jobTitle: string;
  jobSkills?: string[];
  jobLocation?: string;
  onImportComplete?: (imported: number) => void;
}

export function SourcingPanel({
  jobId,
  jobTitle,
  jobSkills = [],
  jobLocation,
  onImportComplete,
}: SourcingPanelProps) {
  // State
  const [activeTab, setActiveTab] = useState<'search' | 'results'>('search');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SourcedCandidate[]>([]);
  const [selectedSources, setSelectedSources] = useState<SourcingSource[]>(['linkedin', 'indeed', 'github', 'internal']);
  const [selectedCandidate, setSelectedCandidate] = useState<SourcedCandidate | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [candidatesToImport, setCandidatesToImport] = useState<SourcedCandidate[]>([]);
  
  // Search params
  const [query, setQuery] = useState(jobTitle);
  const [location, setLocation] = useState(jobLocation || '');
  const [skills, setSkills] = useState(jobSkills.join(', '));
  const [experienceLevel, setExperienceLevel] = useState<string>('');
  const [limit, setLimit] = useState(10);

  // Search candidates
  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setActiveTab('results');
    
    try {
      const response = await fetch('/api/sourcing/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          query,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          location,
          experienceLevel: experienceLevel || undefined,
          sources: selectedSources,
          limit,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.candidates);
      } else {
        toast.error(data.error || 'Falha na busca. Tente novamente.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Falha na busca. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, [jobId, query, skills, location, experienceLevel, selectedSources, limit]);

  // Import candidates
  const handleImport = useCallback((candidates: SourcedCandidate[]) => {
    setCandidatesToImport(candidates);
    setImportDialogOpen(true);
  }, []);

  // Import complete handler
  const handleImportComplete = useCallback((imported: number) => {
    setImportDialogOpen(false);
    setCandidatesToImport([]);
    onImportComplete?.(imported);
  }, [onImportComplete]);

  // Get source icon component
  const getSourceIconComponent = (source: SourcingSource) => {
    switch (source) {
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'github':
        return <Github className="h-4 w-4" />;
      case 'indeed':
        return <Briefcase className="h-4 w-4" />;
      case 'internal':
        return <Database className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Busca de Candidatos
        </CardTitle>
        <CardDescription>
          Busque candidatos em múltiplos canais
        </CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'results')} className="flex-1 flex flex-col">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Filter className="h-4 w-4 mr-2" />
              Filtros de Busca
            </TabsTrigger>
            <TabsTrigger value="results" disabled={isSearching && searchResults.length === 0}>
              <Search className="h-4 w-4 mr-2" />
              Resultados {searchResults.length > 0 && `(${searchResults.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="search" className="flex-1 p-6 pt-4">
          <div className="space-y-6">
            {/* Search Query */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Busca</label>
              <Input
                placeholder="ex: Desenvolvedor React Senior"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Habilidades Desejadas</label>
              <Input
                placeholder="ex: React, TypeScript, Node.js"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Habilidades separadas por vírgula</p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Localização</label>
              <Input
                placeholder="ex: São Paulo, SP"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível de Experiência</label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Qualquer nível</SelectItem>
                  <SelectItem value="entry">Júnior (0-1 anos)</SelectItem>
                  <SelectItem value="junior">Júnior (1-3 anos)</SelectItem>
                  <SelectItem value="mid">Pleno (3-5 anos)</SelectItem>
                  <SelectItem value="senior">Sênior (5-8 anos)</SelectItem>
                  <SelectItem value="lead">Líder (8-10 anos)</SelectItem>
                  <SelectItem value="principal">Principal (10+ anos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resultados por fonte</label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 candidatos</SelectItem>
                  <SelectItem value="10">10 candidatos</SelectItem>
                  <SelectItem value="20">20 candidatos</SelectItem>
                  <SelectItem value="30">30 candidatos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Source Selection */}
            <SourceSelector
              selected={selectedSources}
              onChange={setSelectedSources}
            />

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isSearching || selectedSources.length === 0}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Buscar Candidatos
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="results" className="flex-1 overflow-hidden">
          {isSearching ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Buscando nas fontes...</p>
                <div className="flex gap-2 mt-4 justify-center">
                  {selectedSources.map((source) => (
                    <Badge key={source} variant="outline" className={getSourceColor(source)}>
                      {getSourceIconComponent(source)}
                      <span className="ml-1 capitalize">{source}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <SourcingResults
              candidates={searchResults}
              onSelectCandidate={setSelectedCandidate}
              onImport={handleImport}
              onNewSearch={() => setActiveTab('search')}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Candidate Preview Dialog */}
      {selectedCandidate && (
        <CandidatePreview
          candidate={selectedCandidate}
          open={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onImport={(candidate) => {
            setSelectedCandidate(null);
            handleImport([candidate]);
          }}
        />
      )}

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        candidates={candidatesToImport}
        jobId={jobId}
        onComplete={handleImportComplete}
      />
    </div>
  );
}
