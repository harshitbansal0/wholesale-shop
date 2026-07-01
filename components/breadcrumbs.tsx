"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
            <li>
              {item.href && i < items.length - 1 ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={i === items.length - 1 ? "text-foreground font-medium" : ""} aria-current={i === items.length - 1 ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
