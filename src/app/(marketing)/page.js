import Link from "next/link";

// Starter landing page: the hero only. The full landing page comes in its own phase.
export default function HomePage() {
  return (
    <section className="bg-surface-tint">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-24 md:py-32">
        <span className="text-sm font-semibold text-brand-text">لأصحاب المطاعم والكافيهات</span>
        <h1 className="max-w-3xl font-display text-h1 font-extrabold md:text-display">موقع مطعمك جاهز في دقائق</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          منيو بـ QR يفتح من جوال العميل، وحجز طاولات بدون اتصالات، ولوحة تحكم تعدّل منها كل شي بنفسك.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="#"
            className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
          >
            ابدأ مجانًا
          </a>
          <Link
            href="/styleguide"
            className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
          >
            شوف دليل التصميم
          </Link>
        </div>
      </div>
    </section>
  );
}
