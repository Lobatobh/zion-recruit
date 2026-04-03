"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Book,
  FileText,
  Shield,
  Scale,
  Lock,
  Code,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Moon,
  Sun,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { DocsContent } from "./docs-content";
import { DocsSidebar } from "./docs-sidebar";
import { docsSections, type DocSection, type DocArticle } from "./docs-data";

interface DocsPageProps {
  initialArticle?: string;
}

export function DocsPage({ initialArticle }: DocsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<string>(
    initialArticle || "overview"
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Filter articles based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return docsSections;

    const query = searchQuery.toLowerCase();
    return docsSections.map((section) => ({
      ...section,
      articles: section.articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.description.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
      ),
    })).filter((section) => section.articles.length > 0);
  }, [searchQuery]);

  // Get current article
  const currentArticle = (() => {
    for (const section of docsSections) {
      const article = section.articles.find((a) => a.id === selectedArticle);
      if (article) return { section, article };
    }
    return null;
  })();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("docs-search")?.focus();
      }
      // Escape to close mobile menu
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getSectionIcon = (icon: string) => {
    const icons: Record<string, React.ReactNode> = {
      book: <Book className="h-4 w-4" />,
      code: <Code className="h-4 w-4" />,
      shield: <Shield className="h-4 w-4" />,
      scale: <Scale className="h-4 w-4" />,
      lock: <Lock className="h-4 w-4" />,
      file: <FileText className="h-4 w-4" />,
    };
    return icons[icon] || <FileText className="h-4 w-4" />;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Documentação</h1>
        <div className="w-10" />
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background border-r border-border z-50"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <DocsSidebar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredSections={filteredSections}
                selectedArticle={selectedArticle}
                setSelectedArticle={setSelectedArticle}
                getSectionIcon={getSectionIcon}
                onSelectArticle={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Layout */}
      <div className="flex-1 hidden lg:block">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            className="bg-muted/30 border-r border-border"
          >
            <DocsSidebar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredSections={filteredSections}
              selectedArticle={selectedArticle}
              setSelectedArticle={setSelectedArticle}
              getSectionIcon={getSectionIcon}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main Content */}
          <ResizablePanel defaultSize={80}>
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {currentArticle && (
                    <>
                      <span>{currentArticle.section.title}</span>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-foreground font-medium">
                        {currentArticle.article.title}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Article Content */}
              <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto p-8">
                  {currentArticle ? (
                    <motion.div
                      key={selectedArticle}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <DocsContent article={currentArticle.article} />
                    </motion.div>
                  ) : (
                    <div className="text-center py-20">
                      <Book className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h2 className="text-xl font-semibold mb-2">
                        Selecione um artigo
                      </h2>
                      <p className="text-muted-foreground">
                        Use o menu lateral para navegar pela documentação
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Content */}
      <ScrollArea className="flex-1 lg:hidden">
        <div className="p-4">
          {currentArticle ? (
            <DocsContent article={currentArticle.article} />
          ) : (
            <div className="text-center py-20">
              <Book className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">
                Selecione um artigo
              </h2>
              <p className="text-muted-foreground">
                Use o menu para navegar pela documentação
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
