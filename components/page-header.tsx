import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ eyebrow, title, description, back }: { eyebrow?: string; title: string; description?: string; back?: string }) {
  return <header className="mb-6">
    {back && <Link href={back} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--muted)]"><ChevronLeft size={19} />返回</Link>}
    {eyebrow && <p className="section-label mb-2">{eyebrow}</p>}
    <h1 className="serif text-[32px] leading-[1.15] font-bold tracking-[-.03em]">{title}</h1>
    {description && <p className="mt-2 max-w-xl text-[15px] leading-6 text-[var(--muted)]">{description}</p>}
  </header>;
}
