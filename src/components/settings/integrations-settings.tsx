"use client";

/**
 * Integrations Settings - Zion Recruit
 * Manage integrations with external services (WhatsApp, Email, Calendar)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppSettingsCard } from "@/components/messaging/whatsapp-settings-card";
import { EmailSettingsCard } from "./email-settings-card";
import { CalendarSettingsCard } from "./calendar-settings-card";
import {
  MessageCircle,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export function IntegrationsSettings() {
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Integrações</h2>
          <p className="text-sm text-muted-foreground">
            Conecte suas ferramentas para comunicação omnichannel
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6">
        {/* WhatsApp */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <WhatsAppSettingsCard onStatusChange={setWhatsappConnected} />
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <EmailSettingsCard />
        </motion.div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <CalendarSettingsCard />
        </motion.div>
      </div>

      {/* Status Summary */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Status das Integrações
          </CardTitle>
          <CardDescription>
            Visão geral das conexões ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`p-2 rounded-full ${whatsappConnected ? 'bg-green-500/10' : 'bg-muted'}`}>
                {whatsappConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  {whatsappConnected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-muted">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">
                  Configure SMTP
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-muted">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Não conectado
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
