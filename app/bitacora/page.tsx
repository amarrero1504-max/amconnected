import type { Metadata } from "next";
import { Bitacora } from "@/components/pages/bitacora";

export const metadata: Metadata = {
  title: "Bitácora",
};

export default function Page() {
  return <Bitacora />;
}
