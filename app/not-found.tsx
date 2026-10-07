import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg py-12">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">404</p>
      <h1 className="mt-2 text-4xl">Esa página no está en la mesa</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        El panel, las sucursales y los equipos siguen donde estaban.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        Volver al panel
      </Link>
    </div>
  );
}
