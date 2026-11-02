import { useTranslations } from "next-intl";

const badgeStyles = {
  popular: "bg-brand-soft text-on-brand-soft",
  new: "bg-info-soft text-info",
};

// Badge ("most popular", "new") and tags ("spicy", "serves 2"), shared by the
// menu card and the dish details
export default function DishTags({ dish, className = "" }) {
  const t = useTranslations("Menu");
  if (!dish.badge && dish.tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {dish.badge && (
        <span className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${badgeStyles[dish.badge]}`}>
          {t(`badges.${dish.badge}`)}
        </span>
      )}
      {dish.tags.map((tag) => (
        <span key={tag} className="rounded-pill border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {t(`tags.${tag}`)}
        </span>
      ))}
    </div>
  );
}
