"use client";

/**
 * Notification Center Component
 * Bell icon with dropdown showing all notifications
 */

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationCenter() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="Notificações"
    >
      <Bell className="h-5 w-5" />
    </Button>
  );
}
