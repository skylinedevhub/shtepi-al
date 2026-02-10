// Translation strings for English and Albanian video versions

export type Lang = "en" | "sq";

export const translations = {
  // Video 1: Launch Announcement
  launch: {
    tagline: {
      en: "Find Your Dream Home in Albania",
      sq: "Gjeni Shtepine e Endrrave ne Shqiperi",
    },
    subtitle: {
      en: "All Albanian real estate listings.\nOne powerful search.",
      sq: "Te gjitha njoftimet e pasurive te paluajtshme.\nNje kerkim i fuqishem.",
    },
    feature1Title: {
      en: "Thousands of Listings",
      sq: "Mijera Njoftime",
    },
    feature1Desc: {
      en: "Aggregated from 4+ top Albanian classifieds sites",
      sq: "Te mbledhura nga 4+ faqet kryesore shqiptare",
    },
    feature2Title: {
      en: "Smart Search",
      sq: "Kerkim Inteligjent",
    },
    feature2Desc: {
      en: "Filter by city, price, type, rooms and more",
      sq: "Filtro sipas qytetit, cmimit, llojit, dhomave e me shume",
    },
    feature3Title: {
      en: "Interactive Map",
      sq: "Harta Interaktive",
    },
    feature3Desc: {
      en: "Browse properties on a live map of Albania",
      sq: "Shfletoni pronat ne harten e Shqiperise",
    },
    cta: {
      en: "Visit shtepial.com",
      sq: "Vizitoni shtepial.com",
    },
    nowLive: {
      en: "Now Live",
      sq: "Tani Online",
    },
  },

  // Video 2: How It Works
  howItWorks: {
    title: {
      en: "How It Works",
      sq: "Si Funksionon",
    },
    step1Title: {
      en: "Search",
      sq: "Kerkoni",
    },
    step1Desc: {
      en: "Type any neighborhood, city, or keyword",
      sq: "Shkruani lagjen, qytetin, ose fjalekyc",
    },
    step2Title: {
      en: "Filter",
      sq: "Filtroni",
    },
    step2Desc: {
      en: "Narrow down by price, rooms, type & more",
      sq: "Ngushtoni sipas cmimit, dhomave, llojit & me shume",
    },
    step3Title: {
      en: "Explore",
      sq: "Eksploroni",
    },
    step3Desc: {
      en: "View on grid or interactive map",
      sq: "Shikoni ne rrjet ose ne harte interaktive",
    },
    step4Title: {
      en: "Connect",
      sq: "Kontaktoni",
    },
    step4Desc: {
      en: "Contact the seller or agency directly",
      sq: "Kontaktoni shitesin ose agjencine direkt",
    },
    tagline: {
      en: "Your home search, simplified.",
      sq: "Kerkimi juaj per shtepi, i thjeshtuar.",
    },
  },

  // Video 3: Stats & Sources
  stats: {
    title: {
      en: "Albania's Largest Property Search",
      sq: "Kerkimi me i Madh i Pronave ne Shqiperi",
    },
    listingsLabel: {
      en: "Total Listings",
      sq: "Gjithsej Njoftime",
    },
    citiesLabel: {
      en: "Cities Covered",
      sq: "Qytete te Mbuluara",
    },
    sourcesLabel: {
      en: "Data Sources",
      sq: "Burime te Dhenash",
    },
    updatedLabel: {
      en: "Updated Daily",
      sq: "Perditesim Ditor",
    },
    sourcesTitle: {
      en: "We aggregate from",
      sq: "Ne mbledhim nga",
    },
    source1: {
      en: "MerrJep.al",
      sq: "MerrJep.al",
    },
    source2: {
      en: "GazetaCelesi.al",
      sq: "GazetaCelesi.al",
    },
    source3: {
      en: "Mirlir.com",
      sq: "Mirlir.com",
    },
    source4: {
      en: "Njoftime.com",
      sq: "Njoftime.com",
    },
    tagline: {
      en: "One search. Every listing.",
      sq: "Nje kerkim. Cdo njoftim.",
    },
  },

  // Shared
  shared: {
    logoShtëpi: {
      en: "Shtepi",
      sq: "Shtepi",
    },
    logoAL: {
      en: "AL",
      sq: "AL",
    },
  },
} as const;

export function t(
  section: keyof typeof translations,
  key: string,
  lang: Lang
): string {
  const sectionData = translations[section] as Record<
    string,
    Record<Lang, string>
  >;
  return sectionData[key]?.[lang] ?? key;
}
