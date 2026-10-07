import type { Metadata } from "next";
import { Equipo } from "@/components/pages/equipo";
import { createSeed } from "@/lib/seed";

export const metadata: Metadata = {
  title: "Equipo",
};

export function generateStaticParams() {
  return createSeed(0).machines.map((machine) => ({ id: machine.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Equipo id={id} />;
}
