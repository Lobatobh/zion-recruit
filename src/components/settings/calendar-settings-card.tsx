"use client";

/**
 * Calendar Settings Card - Zion Recruit
 * UI component for Google Calendar integration
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Unlink,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendarId?: string;
  calendarName?: string;
}

export function CalendarSettingsCard() {
  const [status, setStatus] = useState<CalendarStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/calendar/connect", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        if (data.authUrl) {
          window.open(data.authUrl, "_blank");
          toast.info("Autorize o acesso no Google Calendar");
        }
      } else {
        toast.error("Erro ao conectar com Google Calendar");
      }
    } catch (error) {
      toast.error("Erro ao conectar com Google Calendar");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/calendar/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setStatus({ connected: false });
        toast.success("Google Calendar desconectado");
      } else {
        toast.error("Erro ao desconectar");
      }
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/calendar/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error refreshing calendar status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Calendar className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>
                Sincronize entrevistas com seu Google Calendar
              </CardDescription>
            </div>
          </div>
          {status.connected ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Não conectado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Not Connected State */}
        {!status.connected && (
          <>
            <Alert>
              <CalendarCheck className="h-4 w-4" />
              <AlertTitle>Integração com Google Calendar</AlertTitle>
              <AlertDescription className="text-sm">
                Conecte seu Google Calendar para:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Sincronizar entrevistas automaticamente</li>
                  <li>Enviar convites de calendário aos candidatos</li>
                  <li>Evitar conflitos de horário</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Conectar Google Calendar
                </>
              )}
            </Button>
          </>
        )}

        {/* Connected State */}
        {status.connected && (
          <>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conta conectada</span>
                <Badge variant="outline" className="text-xs">
                  {status.email}
                </Badge>
              </div>
              {status.calendarName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Calendário</span>
                  <span className="text-sm">{status.calendarName}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              As entrevistas agendadas serão sincronizadas automaticamente
            </p>
          </>
        )}

        {/* Help Link */}
        <div className="pt-2 border-t">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <a
              href="https://support.google.com/calendar/answer/37083"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Como usar o Google Calendar
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
