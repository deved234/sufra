// Western digits with thousands separators in both languages:
// "1,250 ر.س" in Arabic, "SAR 1,250" in English
const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPrice(amount, locale) {
  const value = priceFormat.format(amount);
  return locale === "ar" ? `${value} ر.س` : `SAR ${value}`;
}
