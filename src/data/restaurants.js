import { dishImages } from "@/data/dish-images";

// Mock restaurants until the database phase. Shape mirrors what the DB will return.
// Text the owner writes is stored in both languages ({ ar, en }); lib/restaurants.js
// picks one. Badges and tags are fixed keys, translated in messages/*.json.
// opens/closes are Riyadh time and may pass midnight.
// accent is each restaurant's own color, used by per-restaurant theming.
// Category ids end up in the URL (?category=mains); item ids name their photos.

const dish = (id, fields) => ({ id, image: dishImages[id] ?? null, tags: [], ...fields });

export const restaurants = [
  {
    slug: "bait-alkabsa",
    name: { ar: "بيت الكبسة", en: "Bait Alkabsa" },
    tagline: {
      ar: "كبسة على أصولها، ومندي يطيح من العظم، وطعم بيت الجدة.",
      en: "Kabsa done the proper way, mandi that falls off the bone, and the taste of grandma's house.",
    },
    cuisine: { ar: "أكل شعبي", en: "Saudi home cooking" },
    city: { ar: "الرياض", en: "Riyadh" },
    address: { ar: "حي الملقا، طريق أنس بن مالك", en: "Al Malqa, Anas Bin Malik Road" },
    phone: "+966 11 234 5678",
    hours: { ar: "يوميًا من 12 الظهر إلى 12 الليل", en: "Daily, noon to midnight" },
    opens: "12:00",
    closes: "00:00",
    accent: "#C8553D",
    menu: [
      {
        id: "mains",
        name: { ar: "الأطباق الرئيسية", en: "Mains" },
        items: [
          dish("kabsa-lahm", {
            name: { ar: "كبسة لحم", en: "Lamb kabsa" },
            description: {
              ar: "رز بسمتي بالبهارات الخاصة مع لحم حاشي طري.",
              en: "Basmati rice in our house spices with tender young camel meat.",
            },
            price: 65,
            badge: "popular",
            tags: ["serves2"],
          }),
          dish("mandi-dajaj", {
            name: { ar: "مندي دجاج", en: "Chicken mandi" },
            description: {
              ar: "نص دجاجة مدخّنة على الحطب مع رز المندي.",
              en: "Half a chicken smoked over wood, with mandi rice.",
            },
            price: 42,
          }),
          dish("mathbi-lahm", {
            name: { ar: "مظبي لحم", en: "Lamb mathbi" },
            description: {
              ar: "لحم مشوي على الحجر مع رز وصلصة دقوس.",
              en: "Meat grilled on hot stone, with rice and daqoos tomato sauce.",
            },
            price: 72,
            tags: ["spicy"],
          }),
        ],
      },
      {
        id: "starters",
        name: { ar: "المقبلات", en: "Starters" },
        items: [
          dish("sambosa", {
            name: { ar: "سمبوسة", en: "Sambosa" },
            description: { ar: "خمس حبات بحشوة اللحم أو الجبن.", en: "Five pieces, filled with meat or cheese." },
            price: 18,
          }),
          dish("shorbat-hab", {
            name: { ar: "شوربة حب", en: "Wheat soup" },
            description: {
              ar: "شوربة القمح الدافية على طريقة الأهل.",
              en: "Warm cracked-wheat soup, the way families make it.",
            },
            price: 14,
            tags: ["vegetarian"],
          }),
        ],
      },
      {
        id: "desserts",
        name: { ar: "الحلا", en: "Desserts" },
        items: [
          dish("qursan-asal", {
            name: { ar: "قرصان بالعسل", en: "Qursan with honey" },
            description: {
              ar: "قرصان رقيق مع عسل سدر وسمن بري.",
              en: "Thin qursan bread with sidr honey and wild ghee.",
            },
            price: 24,
            badge: "new",
          }),
          dish("kunafa", {
            name: { ar: "كنافة", en: "Kunafa" },
            description: { ar: "كنافة بالقشطة تنخدم حارة.", en: "Cream-filled kunafa, served hot." },
            price: 22,
          }),
        ],
      },
    ],
  },
  {
    slug: "qahwat-najd",
    name: { ar: "قهوة نجد", en: "Qahwat Najd" },
    tagline: {
      ar: "قهوة سعودية مختصة، وتمر سكري، وجلسة تريّح البال.",
      en: "Specialty Saudi coffee, sukkari dates, and a place to slow down.",
    },
    cuisine: { ar: "كافيه", en: "Café" },
    city: { ar: "بريدة", en: "Buraydah" },
    address: { ar: "حي الريان، شارع الملك عبدالعزيز", en: "Al Rayyan, King Abdulaziz Street" },
    phone: "+966 16 345 6789",
    hours: { ar: "يوميًا من 6 الصبح إلى 1 الليل", en: "Daily, 6 am to 1 am" },
    opens: "06:00",
    closes: "01:00",
    accent: "#8A6A3B",
    menu: [
      {
        id: "coffee",
        name: { ar: "القهوة", en: "Coffee" },
        items: [
          dish("dallah-qahwa", {
            name: { ar: "دلّة قهوة سعودية", en: "Dallah of Saudi coffee" },
            description: { ar: "دلّة تكفي أربعة، بالهيل والزعفران.", en: "A dallah for four, with cardamom and saffron." },
            price: 35,
            badge: "popular",
            tags: ["serves4"],
          }),
          dish("v60", {
            name: { ar: "V60", en: "V60" },
            description: { ar: "محصول إثيوبي بإيحاءات التوت.", en: "Ethiopian single origin with berry notes." },
            price: 22,
          }),
          dish("spanish-latte", {
            name: { ar: "سبانش لاتيه", en: "Spanish latte" },
            description: { ar: "إسبريسو مع حليب مكثّف محلّى.", en: "Espresso with sweetened condensed milk." },
            price: 19,
          }),
        ],
      },
      {
        id: "sweets",
        name: { ar: "مع القهوة", en: "With your coffee" },
        items: [
          dish("tamr-sukkari", {
            name: { ar: "تمر سكري محشي", en: "Stuffed sukkari dates" },
            description: { ar: "ست حبات محشية بالمكسرات.", en: "Six dates stuffed with nuts." },
            price: 16,
            tags: ["vegetarian"],
          }),
          dish("date-cake", {
            name: { ar: "كيكة التمر", en: "Date cake" },
            description: { ar: "كيكة دافية بصوص التوفي.", en: "Warm cake with toffee sauce." },
            price: 21,
            badge: "new",
          }),
        ],
      },
    ],
  },
  {
    slug: "bahr-jeddah",
    name: { ar: "بحر جدة", en: "Bahr Jeddah" },
    tagline: {
      ar: "سمك طازج من سوق البنقلة كل يوم، تختاره ونطبخه لك.",
      en: "Fresh fish from Al Bangala market every day. You pick it, we cook it.",
    },
    cuisine: { ar: "مأكولات بحرية", en: "Seafood" },
    city: { ar: "جدة", en: "Jeddah" },
    address: { ar: "الكورنيش الشمالي، حي الشاطئ", en: "North Corniche, Al Shati" },
    phone: "+966 12 456 7890",
    hours: { ar: "يوميًا من 1 الظهر إلى 1 الليل", en: "Daily, 1 pm to 1 am" },
    opens: "13:00",
    closes: "01:00",
    accent: "#2F6F8F",
    menu: [
      {
        id: "seafood",
        name: { ar: "من البحر", en: "From the sea" },
        items: [
          dish("hamour-mashwi", {
            name: { ar: "سمك هامور مشوي", en: "Grilled hamour" },
            description: { ar: "هامور كامل مشوي مع رز صيادية.", en: "A whole grilled hamour with sayadiyah rice." },
            price: 95,
            badge: "popular",
            tags: ["serves2"],
          }),
          dish("rubyan-maqli", {
            name: { ar: "روبيان مقلي", en: "Fried shrimp" },
            description: { ar: "روبيان جامبو مع صوص الطحينة.", en: "Jumbo shrimp with tahini sauce." },
            price: 68,
          }),
          dish("najil-sayadiya", {
            name: { ar: "سمك ناجل صيادية", en: "Najil sayadiyah" },
            description: {
              ar: "قطع ناجل على رز الصيادية بالبصل المكرمل.",
              en: "Najil fish on sayadiyah rice with caramelized onions.",
            },
            price: 74,
          }),
        ],
      },
      {
        id: "sides",
        name: { ar: "الإضافات", en: "Sides" },
        items: [
          dish("tabbouleh", {
            name: { ar: "تبولة", en: "Tabbouleh" },
            description: { ar: "بقدونس وطماطم وبرغل ناعم.", en: "Parsley, tomato and fine bulgur." },
            price: 18,
            tags: ["vegetarian"],
          }),
          dish("batates-baharat", {
            name: { ar: "بطاطس بالبهارات", en: "Spiced fries" },
            description: { ar: "بطاطس مقرمشة ببهارات البحر.", en: "Crispy fries with seaside spices." },
            price: 15,
            tags: ["spicy", "vegetarian"],
          }),
        ],
      },
    ],
  },
];
