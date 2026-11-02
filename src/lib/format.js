// Western digits with thousands separators, matching the rest of the site: 1,250 ر.س
const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPrice(amount) {
  return `${priceFormat.format(amount)} ر.س`;
}

// Arabic counts change form with the number: طبق، طبقين، 3 أطباق، 11 طبق
export function formatDishCount(count) {
  if (count === 1) return "طبق واحد";
  if (count === 2) return "طبقين";
  if (count <= 10) return `${count} أطباق`;
  return `${count} طبق`;
}
