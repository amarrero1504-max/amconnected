import type { Metadata } from "next";
import { Suspense } from "react";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { Equipos } from "@/components/pages/equipos";

export const metadata: Metadata = {
  title: "Equipos",
};

export default function Page() {
  return (
    <Suspense fallback={<FleetSkeleton />}>
      <Equipos />
    </Suspense>
  );
}
