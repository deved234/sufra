// Only here so the not-found page beside it can catch what the panel's layout throws:
// a segment's own layout isn't covered by its own not-found page.
export default function AdminGroupLayout({ children }) {
  return children;
}
