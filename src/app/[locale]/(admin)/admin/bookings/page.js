import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getBookingsPage } from "@/lib/admin/data";
import { isValidDate, formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import { FilterForm, PageTitle, Pagination, Table } from "@/components/admin/admin-ui";

const STATUSES = ["confirmed", "seated", "completed", "noShow", "cancelled"];

export default async function AdminBookings({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const query = {
    ...(typeof params.q === "string" && params.q && { q: params.q }),
    ...(STATUSES.includes(params.status) && { status: params.status }),
    ...(typeof params.date === "string" && isValidDate(params.date) && { date: params.date }),
  };
  const [data, t, statusT, locale] = await Promise.all([getBookingsPage({ ...query, page: params.page }), getTranslations("Admin"), getTranslations("Booking.status"), getLocale()]);

  return (
    <>
      <PageTitle count={data.total}>{t("bookings")}</PageTitle>
      <FilterForm query={query} placeholder={t("searchBookings")} date selects={[{ name: "status", label: t("allStatuses"), options: STATUSES.map((name) => [name, statusT(name)]) }]} />
      <Table headers={[t("colCode"), t("colRestaurant"), t("colCustomer"), t("colWhen"), t("colGuests"), t("colStatus")]} empty={data.rows.length === 0 ? t("noResults") : null}>
        {data.rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3 font-mono" dir="ltr">
              {row.code}
            </td>
            <td className="px-4 py-3">
              {row.slug ? (
                <Link href={`/admin/restaurants/${row.slug}`} className="font-semibold hover:underline">
                  {row.restaurantName[locale]}
                </Link>
              ) : (
                "–"
              )}
            </td>
            <td className="px-4 py-3">{row.name}</td>
            <td className="whitespace-nowrap px-4 py-3">
              {formatDate(row.date, locale, { day: "numeric", month: "short" })} · {formatTime(row.time, locale)}
            </td>
            <td className="px-4 py-3">{row.party}</td>
            <td className="px-4 py-3">
              {row.slug ? (
                <Link href={{ pathname: `/dashboard/${row.slug}/bookings`, query: { date: row.date } }} className="hover:underline">
                  {statusT(row.status)}
                </Link>
              ) : (
                statusT(row.status)
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination pathname="/admin/bookings" query={query} page={data.page} pages={data.pages} />
    </>
  );
}
