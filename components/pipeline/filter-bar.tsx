"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VIDEO_TYPES, type VideoType } from "@/lib/types";

export type BoardFilter = "all" | VideoType;

export function FilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  searchRef,
}: {
  filter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  searchRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        value={[filter]}
        onValueChange={(values: unknown[]) =>
          onFilterChange((values[0] as BoardFilter | undefined) ?? "all")
        }
        variant="outline"
        size="sm"
        aria-label="Filter by type"
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        {VIDEO_TYPES.map((t) => (
          <ToggleGroupItem key={t} value={t} className="capitalize">
            {t}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onSearchChange("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Search titles…"
          aria-label="Search by title"
          className="h-8 w-56 pl-8 text-sm"
        />
      </div>
    </div>
  );
}
