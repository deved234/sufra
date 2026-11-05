import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getUsersPage } from "@/lib/admin/data";
import { FilterForm, PageTitle, Pagination, ShortDate, Table } from "@/components/admin/admin-ui";

const TYPES = ["customer", "owner", "admin", "suspended", "unverified"];

export default async function AdminUsers({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const query = {
    ...(typeof params.q === "string" && params.q && { q: params.q }),
    ...(TYPES.includes(params.type) && { type: params.type }),
  };
  const [data, t] = await Promise.all([getUsersPage({ ...query, page: params.page }), getTranslations("Admin")]);

  const kind = (row) => (row.role === "admin" ? t("type.admin") : row.restaurantCount > 0 ? t("type.owner") : t("type.customer"));

  return (
    <>
      <PageTitle count={data.total}>{t("users")}</PageTitle>
      <FilterForm query={query} placeholder={t("searchUsers")} selects={[{ name: "type", label: t("allUsers"), options: TYPES.map((name) => [name, t(`type.${name}`)]) }]} />
      <Table
        headers={[t("colName"), t("colKind"), t("colSignIn"), t("colRestaurants"), t("colBookings"), t("colState"), t("colCreated")]}
        empty={data.rows.length === 0 ? t("noResults") : null}
      >
        {data.rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/users/${row.id}`} className="font-semibold hover:underline">
                {row.name}
              </Link>
              <div className="text-xs text-muted-foreground" dir="ltr">
                {row.email}
              </div>
            </td>
            <td className="px-4 py-3">{kind(row)}</td>
            <td className="px-4 py-3">{[row.hasPassword && t("signInPassword"), row.googleLinked && "Google"].filter(Boolean).join(" · ")}</td>
            <td className="px-4 py-3">{row.restaurantCount}</td>
            <td className="px-4 py-3">{row.bookingCount}</td>
            <td className="px-4 py-3">
              {row.suspended ? <span className="font-semibold text-danger">{t("type.suspended")}</span> : row.verified ? t("verified") : <span className="text-muted-foreground">{t("type.unverified")}</span>}
            </td>
            <td className="px-4 py-3">
              <ShortDate value={row.createdAt} />
            </td>
          </tr>
        ))}
      </Table>
      <Pagination pathname="/admin/users" query={query} page={data.page} pages={data.pages} />
    </>
  );
}
