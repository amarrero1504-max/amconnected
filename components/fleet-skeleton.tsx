export function FleetSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-4">
      <p className="sr-only">Cargando la flota.</p>
      <div className="h-3 w-28 rounded bg-muted" />
      <div className="h-10 w-2/3 max-w-md rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-44 rounded-xl bg-muted" />
    </div>
  );
}
