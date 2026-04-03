"use client";

import * as React from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRange } from "react-day-picker";
import { downloadFile } from "@/lib/analytics/export";
import { toast } from "sonner";

interface ExportButtonProps {
  dateRange?: DateRange;
  className?: string;
}

export function ExportButton({
  dateRange,
  className,
}: ExportButtonProps) {
  const [loading, setLoading] = React.useState<string | null>(null);

  const handleExport = async (format: "csv" | "json") => {
    setLoading(format);
    try {
      const params = new URLSearchParams({ format });

      if (dateRange?.from) {
        params.set("startDate", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.set("endDate", dateRange.to.toISOString());
      }

      const response = await fetch(`/api/analytics/export?${params}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Exportação falhou");
      }

      const content = await response.text();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.replace('"', "")
        : `analytics-export.${format}`;

      downloadFile(content, filename, format);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Falha ao exportar dados. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar como CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          disabled={loading !== null}
        >
          <FileJson className="mr-2 h-4 w-4" />
          Exportar como JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
