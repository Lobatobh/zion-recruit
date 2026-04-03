"use client";

import { Book, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocSection } from "./docs-data";

interface DocsSidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSections: DocSection[];
  selectedArticle: string;
  setSelectedArticle: (id: string) => void;
  getSectionIcon: (icon: string) => React.ReactNode;
  onSelectArticle?: () => void;
}

export function DocsSidebar({
  searchQuery,
  setSearchQuery,
  filteredSections,
  selectedArticle,
  setSelectedArticle,
  getSectionIcon,
  onSelectArticle,
}: DocsSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo and Title */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Book className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Documentação</h1>
            <p className="text-xs text-muted-foreground">Zion Recruit v2.0</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="docs-search"
            placeholder="Buscar documentação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1 pb-4">
          {filteredSections.map((section) => (
            <div key={section.id} className="mb-4">
              <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {getSectionIcon(section.icon)}
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticle(article.id);
                      onSelectArticle?.();
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                      selectedArticle === article.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{article.title}</span>
                    {article.badge && (
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 flex-shrink-0">
                        {article.badge}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum resultado encontrado</p>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2025 Zion Recruit</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
