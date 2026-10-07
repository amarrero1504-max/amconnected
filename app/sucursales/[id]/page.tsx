import type { Metadata } from "next";
import { Sucursal } from "@/components/pages/sucursal";
import { createSeed } from "@/lib/seed";

export const metadata: Metadata = {
  title: "Sucursal",
};

export function generateStaticParams() {
  return createSeed(0).branches.map((branch) => ({ id: branch.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Sucursal id={id} />;
}
