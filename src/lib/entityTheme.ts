// Shared entity-type color palette and trust-score scale, used by both
// EvidenceBoard (graph nodes) and the dashboard (aggregate breakdowns) so
// the two views stay visually consistent.
export const ENTITY_THEME: Record<string, string> = {
  Person: "#f35918",
  Place: "#0369a1",
  Event: "#C0392B",
  Object: "#6b7280",
  // cognee-onto's DataPoint model is named OntoDocument (Cognee auto-sets
  // node `type` from the Python class name) -- "Document" kept as an alias
  // in case some other source produces a plain "Document" type.
  OntoDocument: "#929c05",
  Document: "#929c05",
  Transaction: "#10b981",
  default: "#0d0d0d",
};

export function entityColor(type: string): string {
  return ENTITY_THEME[type] || ENTITY_THEME.default;
}

export function trustColor(trust: number): string {
  if (trust >= 70) return "#2f8f62"; // high trust — green
  if (trust >= 40) return "#b1791a"; // medium — amber
  return "#b23f3a"; // low — red
}

export function trustBand(trust: number): "high" | "medium" | "low" {
  if (trust >= 70) return "high";
  if (trust >= 40) return "medium";
  return "low";
}
