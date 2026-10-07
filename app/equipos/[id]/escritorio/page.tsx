import type { Metadata } from "next";
import { Escritorio } from "@/components/pages/escritorio";
import { createSeed } from "@/lib/seed";

export const metadata: Metadata = {
  title: "Escritorio",
};

export function generateStaticParams() {
  return createSeed(0).machines.map((machine) => ({ id: machine.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Escritorio id={id} />;
}
