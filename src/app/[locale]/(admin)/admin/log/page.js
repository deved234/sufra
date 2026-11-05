import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getLogPage } from "@/lib/admin/data";
import { PageTitle, Pagination, ShortDate, Table } from "@/components/admin/admin-ui";

const TYPES = ["restaurant", "user"];

export default async function AdminLog({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const type = TYPES.includes(params.type) ? params.type : null;
  const [data, t] = await Promise.all([getLogPage({ targetType: type, page: params.page }), getTranslations("Admin")]);
  const query = type ? { type } : {};

  return (
    <>
      <PageTitle count={data.total}>{t("log")}</PageTitle>
      <nav aria-label={t("log")} className="flex flex-wrap gap-2 text-sm">
        {[null, ...TYPES].map((name) => (
          <Link
            key={name ?? "all"}
            href={{ pathname: "/admin/log", query: name ? { type: name } : {} }}
            aria-current={type === name ? "page" : undefined}
            className={`rounded-pill border px-3 py-1.5 font-medium ${type === name ? "border-brand bg-brand text-on-brand" : "border-border bg-surface hover:bg-surface-muted"}`}
          >
            {name ? t(name === "user" ? "users" : "restaurants") : t("logAll")}
          </Link>
        ))}
      </nav>
      <Table headers={[t("colWhen"), t("colAction"), t("colTarget"), t("colDetail"), t("colBy")]} empty={data.entries.length === 0 ? t("logEmpty") : null}>
        {data.entries.map((entry) => (
          <tr key={entry.id}>
            <td className="px-4 py-3">
              <ShortDate value={entry.at} />
            </td>
            <td className="px-4 py-3 font-semibold">{t.has(`actions.${entry.action}`) ? t(`actions.${entry.action}`) : entry.action}</td>
            <td className="px-4 py-3">
              <Link href={entry.targetType === "user" ? `/admin/users/${entry.targetId}` : `/admin/restaurants/${entry.targetId}`} className="hover:underline">
                {entry.targetLabel}
              </Link>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{entry.detail}</td>
            <td className="px-4 py-3" dir="ltr">
              {entry.actorEmail}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination pathname="/admin/log" query={query} page={data.page} pages={data.pages} />
    </>
  );
}
