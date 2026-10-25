"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PageAvatar } from "@/components/brand";
import { NoticeCount } from "@/components/messenger";
import type { PageSummary } from "@/lib/types";

export function PageTabs({
  pages,
  selectedId,
}: {
  pages: PageSummary[] | null;
  selectedId: string | null;
}) {
  const scroller = useRef<HTMLElement>(null);

  useEffect(() => {
    const scrollerEl = scroller.current;
    const selected = scrollerEl?.querySelector<HTMLElement>("[aria-current='page']");
    if (!scrollerEl || !selected) return;
    const left =
      selected.offsetLeft - scrollerEl.clientWidth / 2 + selected.offsetWidth / 2;
    scrollerEl.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selectedId]);

  if (!pages?.length) return null;

  return (
    <nav
      ref={scroller}
      className="page-tabs lg:hidden"
      aria-label="Pages"
    >
      {pages?.map((page) => {
        const selected = selectedId === page.id;
        return (
          <Link
            key={page.id}
            href={`/pages/${page.id}`}
            scroll={false}
            className={`page-tab ${selected ? "page-tab-active" : ""}`}
            aria-current={selected ? "page" : undefined}
          >
            <PageAvatar
              name={page.name}
              imageUrl={page.imageUrl}
              size="sm"
              kind="page"
            />
            <span className="page-tab-name">{page.name}</span>
            <NoticeCount count={page.unreadCount} />
          </Link>
        );
      })}
    </nav>
  );
}
