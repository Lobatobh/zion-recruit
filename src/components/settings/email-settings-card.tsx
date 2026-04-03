"use client";

/**
 * Email Settings Card - Zion Recruit
 * UI component for Email/SMTP configuration
 */

import { useState } from "react";
import {
  Mail,
  Server,
  User,
  Key,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
}

export function EmailSettingsCard() {
  const [config, setConfig] = useState<EmailConfig>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    from: "",
  });
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const handleSave = async () => {
    if (!config.host || !config.user) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          password: password || undefined,
        }),
      });

      if (response.ok) {
        toast.success("Configurações salvas com sucesso");
        setIsConfigured(true);
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao salvar configurações");
      }
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error("Informe um email para teste");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      if (response.ok) {
        toast.success("Email de teste enviado com sucesso!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao enviar email de teste");
      }
    } catch (error) {
      toast.error("Erro ao enviar email de teste");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Mail className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Email (SMTP)</CardTitle>
              <CardDescription>
                Configure seu servidor SMTP para envio de emails
              </CardDescription>
            </div>
          </div>
          {isConfigured ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Não configurado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Host and Port */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="host">Servidor SMTP</Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="host"
                placeholder="smtp.exemplo.com"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Porta</Label>
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="port"
                type="number"
                placeholder="587"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Secure */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Conexão Segura (TLS/SSL)</Label>
            <p className="text-xs text-muted-foreground">
              Ative para conexões criptografadas
            </p>
          </div>
          <Switch
            checked={config.secure}
            onCheckedChange={(checked) => setConfig({ ...config, secure: checked })}
          />
        </div>

        {/* User and Password */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="user">Usuário</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user"
                placeholder="seu@email.com"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* From Address */}
        <div className="space-y-2">
          <Label htmlFor="from">Email de Remetente</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="from"
              placeholder="noreply@suaempresa.com"
              value={config.from}
              onChange={(e) => setConfig({ ...config, from: e.target.value })}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Este email aparecerá como remetente nas mensagens
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* Test Email */}
        {isConfigured && (
          <div className="pt-4 border-t space-y-4">
            <h4 className="text-sm font-medium">Testar Configuração</h4>
            <div className="flex gap-2">
              <Input
                placeholder="email@exemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleTest} disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
