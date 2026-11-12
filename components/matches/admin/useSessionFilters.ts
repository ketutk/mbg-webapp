"use client";

import { useMemo, useState } from "react";
import type { SessionStatus } from "@/lib/types";
import {
  computeSessionDateRange,
  type PeriodPreset,
} from "./session-date-range";

export function useSessionFilters() {
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SessionStatus>("ALL");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const dateRange = useMemo(
    () => computeSessionDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const filterParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      status: statusFilter,
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [dateRange.from, dateRange.to, statusFilter, searchText, page, pageSize],
  );

  const hasActiveFilters =
    preset !== "all" ||
    statusFilter !== "ALL" ||
    searchText.trim().length > 0;

  function resetFilters() {
    setPreset("all");
    setCustomFrom("");
    setCustomTo("");
    setStatusFilter("ALL");
    setSearchText("");
    setPage(1);
  }

  return {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    filterParams,
    hasActiveFilters,
    resetFilters,
  };
}
