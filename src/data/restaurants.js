import { dishImages } from "@/data/dish-images";

// Mock restaurants until the database phase. Shape mirrors what the DB will return.
// opens/closes are Riyadh time and may pass midnight.
// accent is each restaurant's own color, used later by per-restaurant theming.
// Category ids end up in the URL (?category=mains); item ids name their photos.

const dish = (id, fields) => ({ id, image: dishImages[id] ?? null, tags: [], ...fields });

export const restaurants = [
  {
    slug: "bait-alkabsa",
    name: "بيت الكبسة",
    nameEn: "Bait Alkabsa",
    tagline: "كبسة على أصولها، ومندي يطيح من العظم، وطعم بيت الجدة.",
    cuisine: "أكل شعبي",
    city: "الرياض",
    address: "حي الملقا، طريق أنس بن مالك",
    phone: "+966 11 234 5678",
    hours: "يوميًا من 12 الظهر إلى 12 الليل",
    opens: "12:00",
    closes: "00:00",
    accent: "#C8553D",
    menu: [
      {
        id: "mains",
        name: "الأطباق الرئيسية",
        items: [
          dish("kabsa-lahm", { name: "كبسة لحم", description: "رز بسمتي بالبهارات الخاصة مع لحم حاشي طري.", price: 65, badge: "الأكثر طلبًا", tags: ["يكفي شخصين"] }),
          dish("mandi-dajaj", { name: "مندي دجاج", description: "نص دجاجة مدخّنة على الحطب مع رز المندي.", price: 42 }),
          dish("mathbi-lahm", { name: "مظبي لحم", description: "لحم مشوي على الحجر مع رز وصلصة دقوس.", price: 72, tags: ["حار"] }),
        ],
      },
      {
        id: "starters",
        name: "المقبلات",
        items: [
          dish("sambosa", { name: "سمبوسة", description: "خمس حبات بحشوة اللحم أو الجبن.", price: 18 }),
          dish("shorbat-hab", { name: "شوربة حب", description: "شوربة القمح الدافية على طريقة الأهل.", price: 14, tags: ["نباتي"] }),
        ],
      },
      {
        id: "desserts",
        name: "الحلا",
        items: [
          dish("qursan-asal", { name: "قرصان بالعسل", description: "قرصان رقيق مع عسل سدر وسمن بري.", price: 24, badge: "جديد" }),
          dish("kunafa", { name: "كنافة", description: "كنافة بالقشطة تنخدم حارة.", price: 22 }),
        ],
      },
    ],
  },
  {
    slug: "qahwat-najd",
    name: "قهوة نجد",
    nameEn: "Qahwat Najd",
    tagline: "قهوة سعودية مختصة، وتمر سكري، وجلسة تريّح البال.",
    cuisine: "كافيه",
    city: "بريدة",
    address: "حي الريان، شارع الملك عبدالعزيز",
    phone: "+966 16 345 6789",
    hours: "يوميًا من 6 الصبح إلى 1 الليل",
    opens: "06:00",
    closes: "01:00",
    accent: "#8A6A3B",
    menu: [
      {
        id: "coffee",
        name: "القهوة",
        items: [
          dish("dallah-qahwa", { name: "دلّة قهوة سعودية", description: "دلّة تكفي أربعة، بالهيل والزعفران.", price: 35, badge: "الأكثر طلبًا", tags: ["يكفي أربعة"] }),
          dish("v60", { name: "V60", description: "محصول إثيوبي بإيحاءات التوت.", price: 22 }),
          dish("spanish-latte", { name: "سبانش لاتيه", description: "إسبريسو مع حليب مكثّف محلّى.", price: 19 }),
        ],
      },
      {
        id: "sweets",
        name: "مع القهوة",
        items: [
          dish("tamr-sukkari", { name: "تمر سكري محشي", description: "ست حبات محشية بالمكسرات.", price: 16, tags: ["نباتي"] }),
          dish("date-cake", { name: "كيكة التمر", description: "كيكة دافية بصوص التوفي.", price: 21, badge: "جديد" }),
        ],
      },
    ],
  },
  {
    slug: "bahr-jeddah",
    name: "بحر جدة",
    nameEn: "Bahr Jeddah",
    tagline: "سمك طازج من سوق البنقلة كل يوم، تختاره ونطبخه لك.",
    cuisine: "مأكولات بحرية",
    city: "جدة",
    address: "الكورنيش الشمالي، حي الشاطئ",
    phone: "+966 12 456 7890",
    hours: "يوميًا من 1 الظهر إلى 1 الليل",
    opens: "13:00",
    closes: "01:00",
    accent: "#2F6F8F",
    menu: [
      {
        id: "seafood",
        name: "من البحر",
        items: [
          dish("hamour-mashwi", { name: "سمك هامور مشوي", description: "هامور كامل مشوي مع رز صيادية.", price: 95, badge: "الأكثر طلبًا", tags: ["يكفي شخصين"] }),
          dish("rubyan-maqli", { name: "روبيان مقلي", description: "روبيان جامبو مع صوص الطحينة.", price: 68 }),
          dish("najil-sayadiya", { name: "سمك ناجل صيادية", description: "قطع ناجل على رز الصيادية بالبصل المكرمل.", price: 74 }),
        ],
      },
      {
        id: "sides",
        name: "الإضافات",
        items: [
          dish("tabbouleh", { name: "تبولة", description: "بقدونس وطماطم وبرغل ناعم.", price: 18, tags: ["نباتي"] }),
          dish("batates-baharat", { name: "بطاطس بالبهارات", description: "بطاطس مقرمشة ببهارات البحر.", price: 15, tags: ["حار", "نباتي"] }),
        ],
      },
    ],
  },
];
