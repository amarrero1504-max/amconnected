import type { Metadata } from "next";
import { Equipo } from "@/components/pages/equipo";

export const metadata: Metadata = {
  title: "Equipo",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Equipo id={id} />;
}
