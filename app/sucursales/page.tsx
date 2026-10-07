import type { Metadata } from "next";
import { Sucursales } from "@/components/pages/sucursales";

export const metadata: Metadata = {
  title: "Sucursales",
};

export default function Page() {
  return <Sucursales />;
}
