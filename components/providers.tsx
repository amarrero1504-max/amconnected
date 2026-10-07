"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { FleetProvider } from "@/components/fleet-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      <FleetProvider>
        <TooltipProvider>
          {children}
          <Toaster position="top-center" />
        </TooltipProvider>
      </FleetProvider>
    </ThemeProvider>
  );
}
