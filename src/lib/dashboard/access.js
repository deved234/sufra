import { ObjectId } from "mongodb";

// Who may manage a restaurant, as a query: its owners, or an admin. Every dashboard read
// and write uses this, so "another owner's restaurant simply matches nothing" holds in
// one place. Deleted restaurants match nobody here: an admin restores them first.
export function manageFilter(user, slug) {
  return {
    slug,
    status: { $ne: "deleted" },
    ...(user.role !== "admin" && { ownerIds: new ObjectId(user.id) }),
  };
}
