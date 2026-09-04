"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, NotebookPen, UserRound } from "lucide-react";

const items = [
  { href: "/", label: "吃什么", icon: House },
  { href: "/discover", label: "发现", icon: Compass },
  { href: "/record", label: "记录", icon: NotebookPen },
  { href: "/me", label: "我的", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/share/")) return null;
  return <nav className="bottom-nav" aria-label="主导航">{items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link className="nav-item" data-active={active} href={href} key={href}><Icon size={21} strokeWidth={active ? 2.5 : 2} /><span>{label}</span></Link>;
  })}</nav>;
}
