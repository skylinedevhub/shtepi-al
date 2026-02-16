export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shtepial.al";
export const SITE_NAME = "ShtëpiAL";

export const PROPERTY_TYPE_SQ: Record<string, string> = {
  apartment: "Apartament",
  house: "Shtëpi",
  villa: "Vilë",
  land: "Truall",
  commercial: "Komercial",
  garage: "Garazh",
  studio: "Garsoniere",
};

export const PROPERTY_TYPE_EN: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  villa: "Villa",
  land: "Land",
  commercial: "Commercial",
  garage: "Garage",
  studio: "Studio",
};

export const TRANSACTION_TYPE_SQ: Record<string, string> = {
  sale: "Shitje",
  rent: "Qira",
};

export const TRANSACTION_TYPE_EN: Record<string, string> = {
  sale: "Sale",
  rent: "Rent",
};

export const TRANSACTION_TYPE_URL: Record<string, string> = {
  sale: "shitje",
  rent: "qira",
};

export const URL_TO_TRANSACTION: Record<string, string> = {
  shitje: "sale",
  qira: "rent",
};
