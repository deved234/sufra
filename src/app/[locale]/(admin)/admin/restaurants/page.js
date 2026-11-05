import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getRestaurantsPage } from "@/lib/admin/data";
import { FilterForm, PageTitle, Pagination, RestaurantStatus, ShortDate, Table } from "@/components/admin/admin-ui";

const STATUSES = ["published", "draft", "hidden", "suspended", "deleted"];

export default async function AdminRestaurants({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const query = {
    ...(typeof params.q === "string" && params.q && { q: params.q }),
    ...(STATUSES.includes(params.status) && { status: params.status }),
  };
  const [data, t, status, locale] = await Promise.all([getRestaurantsPage({ ...query, page: params.page }), getTranslations("Admin"), getTranslations("Admin.status"), getLocale()]);

  return (
    <>
      <PageTitle count={data.total}>{t("restaurants")}</PageTitle>
      <FilterForm
        query={query}
        placeholder={t("searchRestaurants")}
        selects={[{ name: "status", label: t("allStatuses"), options: STATUSES.map((name) => [name, status(name)]) }]}
      />
      <Table
        headers={[t("colName"), t("colOwner"), t("colCity"), t("colStatus"), t("colDishes"), t("colBookings"), t("colCreated")]}
        empty={data.rows.length === 0 ? t("noResults") : null}
      >
        {data.rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/restaurants/${row.slug}`} className="font-semibold hover:underline">
                {row.name[locale]}
              </Link>
              <div className="text-xs text-muted-foreground" dir="ltr">
                /r/{row.slug}
              </div>
            </td>
            <td className="px-4 py-3">
              {row.owners.length === 0 && <span className="text-muted-foreground">{t("noOwner")}</span>}
              {row.owners.map((owner) => (
                <Link key={owner.id} href={`/admin/users/${owner.id}`} className="block hover:underline">
                  {owner.name}
                </Link>
              ))}
            </td>
            <td className="px-4 py-3">{row.city[locale]}</td>
            <td className="px-4 py-3">
              <RestaurantStatus status={row.status} />
            </td>
            <td className="px-4 py-3">{row.dishCount}</td>
            <td className="px-4 py-3">{row.bookingCount}</td>
            <td className="px-4 py-3">
              <ShortDate value={row.createdAt} />
            </td>
          </tr>
        ))}
      </Table>
      <Pagination pathname="/admin/restaurants" query={query} page={data.page} pages={data.pages} />
    </>
  );
}
