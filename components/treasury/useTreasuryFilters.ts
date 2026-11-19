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
  const [categoryFilter, setCategoryFilter] = useState<string>("");
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
      categoryId: categoryFilter || undefined,
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [
      periodRange.from,
      periodRange.to,
      typeFilter,
      categoryFilter,
      searchText,
      page,
      pageSize,
    ],
  );

  const hasActiveFilters =
    preset !== "all" ||
    typeFilter !== "ALL" ||
    categoryFilter !== "" ||
    searchText.trim().length > 0;

  function resetFilters() {
    setPreset("all");
    setTypeFilter("ALL");
    setCategoryFilter("");
    setSearchText("");
    setCustomFrom("");
    setCustomTo("");
    setPage(1);
  }

  const activeWeekStart =
    preset === "custom" && customFrom && customTo ? customFrom : undefined;

  function handleSelectMonthFromChart(ym: string) {
    if (preset === "month" && selectedMonth === ym) {
      setPreset("all");
    } else {
      setSelectedMonth(ym);
      setPreset("month");
    }
    setPage(1);
  }

  function handleSelectWeekFromChart(weekStart: string, weekEnd: string) {
    if (
      preset === "custom" &&
      customFrom === weekStart &&
      customTo === weekEnd
    ) {
      setPreset("all");
      setCustomFrom("");
      setCustomTo("");
    } else {
      setCustomFrom(weekStart);
      setCustomTo(weekEnd);
      setPreset("custom");
    }
    setPage(1);
  }

  function handleSelectCategoryFromBreakdown(categoryId: string) {
    setCategoryFilter((prev) => (prev === categoryId ? "" : categoryId));
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
    categoryFilter,
    setCategoryFilter,
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
    activeWeekStart,
    handleSelectMonthFromChart,
    handleSelectWeekFromChart,
    handleSelectCategoryFromBreakdown,
  };
}
