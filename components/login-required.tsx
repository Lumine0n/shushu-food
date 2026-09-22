"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LockKeyhole } from "lucide-react";
import { loginHref } from "@/lib/access";

export function LoginRequired({ title = "登录后继续", description = "抽取推荐不需要登录，修改清单、收藏或上传内容时需要先登录。" }: { title?: string; description?: string }) {
  const pathname = usePathname();
  return <section className="soft-card p-6 text-center">
    <LockKeyhole className="mx-auto text-[var(--green)]" size={28} />
    <h2 className="serif mt-3 text-xl font-bold">{title}</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
    <Link className="primary-button mt-5 inline-flex items-center gap-2" href={loginHref(pathname)}><LogIn size={17} />去登录</Link>
  </section>;
}
