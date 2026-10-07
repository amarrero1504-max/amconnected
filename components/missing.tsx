import Link from "next/link";

export function Missing({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <div className="max-w-md py-10">
      <h1 className="text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        {action}
      </Link>
    </div>
  );
}
