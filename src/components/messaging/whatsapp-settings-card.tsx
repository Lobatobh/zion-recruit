"use client";

/**
 * WhatsApp Settings Card - Zion Recruit
 * UI component for WhatsApp connection management
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  QrCode,
  RefreshCw,
  Unplug,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Phone,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ============================================
// Types
// ============================================

interface WhatsAppStatus {
  configured: boolean;
  connected: boolean;
  instance?: {
    name: string;
    id: string;
    status: string;
  };
  message?: string;
}

interface WhatsAppSettingsCardProps {
  onStatusChange?: (connected: boolean) => void;
}

// ============================================
// Component
// ============================================

export function WhatsAppSettingsCard({ onStatusChange }: WhatsAppSettingsCardProps) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do Zion Recruit.");
  const [isSending, setIsSending] = useState(false);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    // Poll for status updates every 5 seconds when connected
    const interval = setInterval(() => {
      if (status?.connected) {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status?.connected]);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/whatsapp");
      const data = await response.json();
      setStatus(data);
      onStatusChange?.(data.connected);
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
      });

      const data = await response.json();

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setShowQRDialog(true);
        // Start polling for connection
        pollForConnection();
      } else {
        toast.success("WhatsApp conectado com sucesso!");
        fetchStatus();
      }
    } catch (error) {
      toast.error("Erro ao conectar WhatsApp");
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const pollForConnection = async () => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch("/api/whatsapp");
        const data = await response.json();

        if (data.connected) {
          clearInterval(interval);
          setShowQRDialog(false);
          setQrCode(null);
          setStatus(data);
          onStatusChange?.(true);
          toast.success("WhatsApp conectado com sucesso!");
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          toast.error("Tempo esgotado. Tente novamente.");
        }
      } catch {
        // Continue polling
      }
    }, 5000);
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
      });
      toast.success("WhatsApp desconectado");
      fetchStatus();
      onStatusChange?.(false);
    } catch (error) {
      toast.error("Erro ao desconectar WhatsApp");
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Mensagem enviada com sucesso!");
        setTestPhone("");
        setTestMessage("Olá! Esta é uma mensagem de teste do Zion Recruit.");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleGetQRCode = async () => {
    try {
      const response = await fetch("/api/whatsapp/qrcode", {
        method: "POST",
      });
      const data = await response.json();

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setShowQRDialog(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Erro ao obter QR Code");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not configured state
  if (!status?.configured) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <AlertCircle className="h-10 w-10 mx-auto text-yellow-500 mb-3" />
          <h3 className="text-lg font-medium text-center mb-2">WhatsApp não configurado</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Configure as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY para ativar o WhatsApp.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://doc.evolution-api.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Documentação
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MessageCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">WhatsApp</CardTitle>
                <CardDescription>
                  Conecte seu WhatsApp para comunicação omnichannel
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
                Desconectado
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection Status */}
          {status.instance && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Instância: {status.instance.name}</p>
                <p className="text-xs text-muted-foreground">
                  Status: {status.instance.status}
                </p>
              </div>
              {status.connected && (
                <Badge variant="outline" className="text-green-600">
                  Ativo
                </Badge>
              )}
            </div>
          )}

          {/* Connection Actions */}
          <div className="flex gap-2">
            {!status.connected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar via QR Code
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleGetQRCode}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Ver QR Code
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  <Unplug className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </>
            )}
          </div>

          {/* Test Message (when connected) */}
          {status.connected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-4 border-t"
            >
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Enviar Mensagem de Teste
              </h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="11999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <Input
                  placeholder="Mensagem de teste"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />

                <Button
                  onClick={handleSendTest}
                  disabled={isSending || !testPhone}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Refresh */}
          <Button variant="ghost" size="sm" onClick={fetchStatus} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Status
          </Button>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-4">
            {qrCode ? (
              <>
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  1. Abra o WhatsApp no seu celular<br />
                  2. Toque em Menu ou Configurações e selecione Aparelhos conectados<br />
                  3. Toque em Conectar um aparelho<br />
                  4. Aponte seu telefone para esta tela para escanear o QR code
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center w-64 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
