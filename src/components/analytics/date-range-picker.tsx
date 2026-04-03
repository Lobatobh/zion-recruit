"use client";

import * as React from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  align?: "start" | "center" | "end";
}

type PresetKey = "7d" | "30d" | "90d" | "6m" | "1y" | "thisMonth" | "lastMonth" | "custom";

const presets: { label: string; value: PresetKey; days?: number; custom?: () => DateRange }[] = [
  { label: "Últimos 7 dias", value: "7d", days: 7 },
  { label: "Últimos 30 dias", value: "30d", days: 30 },
  { label: "Últimos 90 dias", value: "90d", days: 90 },
  { label: "Últimos 6 meses", value: "6m", days: 180 },
  { label: "Último ano", value: "1y", days: 365 },
  { label: "Este mês", value: "thisMonth", custom: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Mês passado", value: "lastMonth", custom: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Personalizado", value: "custom" },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  align = "start",
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<PresetKey>("30d");

  const handlePresetChange = (preset: PresetKey) => {
    setSelectedPreset(preset);
    
    if (preset !== "custom") {
      const presetConfig = presets.find((p) => p.value === preset);
      if (presetConfig?.days) {
        const endDate = new Date();
        const startDate = subDays(endDate, presetConfig.days);
        onChange?.({ from: startDate, to: endDate });
      } else if (presetConfig?.custom) {
        onChange?.(presetConfig.custom());
      }
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    onChange?.(range);
  };

  const formatRange = () => {
    if (!value?.from) return "Selecionar período";
    if (!value.to) return format(value.from, "dd MMM yyyy", { locale: ptBR });
    return `${format(value.from, "dd MMM yyyy", { locale: ptBR })} - ${format(value.to, "dd MMM yyyy", { locale: ptBR })}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Selecionar período" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
