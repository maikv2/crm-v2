export const EXHIBITOR_TYPES = [
  {
    value: "FLOOR",
    label: "Expositor de chão",
    capacity: 50,
  },
  {
    value: "ACRYLIC_CLOSED",
    label: "Expositor acrílico fechado",
    capacity: 36,
  },
  {
    value: "ACRYLIC_OPEN",
    label: "Expositor acrílico aberto",
    capacity: 36,
  },
  {
    value: "ACRYLIC_OPEN_SMALL",
    label: "Expositor acrílico aberto pequeno",
    capacity: 20,
  },
] as const;

export function getExhibitorTypeLabel(type?: string | null) {
  const found = EXHIBITOR_TYPES.find((item) => item.value === type);
  return found?.label ?? "-";
}

export function getExhibitorTypeCapacity(type?: string | null) {
  const found = EXHIBITOR_TYPES.find((item) => item.value === type);
  return found?.capacity ?? 0;
}