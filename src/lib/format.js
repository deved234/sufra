// Western digits with thousands separators in both languages:
// "1,250 ر.س" in Arabic, "SAR 1,250" in English. Halalas always show two digits
// ("42.50", never "42.5"), whole prices none.
const wholeFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const centsFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatPrice(amount, locale) {
  const value = (Number.isInteger(amount) ? wholeFormat : centsFormat).format(amount);
  return locale === "ar" ? `${value} ر.س` : `SAR ${value}`;
}
