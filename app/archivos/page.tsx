import type { Metadata } from "next";
import { Suspense } from "react";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { Archivos } from "@/components/pages/archivos";

export const metadata: Metadata = {
  title: "Acceso a archivos",
};

export default function Page() {
  return (
    <Suspense fallback={<FleetSkeleton />}>
      <Archivos />
    </Suspense>
  );
}
