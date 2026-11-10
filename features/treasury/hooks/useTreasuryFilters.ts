"use client";

import { useMemo, useState } from "react";
import { type PeriodPreset, resolvePeriod, todayISO } from "@/lib/date";
import type { EntryType, TreasuryFilterParams } from "../types";

export interface TreasuryFiltersState {
  preset: PeriodPreset;
  selectedMonth: string;
  customFrom: string;
  customTo: string;
  typeFilter: "ALL" | EntryType;
  searchText: string;
  page: number;
  pageSize: number;
}

export function useTreasuryFilters() {
  const defaultYm = useMemo(() => todayISO().slice(0, 7), []);
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYm);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | EntryType>("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const periodRange = useMemo(
    () => resolvePeriod(preset, { month: selectedMonth, from: customFrom, to: customTo }),
    [preset, selectedMonth, customFrom, customTo],
  );

  const filterParams: TreasuryFilterParams = useMemo(
    () => ({
      from: periodRange.from,
      to: periodRange.to,
      type: typeFilter,
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [periodRange.from, periodRange.to, typeFilter, searchText, page, pageSize],
  );

  const hasActiveFilters =
    preset !== "all" || typeFilter !== "ALL" || searchText.trim().length > 0;

  function resetFilters() {
    setPreset("all");
    setTypeFilter("ALL");
    setSearchText("");
    setCustomFrom("");
    setCustomTo("");
    setPage(1);
  }

  function handleSelectMonthFromChart(ym: string) {
    if (preset === "month" && selectedMonth === ym) {
      setPreset("all");
    } else {
      setSelectedMonth(ym);
      setPreset("month");
    }
    setPage(1);
  }

  return {
    state: {
      preset,
      selectedMonth,
      customFrom,
      customTo,
      typeFilter,
      searchText,
      page,
      pageSize,
      periodRange,
    },
    setters: {
      setPreset,
      setSelectedMonth,
      setCustomFrom,
      setCustomTo,
      setTypeFilter,
      setSearchText,
      setPage,
      setPageSize,
    },
    filterParams,
    hasActiveFilters,
    resetFilters,
    handleSelectMonthFromChart,
  };
}

