export const priorityOverviewPath = "settings/priority-failover?from=overview";

// Only known local entry points may be used as a return destination.
export function priorityReturnPage(query: URLSearchParams): "overview" | "settings" {
  return query.get("from") === "overview" ? "overview" : "settings";
}
