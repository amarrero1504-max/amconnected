import type { Metadata } from "next";
import { Sucursal } from "@/components/pages/sucursal";

export const metadata: Metadata = {
  title: "Sucursal",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Sucursal id={id} />;
}
