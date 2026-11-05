"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import RestaurantGrid from "@/components/restaurant-grid";
import { openStateAt } from "@/lib/opening-hours";
import { normalizeSearch } from "@/lib/search-text";

const PAGE_SIZE = 12;

// Unique { key, label } choices for a filter, sorted for the reader's language
function choices(restaurants, field) {
  const seen = new Map(restaurants.map((restaurant) => [restaurant[`${field}Key`], restaurant[field]]));
  return [...seen].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
}

// The whole list is already on the page, so filtering answers on every keystroke with
// no server trip, and the page itself stays static. Filters are kept in the URL, so a
// search can be shared and survives a refresh or switching language: cities and
// cuisines are stored by their English name, which is the same in both.
export default function ExploreList({ restaurants }) {
  const t = useTranslations("Explore");
  const params = useSearchParams();

  // The box has its own state: the URL updates a moment later, and a text input fed
  // from it would lose characters typed fast
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);
  const [shown, setShown] = useState(PAGE_SIZE);

  const city = params.get("city") ?? "";
  const cuisine = params.get("cuisine") ?? "";
  const openNow = params.get("open") === "1";
  const bookable = params.get("book") === "1";

  const setParam = (name, value) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(name, value);
    else next.delete(name);
    const search = next.toString();
    window.history.replaceState(null, "", search ? `${window.location.pathname}?${search}` : window.location.pathname);
    setShown(PAGE_SIZE);
  };

  const results = useMemo(() => {
    const words = normalizeSearch(deferredQuery).split(" ").filter(Boolean);
    return restaurants.filter(
      (restaurant) =>
        words.every((word) => restaurant.searchText.includes(word)) &&
        (!city || restaurant.cityKey === city) &&
        (!cuisine || restaurant.cuisineKey === cuisine) &&
        (!bookable || restaurant.bookable) &&
        (!openNow || openStateAt(restaurant.schedule).open),
    );
  }, [restaurants, deferredQuery, city, cuisine, bookable, openNow]);

  const filtered = Boolean(query || city || cuisine || openNow || bookable);
  const clear = () => {
    setQuery("");
    window.history.replaceState(null, "", window.location.pathname);
    setShown(PAGE_SIZE);
  };

  return (
    <div className="flex flex-col gap-6">
      <div role="search" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("searchLabel")}
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setParam("q", event.target.value);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 font-normal text-foreground placeholder:text-muted-foreground focus-visible:border-ring"
            />
          </label>
          <FilterSelect label={t("city")} all={t("allCities")} value={city} options={choices(restaurants, "city")} onChange={(value) => setParam("city", value)} />
          <FilterSelect label={t("cuisine")} all={t("allCuisines")} value={cuisine} options={choices(restaurants, "cuisine")} onChange={(value) => setParam("cuisine", value)} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={openNow} onChange={(event) => setParam("open", event.target.checked ? "1" : "")} className="size-4 accent-brand" />
            {t("openNow")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={bookable} onChange={(event) => setParam("book", event.target.checked ? "1" : "")} className="size-4 accent-brand" />
            {t("bookable")}
          </label>
          {filtered && (
            <button type="button" onClick={clear} className="ms-auto font-semibold text-brand-text hover:underline">
              {t("clear")}
            </button>
          )}
        </div>
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {t("results", { count: results.length })}
      </p>

      {results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-10 text-center text-muted-foreground">{t("noResults")}</p>
      ) : (
        <RestaurantGrid restaurants={results.slice(0, shown)} />
      )}

      {results.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE_SIZE)}
          className="self-center rounded-pill border border-border-strong px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
        >
          {t("showMore")}
        </button>
      )}
    </div>
  );
}

function FilterSelect({ label, all, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 font-normal text-foreground focus-visible:border-ring"
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
