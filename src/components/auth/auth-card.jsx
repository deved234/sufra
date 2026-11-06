import { Link } from "@/i18n/navigation";

// The card around the sign-in and sign-up forms
export default function AuthCard({ title, lead, children }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-md sm:p-8">
      <h1 className="font-display text-h2 font-extrabold">{title}</h1>
      <p className="mb-6 mt-1 text-muted-foreground">{lead}</p>
      {children}
    </div>
  );
}

// Between the customers' and the restaurant owners' entrances, for anyone at the wrong one
export function EntrySwitch({ prompt, label, href }) {
  return (
    <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-brand-text hover:underline">
        {label}
      </Link>
    </p>
  );
}
