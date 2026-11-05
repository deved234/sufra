import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { ADMIN_LOG, BOOKINGS, RESTAURANTS, USERS } from "@/db/config";
import { addDays, riyadhDate } from "@/lib/booking-slots";

// The admin panel's reads. Pages check for an admin before calling these. Password
// hashes and session data never leave this file.

export const PAGE_SIZE = 25;
const CHART_DAYS = 30;

const restaurants = () => getDb().collection(RESTAURANTS);
const users = () => getDb().collection(USERS);
const bookings = () => getDb().collection(BOOKINGS);

// Regular expression characters in a search are plain text
const textMatch = (text) => ({ $regex: text.trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" });
const pageOf = (value) => Math.max(Number.parseInt(value, 10) || 1, 1);
const iso = (date) => date?.toISOString() ?? null;

// Counts per day for the last month, in Riyadh days, with empty days filled in
async function dailyCounts(collection) {
  const today = riyadhDate();
  const from = addDays(today, -(CHART_DAYS - 1));
  const rows = await collection
    .aggregate([
      { $match: { createdAt: { $gte: new Date(`${from}T00:00:00+03:00`) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Riyadh" } }, count: { $sum: 1 } } },
    ])
    .toArray();
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = addDays(from, i);
    return { date, count: counts.get(date) ?? 0 };
  });
}

const toRestaurantRow = ({ _id, slug, name, city, status, createdAt, menu }, ownersById, bookingCounts) => ({
  id: _id.toString(),
  slug,
  name,
  city,
  status: status ?? "published",
  createdAt: iso(createdAt),
  dishCount: menu?.reduce((sum, category) => sum + category.items.length, 0) ?? 0,
  owners: ownersById,
  bookingCount: bookingCounts?.get(_id.toString()) ?? 0,
});

async function bookingCountsFor(ids) {
  const rows = await bookings()
    .aggregate([{ $match: { restaurantId: { $in: ids } } }, { $group: { _id: "$restaurantId", count: { $sum: 1 } } }])
    .toArray();
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

const toUserRef = ({ _id, name, email }) => ({ id: _id.toString(), name, email });

export async function getOverview() {
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [userCount, ownerIds, restaurantStatuses, weekBookings, totalBookings, userSeries, bookingSeries, latestRestaurants, latestUsers, latestLog] = await Promise.all([
    users().countDocuments({}),
    restaurants().distinct("ownerIds", { status: { $ne: "deleted" } }),
    restaurants().aggregate([{ $group: { _id: { $ifNull: ["$status", "published"] }, count: { $sum: 1 } } }]).toArray(),
    bookings().countDocuments({ createdAt: { $gte: weekAgo } }),
    bookings().countDocuments({}),
    dailyCounts(users()),
    dailyCounts(bookings()),
    restaurants().find({ createdAt: { $exists: true } }, { projection: { slug: 1, name: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    users().find({}, { projection: { name: 1, email: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    getLogPage({ page: 1, limit: 5 }),
  ]);
  const statuses = Object.fromEntries(restaurantStatuses.map((row) => [row._id, row.count]));
  return {
    userCount,
    ownerCount: ownerIds.length,
    restaurantCount: Object.values(statuses).reduce((sum, count) => sum + count, 0) - (statuses.deleted ?? 0),
    statuses,
    weekBookings,
    totalBookings,
    userSeries,
    bookingSeries,
    latestRestaurants: latestRestaurants.map(({ slug, name, status, createdAt }) => ({ slug, name, status: status ?? "published", createdAt: iso(createdAt) })),
    latestUsers: latestUsers.map((user) => ({ ...toUserRef(user), createdAt: iso(user.createdAt) })),
    latestLog: latestLog.entries,
  };
}

export async function getRestaurantsPage({ q, status, page }) {
  const current = pageOf(page);
  const filter = {};
  if (status === "published") filter.$or = [{ status: "published" }, { status: { $exists: false } }];
  else if (status) filter.status = status;
  if (q?.trim()) {
    const match = textMatch(q);
    const search = [{ slug: match }, { "name.ar": match }, { "name.en": match }, { "city.ar": match }, { "city.en": match }];
    filter.$and = [{ $or: search }];
  }
  const [total, docs] = await Promise.all([
    restaurants().countDocuments(filter),
    restaurants()
      .find(filter, { projection: { slug: 1, name: 1, city: 1, status: 1, createdAt: 1, ownerIds: 1, "menu.items.id": 1 } })
      .sort({ createdAt: -1, slug: 1 })
      .skip((current - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
  ]);
  const owners = await users().find({ _id: { $in: docs.flatMap((doc) => doc.ownerIds ?? []) } }, { projection: { name: 1, email: 1 } }).toArray();
  const counts = await bookingCountsFor(docs.map((doc) => doc._id));
  const rows = docs.map((doc) => {
    const docOwners = owners.filter((owner) => doc.ownerIds?.some((id) => id.equals(owner._id))).map(toUserRef);
    return toRestaurantRow(doc, docOwners, counts);
  });
  return { rows, total, page: current, pages: Math.max(Math.ceil(total / PAGE_SIZE), 1) };
}

export async function getRestaurantDetail(slug) {
  const doc = await restaurants().findOne({ slug });
  if (!doc) return null;
  const [owners, counts, recent] = await Promise.all([
    users().find({ _id: { $in: doc.ownerIds ?? [] } }, { projection: { name: 1, email: 1 } }).toArray(),
    bookingCountsFor([doc._id]),
    bookings().find({ restaurantId: doc._id }).sort({ startsAt: -1 }).limit(10).toArray(),
  ]);
  return {
    ...toRestaurantRow(doc, owners.map(toUserRef), counts),
    phone: doc.phone,
    address: doc.address,
    suspendedReason: doc.suspendedReason ?? null,
    suspendedByAccount: Boolean(doc.suspendedByAccount),
    bookingEnabled: Boolean(doc.booking?.enabled),
    recent: recent.map(toBookingRow),
  };
}

function toBookingRow({ _id, date, time, party, name, status, code, source, restaurantId }) {
  return { id: _id.toString(), date, time, party, name, status, code, source, restaurantId: restaurantId.toString() };
}

export async function getUsersPage({ q, type, page }) {
  const current = pageOf(page);
  const filter = {};
  if (q?.trim()) {
    const match = textMatch(q);
    filter.$or = [{ name: match }, { email: match }];
  }
  if (type === "admin") filter.role = "admin";
  if (type === "suspended") filter.suspendedAt = { $exists: true };
  if (type === "unverified") filter.emailVerifiedAt = null;
  if (type === "owner" || type === "customer") {
    const ownerIds = await restaurants().distinct("ownerIds", { status: { $ne: "deleted" } });
    filter._id = type === "owner" ? { $in: ownerIds } : { $nin: ownerIds };
    if (type === "customer") filter.role = { $ne: "admin" };
  }

  const [total, docs] = await Promise.all([
    users().countDocuments(filter),
    users()
      .find(filter, { projection: { name: 1, email: 1, role: 1, emailVerifiedAt: 1, googleId: 1, passwordHash: 1, suspendedAt: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .skip((current - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
  ]);
  const ids = docs.map((doc) => doc._id);
  const [ownedRows, bookingRows] = await Promise.all([
    restaurants().aggregate([{ $match: { ownerIds: { $in: ids }, status: { $ne: "deleted" } } }, { $unwind: "$ownerIds" }, { $group: { _id: "$ownerIds", count: { $sum: 1 } } }]).toArray(),
    bookings().aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", count: { $sum: 1 } } }]).toArray(),
  ]);
  const countOf = (rows, id) => rows.find((row) => row._id.equals(id))?.count ?? 0;
  const rows = docs.map((doc) => ({
    ...toUserRef(doc),
    role: doc.role ?? null,
    verified: Boolean(doc.emailVerifiedAt),
    hasPassword: Boolean(doc.passwordHash),
    googleLinked: Boolean(doc.googleId),
    suspended: Boolean(doc.suspendedAt),
    createdAt: iso(doc.createdAt),
    restaurantCount: countOf(ownedRows, doc._id),
    bookingCount: countOf(bookingRows, doc._id),
  }));
  return { rows, total, page: current, pages: Math.max(Math.ceil(total / PAGE_SIZE), 1) };
}

export async function getUserDetail(id) {
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  const _id = new ObjectId(id);
  const doc = await users().findOne({ _id }, { projection: { name: 1, email: 1, phone: 1, role: 1, emailVerifiedAt: 1, googleId: 1, passwordHash: 1, suspendedAt: 1, suspendedReason: 1, createdAt: 1 } });
  if (!doc) return null;
  const [owned, recent, sessions] = await Promise.all([
    restaurants().find({ ownerIds: _id }, { projection: { slug: 1, name: 1, status: 1 } }).sort({ createdAt: -1 }).toArray(),
    bookings().find({ userId: _id }).sort({ startsAt: -1 }).limit(10).toArray(),
    getDb().collection("sessions").countDocuments({ userId: _id, expiresAt: { $gt: new Date() } }),
  ]);
  const names = await restaurants().find({ _id: { $in: recent.map((item) => item.restaurantId) } }, { projection: { slug: 1, name: 1 } }).toArray();
  return {
    ...toUserRef(doc),
    phone: doc.phone ?? "",
    role: doc.role ?? null,
    verified: Boolean(doc.emailVerifiedAt),
    hasPassword: Boolean(doc.passwordHash),
    googleLinked: Boolean(doc.googleId),
    suspended: Boolean(doc.suspendedAt),
    suspendedReason: doc.suspendedReason ?? null,
    createdAt: iso(doc.createdAt),
    sessions,
    owned: owned.map(({ slug, name, status }) => ({ slug, name, status: status ?? "published" })),
    recent: recent.map((item) => {
      const place = names.find((restaurant) => restaurant._id.equals(item.restaurantId));
      return { ...toBookingRow(item), restaurantName: place?.name ?? null, slug: place?.slug ?? null };
    }),
  };
}

export async function getBookingsPage({ q, status, date, page }) {
  const current = pageOf(page);
  const filter = {};
  if (status) filter.status = status;
  if (date) filter.date = date;
  if (q?.trim()) {
    const match = textMatch(q);
    filter.$or = [{ code: q.trim().toUpperCase().slice(0, 12) }, { name: match }];
  }
  const [total, docs] = await Promise.all([
    bookings().countDocuments(filter),
    bookings().find(filter).sort({ startsAt: -1 }).skip((current - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
  ]);
  const names = await restaurants().find({ _id: { $in: docs.map((doc) => doc.restaurantId) } }, { projection: { slug: 1, name: 1 } }).toArray();
  const rows = docs.map((doc) => {
    const place = names.find((restaurant) => restaurant._id.equals(doc.restaurantId));
    return { ...toBookingRow(doc), restaurantName: place?.name ?? null, slug: place?.slug ?? null };
  });
  return { rows, total, page: current, pages: Math.max(Math.ceil(total / PAGE_SIZE), 1) };
}

export async function getLogPage({ targetType, page, limit = PAGE_SIZE }) {
  const current = pageOf(page);
  const filter = targetType ? { targetType } : {};
  const log = getDb().collection(ADMIN_LOG);
  const [total, docs] = await Promise.all([
    log.countDocuments(filter),
    log.find(filter).sort({ at: -1 }).skip((current - 1) * limit).limit(limit).toArray(),
  ]);
  const entries = docs.map(({ _id, actorEmail, action, targetType: type, targetId, targetLabel, detail, at }) => ({
    id: _id.toString(),
    actorEmail,
    action,
    targetType: type,
    targetId,
    targetLabel,
    detail: detail ?? null,
    at: iso(at),
  }));
  return { entries, total, page: current, pages: Math.max(Math.ceil(total / limit), 1) };
}
