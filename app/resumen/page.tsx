import type { Metadata } from "next";
import { Panel } from "@/components/pages/panel";

export const metadata: Metadata = {
  title: "Resumen",
};

export default function Page() {
  return <Panel />;
}
