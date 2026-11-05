// Text as a search compares it. Arabic has several spellings people use
// interchangeably (أ/إ/آ/ا, ة/ه, ى/ي) and optional vowel marks, so "كبسه" must find
// "كَبسة". Shared by the server, which prepares the list, and the search box.
export function normalizeSearch(text) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "") // vowel marks and the stretching dash
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}
