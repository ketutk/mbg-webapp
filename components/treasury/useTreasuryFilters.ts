"use client";

import { useMemo, useState } from "react";
import { todayISO } from "@/lib/format";
import type { EntryType } from "@/lib/types";
import { computePresetDates, type PeriodPreset } from "./period";

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
    () => computePresetDates(preset, selectedMonth, customFrom, customTo),
    [preset, selectedMonth, customFrom, customTo],
  );

  const filterParams = useMemo(
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
    preset,
    setPreset,
    selectedMonth,
    setSelectedMonth,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    typeFilter,
    setTypeFilter,
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    periodRange,
    filterParams,
    hasActiveFilters,
    resetFilters,
    handleSelectMonthFromChart,
  };
}
