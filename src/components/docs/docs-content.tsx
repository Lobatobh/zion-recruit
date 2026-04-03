"use client";

import { Copy, Check, ChevronRight, ChevronDown, ExternalLink, Info, AlertTriangle, CheckCircle, XCircle, Lightbulb, Code as CodeIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DocArticle } from "./docs-data";

interface DocsContentProps {
  article: DocArticle;
}

// Custom Markdown-like renderer
function RenderContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let codeLanguage = "";
  let inList = false;
  let listItems: string[] = [];

  const finishList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-4 ml-4">
          {listItems.map((item, i) => (
            <li key={i} className="text-muted-foreground leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-sm">$1</code>');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  lines.forEach((line, index) => {
    // Code blocks
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        finishList();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
        codeContent = "";
      } else {
        inCodeBlock = false;
        elements.push(
          <CodeBlock 
            key={`code-${elements.length}`} 
            code={codeContent.trim()} 
            language={codeLanguage} 
          />
        );
      }
      return;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      return;
    }

    // Headers
    if (line.startsWith("### ")) {
      finishList();
      elements.push(
        <h3 key={index} className="text-lg font-semibold mt-8 mb-4 text-foreground flex items-center gap-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith("## ")) {
      finishList();
      elements.push(
        <h2 key={index} className="text-xl font-bold mt-10 mb-4 text-foreground flex items-center gap-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith("# ")) {
      finishList();
      elements.push(
        <h1 key={index} className="text-3xl font-bold mb-6 text-foreground">
          {renderInline(line.slice(2))}
        </h1>
      );
      return;
    }

    // Horizontal rule
    if (line === "---" || line === "***") {
      finishList();
      elements.push(<Separator key={index} className="my-8" />);
      return;
    }

    // Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line.slice(2));
      return;
    }

    // Callouts
    if (line.startsWith(":::") || line.startsWith("> ")) {
      finishList();
      const calloutMatch = line.match(/:::(\w+)?\s*(.*)/);
      if (calloutMatch) {
        const type = calloutMatch[1] || "info";
        const content = calloutMatch[2];
        elements.push(
          <Callout key={index} type={type as "info" | "warning" | "success" | "error" | "tip"}>
            {renderInline(content)}
          </Callout>
        );
        return;
      }
      if (line.startsWith("> ")) {
        elements.push(
          <Callout key={index} type="info">
            {renderInline(line.slice(2))}
          </Callout>
        );
        return;
      }
    }

    // Empty lines
    if (line.trim() === "") {
      finishList();
      return;
    }

    // Tables
    if (line.includes("|") && !line.startsWith("<!--")) {
      finishList();
      // Simple table handling
      if (!line.includes("---")) {
        const cells = line.split("|").filter(Boolean).map(c => c.trim());
        elements.push(
          <div key={index} className="overflow-x-auto my-2">
            <div className="flex gap-4 text-sm">
              {cells.map((cell, i) => (
                <span key={i} className="text-muted-foreground">{renderInline(cell)}</span>
              ))}
            </div>
          </div>
        );
      }
      return;
    }

    // Regular paragraphs
    finishList();
    elements.push(
      <p key={index} className="text-muted-foreground leading-relaxed mb-4">
        {renderInline(line)}
      </p>
    );
  });

  finishList();

  return <>{elements}</>;
}

// Code block component with copy functionality
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <CodeIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {language || "code"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar
            </>
          )}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto bg-muted/30">
        <code className="text-sm font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}

// Callout component
function Callout({ 
  type, 
  children 
}: { 
  type: "info" | "warning" | "success" | "error" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    info: {
      icon: <Info className="h-5 w-5" />,
      bg: "bg-blue-500/10 border-blue-500/30",
      iconColor: "text-blue-500",
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5" />,
      bg: "bg-amber-500/10 border-amber-500/30",
      iconColor: "text-amber-500",
    },
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      bg: "bg-green-500/10 border-green-500/30",
      iconColor: "text-green-500",
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      bg: "bg-red-500/10 border-red-500/30",
      iconColor: "text-red-500",
    },
    tip: {
      icon: <Lightbulb className="h-5 w-5" />,
      bg: "bg-purple-500/10 border-purple-500/30",
      iconColor: "text-purple-500",
    },
  };

  const style = styles[type];

  return (
    <div className={cn("my-4 p-4 rounded-lg border flex gap-3", style.bg)}>
      <div className={cn("flex-shrink-0 mt-0.5", style.iconColor)}>
        {style.icon}
      </div>
      <div className="flex-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function DocsContent({ article }: DocsContentProps) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {article.badge && (
            <Badge variant="secondary">{article.badge}</Badge>
          )}
          {article.updatedAt && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {article.updatedAt}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {article.title}
        </h1>
        <p className="text-lg text-muted-foreground">{article.description}</p>
      </header>

      <Separator className="my-8" />

      {/* Content */}
      <div className="docs-content">
        <RenderContent content={article.content} />
      </div>

      {/* Navigation */}
      {(article.prevArticle || article.nextArticle) && (
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex justify-between gap-4">
            {article.prevArticle ? (
              <Button variant="outline" className="flex-1 justify-start h-auto py-4">
                <div className="text-left">
                  <div className="text-xs text-muted-foreground mb-1">← Anterior</div>
                  <div className="font-medium">{article.prevTitle}</div>
                </div>
              </Button>
            ) : (
              <div />
            )}
            {article.nextArticle ? (
              <Button variant="outline" className="flex-1 justify-end h-auto py-4">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Próximo →</div>
                  <div className="font-medium">{article.nextTitle}</div>
                </div>
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 p-6 rounded-lg border border-border bg-muted/30">
        <h3 className="font-semibold mb-2">Precisa de ajuda?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Não encontrou o que procurava? Nossa equipe está pronta para ajudar.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Enviar Feedback
          </Button>
          <Button variant="outline" size="sm">
            Contatar Suporte
          </Button>
        </div>
      </div>
    </article>
  );
}
