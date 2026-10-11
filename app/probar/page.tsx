import type { Metadata } from "next";
import { Probar } from "@/components/pages/probar";

export const metadata: Metadata = {
  title: "Probar",
};

export default function Page() {
  return <Probar />;
}
