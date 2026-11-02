import { Inter, IBM_Plex_Sans_Arabic, Alexandria } from "next/font/google";

// Shared by the root layout and global-not-found.js, which renders without it

// Latin text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
});

// Display headings, Arabic and Latin
const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
});

export const fontVariables = `${inter.variable} ${plexArabic.variable} ${alexandria.variable}`;

// Runs before the first paint so the saved theme never flashes
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;
