import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// Language-aware versions of Next's navigation APIs: <Link href="/styleguide">
// becomes /en/styleguide on English pages, and usePathname drops the prefix.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
