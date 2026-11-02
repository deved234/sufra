import { getTranslations } from "next-intl/server";
import Logo, { LogoMark } from "@/components/logo";

// Visual reference for the design system. Kept out of search results.
export async function generateMetadata() {
  const t = await getTranslations("Styleguide");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

const colorTokens = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "surface-muted", className: "bg-surface-muted" },
  { name: "surface-tint", className: "bg-surface-tint" },
  { name: "foreground", className: "bg-foreground" },
  { name: "muted-foreground", className: "bg-muted-foreground" },
  { name: "border", className: "bg-border" },
  { name: "brand", className: "bg-brand" },
  { name: "brand-text", className: "bg-brand-text" },
  { name: "brand-soft", className: "bg-brand-soft" },
  { name: "cta", className: "bg-cta" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
  { name: "info", className: "bg-info" },
];

const statusBadges = [
  { label: "متاح", className: "bg-success-soft text-success" },
  { label: "باقي 3 طاولات", className: "bg-warning-soft text-warning" },
  { label: "مغلق اليوم", className: "bg-danger-soft text-danger" },
  { label: "جديد", className: "bg-info-soft text-info" },
  { label: "الأكثر طلبًا", className: "bg-brand-soft text-on-brand-soft" },
];

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-h3 font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

// The samples show Arabic typography, so the content stays Arabic and RTL
// even at /en/styleguide. Only the site header and footer switch language.
export default function StyleGuidePage() {
  return (
    <div lang="ar" dir="rtl">
      <header className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-20">
          <span className="text-sm font-semibold text-brand-text">Style guide · سُفرة</span>
          <h1 className="font-display text-display font-extrabold">موقع مطعمك جاهز في دقائق</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            منيو بـ QR، وحجز طاولات، ولوحة تحكم سهلة. <bdi>Your restaurant online in minutes.</bdi>
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#"
              className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
            >
              ابدأ مجانًا
            </a>
            <a
              href="#"
              className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
            >
              شوف مثال
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <p className="text-muted-foreground">جرّب الوضع الداكن من الأعلى، كل الألوان تتغيّر من مكان واحد.</p>

        <Section title="الشعار">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-center rounded-lg border border-border bg-surface p-10">
              <Logo size="lg" gap="var(--surface)" />
            </div>
            <div className="flex items-end justify-center gap-6 rounded-lg border border-border bg-surface p-10" dir="ltr">
              {["h-24", "h-12", "h-8", "h-4"].map((h) => (
                <LogoMark key={h} gap="var(--surface)" className={`${h} w-auto`} />
              ))}
            </div>
          </div>
        </Section>

        <Section title="الألوان">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {colorTokens.map((token) => (
              <div key={token.name} className="flex flex-col gap-2">
                <div className={`h-16 rounded-md border border-border ${token.className}`} />
                <code className="text-xs text-muted-foreground" dir="ltr">
                  {token.name}
                </code>
              </div>
            ))}
          </div>
        </Section>

        <Section title="الخطوط">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
            <p className="font-display text-h1 font-extrabold">Alexandria · احجز طاولتك</p>
            <p className="font-display text-h2 font-extrabold">عنوان المستوى الثاني</p>
            <p className="font-display text-h3 font-extrabold">عنوان المستوى الثالث</p>
            <p className="text-lg">
              نص أساسي بخط IBM Plex Sans Arabic، والكلام الإنجليزي مثل Table booking يظهر بخط Inter
              تلقائيًا.
            </p>
            <p className="text-muted-foreground">نص ثانوي للتفاصيل والوصف.</p>
          </div>
        </Section>

        <Section title="الأزرار">
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
              CTA
            </button>
            <button className="rounded-pill bg-brand px-6 py-3 font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-hover">
              احجز الآن
            </button>
            <button className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted">
              المنيو
            </button>
            <button className="rounded-pill px-6 py-3 font-semibold text-brand-text transition-colors duration-150 hover:bg-brand-soft">
              إلغاء
            </button>
          </div>
        </Section>

        <Section title="البادجات">
          <div className="flex flex-wrap gap-2">
            {statusBadges.map((badge) => (
              <span
                key={badge.label}
                className={`rounded-pill px-3 py-1 text-sm font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </Section>

        <Section title="الكروت والظلال">
          <div className="grid gap-4 sm:grid-cols-3">
            {["shadow-sm", "shadow-md", "shadow-lg"].map((shadow) => (
              <article
                key={shadow}
                className={`flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 ${shadow}`}
              >
                <span className="self-start rounded-pill bg-brand-soft px-3 py-1 text-xs font-medium text-on-brand-soft">
                  {shadow}
                </span>
                <h3 className="font-semibold">بيتزا مارجريتا</h3>
                <p className="text-sm text-muted-foreground">صلصة طماطم، موتزاريلا، وريحان طازج.</p>
                <p className="font-semibold text-brand-text">45 ر.س</p>
              </article>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
