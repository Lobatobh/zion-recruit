"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowRight, Key, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalAuthProps {
  onAuthenticated: (token: string) => void;
  initialToken?: string;
}

export function PortalAuth({ onAuthenticated, initialToken }: PortalAuthProps) {
  const [mode, setMode] = useState<"request" | "enter">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Se existir uma conta com este email, um link de acesso ao portal foi enviado. Verifique sua caixa de entrada.",
        });
        setEmail("");
      } else {
        setMessage({
          type: "error",
          text: data.error || "Falha ao solicitar acesso",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Falha ao solicitar acesso. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        onAuthenticated(token);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Token inválido ou expirado",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Falha ao verificar token. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  // If initial token is provided, auto-verify
  if (initialToken && !message) {
    handleVerifyToken({ preventDefault: () => {} } as React.FormEvent);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-200/30 dark:bg-emerald-900/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-teal-200/30 dark:bg-teal-900/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-0 shadow-xl shadow-emerald-900/5">
          <CardHeader className="text-center pb-2">
            <motion.div
              className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
                type: "spring",
                stiffness: 200,
              }}
            >
              <Shield className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              Portal do Candidato
            </CardTitle>
            <CardDescription className="mt-1.5">
              {mode === "request"
                ? "Digite seu email para receber um link de acesso ao portal"
                : "Digite seu token de acesso para continuar"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <Alert
                    variant={message.type === "error" ? "destructive" : "default"}
                    className={cn(
                      "mb-4",
                      message.type === "success" &&
                        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    )}
                  >
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {mode === "request" ? (
                <motion.form
                  key="request-form"
                  onSubmit={handleRequestAccess}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Endereço de Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-900/10"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Solicitar Link de Acesso
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="enter-form"
                  onSubmit={handleVerifyToken}
                  className="space-y-4"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="token">Token de Acesso</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="token"
                        type="text"
                        placeholder="Digite seu token de acesso"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-900/10"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        Acessar Portal
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0">
            <Button
              variant="link"
              className="text-sm text-muted-foreground hover:text-emerald-600"
              onClick={() => {
                setMode(mode === "request" ? "enter" : "request");
                setMessage(null);
              }}
            >
              {mode === "request"
                ? "Já possui um token? Digite aqui"
                : "Solicitar um novo link de acesso"}
            </Button>
          </CardFooter>
        </Card>

        {/* Footer branding */}
        <motion.p
          className="text-center text-xs text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Powered by{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Zion Recruit
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}
