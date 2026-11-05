import { useTranslations } from "next-intl";

const STYLES = {
  confirmed: "bg-success-soft text-success",
  seated: "bg-success-soft text-success",
  completed: "bg-surface-muted text-muted-foreground",
  noShow: "bg-danger-soft text-danger",
  cancelled: "bg-danger-soft text-danger",
};

export default function StatusBadge({ status }) {
  const t = useTranslations("Booking.status");
  return <span className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold ${STYLES[status]}`}>{t(status)}</span>;
}
