"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ParsedSkill,
  ParsedExperience,
  ParsedEducation,
  ParsedLanguage,
} from "@/types/candidate";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  File,
  Clipboard,
  User,
  Briefcase,
  GraduationCap,
  Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ParsedData {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  skills: ParsedSkill[];
  experience: ParsedExperience[];
  education: ParsedEducation[];
  languages: ParsedLanguage[];
  summary?: string;
  confidence: number;
}

interface ResumeUploadProps {
  onResumeParsed: (text: string, data: ParsedData) => void;
  initialText?: string;
  disabled?: boolean;
}

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".csv"];

export function ResumeUpload({
  onResumeParsed,
  initialText = "",
  disabled = false,
}: ResumeUploadProps) {
  const [resumeText, setResumeText] = useState(initialText);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file to server for text extraction
  const uploadFile = async (file: File): Promise<string | null> => {
    // Validate extension
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error("Formato inválido", {
        description: `Formato ".${ext}" não suportado. Use PDF, DOC, DOCX ou TXT.`,
      });
      return null;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande", {
        description: `Tamanho máximo: 5MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
      });
      return null;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/candidates/upload-resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar arquivo");
      }

      const extractedText = data.data.text;
      setResumeText(extractedText);
      setActiveTab("paste");

      // Notify parent with extracted text (without parsed data yet)
      onResumeParsed(extractedText, {
        skills: [],
        experience: [],
        education: [],
        languages: [],
        confidence: 0,
      });

      toast.success(`Arquivo "${data.data.fileName}" carregado`, {
        description: `${data.data.textLength} caracteres extraídos do ${data.data.fileType.toUpperCase()}.`,
      });
      return extractedText;
    } catch (error) {
      console.error("Upload error:", error);
      const msg = error instanceof Error ? error.message : "Erro ao fazer upload do arquivo";
      setParseError(msg);
      toast.error("Erro no upload", { description: msg });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files[0]) {
        await uploadFile(e.dataTransfer.files[0]);
      }
    },
    []
  );

  // Handle file input change
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        await uploadFile(e.target.files[0]);
      }
    },
    []
  );

  // Parse resume with AI
  const parseResume = async () => {
    if (!resumeText.trim()) {
      toast.error("Currículo vazio", {
        description: "Adicione o texto do currículo primeiro.",
      });
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch("/api/candidates/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar currículo");
      }

      setParsedData(data.data);
      onResumeParsed(resumeText, data.data);
      toast.success("Currículo processado", {
        description: `Confiança: ${data.data.confidence}%`,
      });
    } catch (error) {
      console.error("Parse error:", error);
      setParseError(
        error instanceof Error ? error.message : "Erro ao processar currículo"
      );
      toast.error("Erro no processamento", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Clear everything
  const handleClear = () => {
    setResumeText("");
    setParsedData(null);
    setParseError(null);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "paste" | "upload")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paste" className="gap-2">
            <Clipboard className="h-4 w-4" />
            Colar Texto
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Arquivo
          </TabsTrigger>
        </TabsList>

        {/* Paste Tab */}
        <TabsContent value="paste" className="mt-4">
          <div className="relative">
            <Textarea
              placeholder="Cole aqui o texto do currículo..."
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setParsedData(null);
                setParseError(null);
              }}
              disabled={disabled || isParsing}
              rows={10}
              className="resize-none pr-10"
            />
            {resumeText && (
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {resumeText.length} caracteres
          </p>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isUploading
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
              disabled={disabled || isUploading}
            />
            <label
              htmlFor="resume-upload"
              className={`cursor-pointer flex flex-col items-center gap-3 ${disabled || isUploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Processando arquivo...</p>
                    <p className="text-xs text-muted-foreground">
                      {uploadedFileName}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Arraste um arquivo ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, DOC, DOCX ou TXT (máx. 5MB)
                    </p>
                  </div>
                </>
              )}
            </label>
          </div>
        </TabsContent>
      </Tabs>

      {/* Parse Button */}
      <Button
        onClick={parseResume}
        disabled={!resumeText.trim() || isParsing || disabled || isUploading}
        className="w-full"
      >
        {isParsing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando com IA...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Processar Currículo
          </>
        )}
      </Button>

      {/* Error */}
      <AnimatePresence>
        {parseError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{parseError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed Data Preview */}
      <AnimatePresence>
        {parsedData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Dados Extraídos
                  </CardTitle>
                  <Badge
                    variant={
                      parsedData.confidence >= 80
                        ? "default"
                        : parsedData.confidence >= 50
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {parsedData.confidence}% confiança
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {/* Contact Info */}
                    {(parsedData.name ||
                      parsedData.email ||
                      parsedData.phone) && (
                      <div className="flex items-start gap-3">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Contato</p>
                          <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                            {parsedData.name && <p>Nome: {parsedData.name}</p>}
                            {parsedData.email && <p>Email: {parsedData.email}</p>}
                            {parsedData.phone && <p>Telefone: {parsedData.phone}</p>}
                            {parsedData.linkedin && (
                              <p>LinkedIn: {parsedData.linkedin}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {parsedData.skills.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Skills</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parsedData.skills.map((skill, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {skill.name}
                                {skill.level && ` (${skill.level})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {parsedData.experience.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Experiência</p>
                          <div className="space-y-2 mt-1">
                            {parsedData.experience.map((exp, index) => (
                              <div
                                key={index}
                                className="text-sm text-muted-foreground"
                              >
                                {exp.title && (
                                  <span className="font-medium text-foreground">
                                    {exp.title}
                                  </span>
                                )}
                                {exp.company && ` em ${exp.company}`}
                                {exp.years && ` (${exp.years} anos)`}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {parsedData.education.length > 0 && (
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Educação</p>
                          <div className="space-y-1 mt-1">
                            {parsedData.education.map((edu, index) => (
                              <div
                                key={index}
                                className="text-sm text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {edu.degree}
                                </span>
                                {edu.institution && ` - ${edu.institution}`}
                                {edu.year && ` (${edu.year})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {parsedData.languages && parsedData.languages.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Languages className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Idiomas</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parsedData.languages.map((lang, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {lang.name}
                                {lang.level && ` (${lang.level})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {parsedData.summary && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-1">Resumo</p>
                        <p className="text-sm text-muted-foreground">
                          {parsedData.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
