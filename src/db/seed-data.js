// The three demo restaurants, written into MongoDB by `npm run db:seed`.
// Shape matches a document in the restaurants collection (validated by src/db/schema.js):
// owner-written text in both languages ({ ar, en }), prices in halalas (65 SAR is
// 6500) so money is never a float, and the menu embedded in display order.
// Badges and tags are fixed keys translated in messages/*.json; a dish id also
// names its photo in src/assets/dishes.

export const seedRestaurants = [
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
          {
            id: "kabsa-lahm",
            name: { ar: "كبسة لحم", en: "Lamb kabsa" },
            description: {
              ar: "رز بسمتي بالبهارات الخاصة مع لحم حاشي طري.",
              en: "Basmati rice in our house spices with tender young camel meat.",
            },
            priceHalalas: 6500,
            badge: "popular",
            tags: ["serves2"],
          },
          {
            id: "mandi-dajaj",
            name: { ar: "مندي دجاج", en: "Chicken mandi" },
            description: {
              ar: "نص دجاجة مدخّنة على الحطب مع رز المندي.",
              en: "Half a chicken smoked over wood, with mandi rice.",
            },
            priceHalalas: 4200,
          },
          {
            id: "mathbi-lahm",
            name: { ar: "مظبي لحم", en: "Lamb mathbi" },
            description: {
              ar: "لحم مشوي على الحجر مع رز وصلصة دقوس.",
              en: "Meat grilled on hot stone, with rice and daqoos tomato sauce.",
            },
            priceHalalas: 7200,
            tags: ["spicy"],
          },
        ],
      },
      {
        id: "starters",
        name: { ar: "المقبلات", en: "Starters" },
        items: [
          {
            id: "sambosa",
            name: { ar: "سمبوسة", en: "Sambosa" },
            description: { ar: "خمس حبات بحشوة اللحم أو الجبن.", en: "Five pieces, filled with meat or cheese." },
            priceHalalas: 1800,
          },
          {
            id: "shorbat-hab",
            name: { ar: "شوربة حب", en: "Wheat soup" },
            description: {
              ar: "شوربة القمح الدافية على طريقة الأهل.",
              en: "Warm cracked-wheat soup, the way families make it.",
            },
            priceHalalas: 1400,
            tags: ["vegetarian"],
          },
        ],
      },
      {
        id: "desserts",
        name: { ar: "الحلا", en: "Desserts" },
        items: [
          {
            id: "qursan-asal",
            name: { ar: "قرصان بالعسل", en: "Qursan with honey" },
            description: {
              ar: "قرصان رقيق مع عسل سدر وسمن بري.",
              en: "Thin qursan bread with sidr honey and wild ghee.",
            },
            priceHalalas: 2400,
            badge: "new",
          },
          {
            id: "kunafa",
            name: { ar: "كنافة", en: "Kunafa" },
            description: { ar: "كنافة بالقشطة تنخدم حارة.", en: "Cream-filled kunafa, served hot." },
            priceHalalas: 2200,
          },
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
          {
            id: "dallah-qahwa",
            name: { ar: "دلّة قهوة سعودية", en: "Dallah of Saudi coffee" },
            description: { ar: "دلّة تكفي أربعة، بالهيل والزعفران.", en: "A dallah for four, with cardamom and saffron." },
            priceHalalas: 3500,
            badge: "popular",
            tags: ["serves4"],
          },
          {
            id: "v60",
            name: { ar: "V60", en: "V60" },
            description: { ar: "محصول إثيوبي بإيحاءات التوت.", en: "Ethiopian single origin with berry notes." },
            priceHalalas: 2200,
          },
          {
            id: "spanish-latte",
            name: { ar: "سبانش لاتيه", en: "Spanish latte" },
            description: { ar: "إسبريسو مع حليب مكثّف محلّى.", en: "Espresso with sweetened condensed milk." },
            priceHalalas: 1900,
          },
        ],
      },
      {
        id: "sweets",
        name: { ar: "مع القهوة", en: "With your coffee" },
        items: [
          {
            id: "tamr-sukkari",
            name: { ar: "تمر سكري محشي", en: "Stuffed sukkari dates" },
            description: { ar: "ست حبات محشية بالمكسرات.", en: "Six dates stuffed with nuts." },
            priceHalalas: 1600,
            tags: ["vegetarian"],
          },
          {
            id: "date-cake",
            name: { ar: "كيكة التمر", en: "Date cake" },
            description: { ar: "كيكة دافية بصوص التوفي.", en: "Warm cake with toffee sauce." },
            priceHalalas: 2100,
            badge: "new",
          },
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
          {
            id: "hamour-mashwi",
            name: { ar: "سمك هامور مشوي", en: "Grilled hamour" },
            description: { ar: "هامور كامل مشوي مع رز صيادية.", en: "A whole grilled hamour with sayadiyah rice." },
            priceHalalas: 9500,
            badge: "popular",
            tags: ["serves2"],
          },
          {
            id: "rubyan-maqli",
            name: { ar: "روبيان مقلي", en: "Fried shrimp" },
            description: { ar: "روبيان جامبو مع صوص الطحينة.", en: "Jumbo shrimp with tahini sauce." },
            priceHalalas: 6800,
          },
          {
            id: "najil-sayadiya",
            name: { ar: "سمك ناجل صيادية", en: "Najil sayadiyah" },
            description: {
              ar: "قطع ناجل على رز الصيادية بالبصل المكرمل.",
              en: "Najil fish on sayadiyah rice with caramelized onions.",
            },
            priceHalalas: 7400,
          },
        ],
      },
      {
        id: "sides",
        name: { ar: "الإضافات", en: "Sides" },
        items: [
          {
            id: "tabbouleh",
            name: { ar: "تبولة", en: "Tabbouleh" },
            description: { ar: "بقدونس وطماطم وبرغل ناعم.", en: "Parsley, tomato and fine bulgur." },
            priceHalalas: 1800,
            tags: ["vegetarian"],
          },
          {
            id: "batates-baharat",
            name: { ar: "بطاطس بالبهارات", en: "Spiced fries" },
            description: { ar: "بطاطس مقرمشة ببهارات البحر.", en: "Crispy fries with seaside spices." },
            priceHalalas: 1500,
            tags: ["spicy", "vegetarian"],
          },
        ],
      },
    ],
  },
];
