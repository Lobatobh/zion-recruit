/**
 * Candidate Preview - Zion Recruit
 * 
 * Component for previewing external candidate profile
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  Calendar,
  ExternalLink,
  UserPlus,
  Building,
  GraduationCap,
} from 'lucide-react';
import { SourcedCandidate, getSourceColor, getSourceLabel, getExperienceLevelLabel } from '@/lib/sourcing/types';

interface CandidatePreviewProps {
  candidate: SourcedCandidate;
  open: boolean;
  onClose: () => void;
  onImport: (candidate: SourcedCandidate) => void;
}

export function CandidatePreview({
  candidate,
  open,
  onClose,
  onImport,
}: CandidatePreviewProps) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      onImport(candidate);
    } finally {
      setImporting(false);
    }
  };

  // Generate initials for avatar
  const initials = candidate.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Parse experience
  const experience = candidate.experience || [];
  const education = candidate.education || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Preview do Candidato</DialogTitle>
          <DialogDescription>
            Revise o perfil do candidato antes de importar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-semibold">{candidate.name}</h3>
                  <Badge className={getSourceColor(candidate.source)}>
                    {getSourceLabel(candidate.source)}
                  </Badge>
                  {candidate.relevanceScore !== undefined && (
                    <Badge variant="outline">
                      {candidate.relevanceScore}% compatibilidade
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  {candidate.title}
                  {candidate.company && ` at ${candidate.company}`}
                </p>
                {candidate.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {candidate.location}
                    {candidate.remote && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Aceita Remoto
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {candidate.phone}
                </div>
              )}
              {candidate.linkedin && (
                <a
                  href={candidate.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  Perfil LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {candidate.github && (
                <a
                  href={candidate.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Github className="h-4 w-4" />
                  Perfil GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {candidate.portfolio && (
                <a
                  href={candidate.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Portfólio
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <Separator />

            {/* Summary */}
            {candidate.summary && (
              <div>
                <h4 className="font-medium mb-2">Resumo</h4>
                <p className="text-sm text-muted-foreground">{candidate.summary}</p>
              </div>
            )}

            {/* Skills */}
            <div>
              <h4 className="font-medium mb-2">Habilidades</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Experience */}
            {experience.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Experiência</h4>
                <div className="space-y-4">
                  {experience.map((exp, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="mt-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{exp.title}</span>
                          {exp.current && (
                            <Badge variant="outline" className="text-xs">Atual</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                        {exp.description && (
                          <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Educação</h4>
                <div className="space-y-3">
                  {education.map((edu, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="mt-1">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">
                          {[edu.degree, edu.field].filter(Boolean).join(' in ')}
                        </span>
                        <p className="text-sm text-muted-foreground">{edu.institution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {candidate.experienceYears !== undefined && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.experienceYears}+ anos de experiência</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              'Importando...'
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Importar para Pipeline
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
