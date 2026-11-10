"use client";

import { useMemo, useState } from "react";
import { type PeriodPreset, addDaysISO, getMonthRange, todayISO } from "@/lib/date";
import type { SessionListItem, SessionStatus, SessionsFilterParams } from "../types";

export interface SessionsFiltersState {
  preset: PeriodPreset;
  customFrom: string;
  customTo: string;
  statusFilter: "ALL" | SessionStatus;
  searchText: string;
  page: number;
  pageSize: number;
  deletingSession: SessionListItem | null;
  deletingBusy: boolean;
}

export function useSessionsFilters(isOrganiser: boolean) {
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SessionStatus>("ALL");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingSession, setDeletingSession] = useState<SessionListItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const dateRange = useMemo(() => {
    const today = todayISO();
    const ym = today.slice(0, 7);
    switch (preset) {
      case "all":
        return {};
      case "this-month":
        return getMonthRange(ym);
      case "last-30":
        return { from: addDaysISO(today, -29), to: today };
      case "this-year": {
        const year = today.slice(0, 4);
        return { from: `${year}-01-01`, to: `${year}-12-31` };
      }
      case "custom":
        return {
          from: customFrom || undefined,
          to: customTo || undefined,
        };
      default:
        return {};
    }
  }, [preset, customFrom, customTo]);

  const filterParams: SessionsFilterParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      status: isOrganiser ? statusFilter : ("OPEN" as const),
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [dateRange.from, dateRange.to, isOrganiser, statusFilter, searchText, page, pageSize],
  );

  const hasActiveFilters =
    preset !== "all" ||
    (isOrganiser && statusFilter !== "ALL") ||
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
    state: {
      preset,
      customFrom,
      customTo,
      statusFilter,
      searchText,
      page,
      pageSize,
      deletingSession,
      deletingBusy,
    },
    setters: {
      setPreset,
      setCustomFrom,
      setCustomTo,
      setStatusFilter,
      setSearchText,
      setPage,
      setPageSize,
      setDeletingSession,
      setDeletingBusy,
    },
    filterParams,
    hasActiveFilters,
    resetFilters,
  };
}
