"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal, MapPin, Building2, Briefcase } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { JobType } from "@prisma/client";

interface JobFiltersProps {
  departments: string[];
  locations: string[];
  currentFilters: {
    search?: string;
    department?: string;
    location?: string;
    type?: string;
  };
  onFiltersChange: (filters: {
    search?: string;
    department?: string;
    location?: string;
    type?: string;
  }) => void;
}

const jobTypeOptions: { value: string; label: string }[] = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "FULL_TIME", label: "Tempo Integral" },
  { value: "PART_TIME", label: "Meio Período" },
  { value: "CONTRACT", label: "Contrato" },
  { value: "INTERNSHIP", label: "Estágio" },
  { value: "FREELANCE", label: "Freelance" },
];

export function JobFilters({
  departments,
  locations,
  currentFilters,
  onFiltersChange,
}: JobFiltersProps) {
  const [localSearch, setLocalSearch] = useState(currentFilters.search || "");

  const handleSearch = () => {
    onFiltersChange({ ...currentFilters, search: localSearch || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setLocalSearch("");
    onFiltersChange({});
  };

  const hasActiveFilters = 
    currentFilters.search || 
    currentFilters.department || 
    currentFilters.location || 
    currentFilters.type;

  const activeFilterCount = [
    currentFilters.search,
    currentFilters.department,
    currentFilters.location,
    currentFilters.type,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vagas, skills, empresas..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4"
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSearch} className="flex-1 sm:flex-none">
            Buscar
          </Button>
          
          {/* Mobile Filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    variant="default"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  Refine sua busca por vagas
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Job Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Tipo de vaga
                  </label>
                  <Select
                    value={currentFilters.type || "ALL"}
                    onValueChange={(value) => 
                      onFiltersChange({
                        ...currentFilters, 
                        type: value === "ALL" ? undefined : value 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Departamento
                  </label>
                  <Select
                    value={currentFilters.department || "ALL"}
                    onValueChange={(value) => 
                      onFiltersChange({
                        ...currentFilters, 
                        department: value === "ALL" ? undefined : value 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os departamentos</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </label>
                  <Select
                    value={currentFilters.location || "ALL"}
                    onValueChange={(value) => 
                      onFiltersChange({
                        ...currentFilters, 
                        location: value === "ALL" ? undefined : value 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a localização" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as localizações</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Filters Row */}
      <div className="hidden sm:flex flex-wrap gap-3">
        <Select
          value={currentFilters.type || "ALL"}
          onValueChange={(value) => 
            onFiltersChange({
              ...currentFilters, 
              type: value === "ALL" ? undefined : value 
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo de vaga" />
          </SelectTrigger>
          <SelectContent>
            {jobTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentFilters.department || "ALL"}
          onValueChange={(value) => 
            onFiltersChange({
              ...currentFilters, 
              department: value === "ALL" ? undefined : value 
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentFilters.location || "ALL"}
          onValueChange={(value) => 
            onFiltersChange({
              ...currentFilters, 
              location: value === "ALL" ? undefined : value 
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Localização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {currentFilters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: {currentFilters.search}
              <button
                onClick={() => {
                  setLocalSearch("");
                  onFiltersChange({ ...currentFilters, search: undefined });
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.type && (
            <Badge variant="secondary" className="gap-1">
              {jobTypeOptions.find(o => o.value === currentFilters.type)?.label}
              <button
                onClick={() => onFiltersChange({ ...currentFilters, type: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.department && (
            <Badge variant="secondary" className="gap-1">
              {currentFilters.department}
              <button
                onClick={() => onFiltersChange({ ...currentFilters, department: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.location && (
            <Badge variant="secondary" className="gap-1">
              {currentFilters.location}
              <button
                onClick={() => onFiltersChange({ ...currentFilters, location: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
