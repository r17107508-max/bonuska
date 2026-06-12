export type LoyaltyTemplate = {
  id: string;
  business: string;
  title: string;
  icon: string;
  goalCount: number;
  rewardTitle: string;
  rewardDescription: string;
  clientText: string;
  themeColor: string;
};

export const loyaltyTemplates: LoyaltyTemplate[] = [
  {
    id: "coffee",
    business: "Кофейня",
    title: "7-й кофе бесплатно",
    icon: "☕",
    goalCount: 6,
    rewardTitle: "7-й кофе бесплатно",
    rewardDescription: "Соберите 6 покупок и получите следующий кофе в подарок.",
    clientText: "Показывайте QR при каждой покупке кофе и заберите 7-й напиток бесплатно.",
    themeColor: "#0f766e",
  },
  {
    id: "shawarma",
    business: "Шаурмичная",
    title: "6-я шаурма в подарок",
    icon: "🌯",
    goalCount: 5,
    rewardTitle: "Шаурма в подарок",
    rewardDescription: "Соберите 5 покупок и получите 6-ю шаурму бесплатно.",
    clientText: "Покупайте шаурму, собирайте отметки и заберите подарок.",
    themeColor: "#b45309",
  },
  {
    id: "bakery",
    business: "Пекарня",
    title: "Выпечка за покупки",
    icon: "🥐",
    goalCount: 5,
    rewardTitle: "Выпечка в подарок",
    rewardDescription: "После 5 покупок подарим круассан, булочку или другую выпечку.",
    clientText: "Собирайте покупки и получите свежую выпечку в подарок.",
    themeColor: "#a16207",
  },
  {
    id: "drinks",
    business: "Напитки",
    title: "Напиток в подарок",
    icon: "🧋",
    goalCount: 6,
    rewardTitle: "Напиток в подарок",
    rewardDescription: "Соберите 6 покупок и получите напиток в подарок.",
    clientText: "Показывайте QR при покупке напитков и заберите подарок.",
    themeColor: "#7c3aed",
  },
  {
    id: "barbershop",
    business: "Барбершоп",
    title: "Скидка за визиты",
    icon: "💈",
    goalCount: 4,
    rewardTitle: "Скидка 20%",
    rewardDescription: "После 4 визитов получите скидку 20% на следующую услугу.",
    clientText: "Отмечайте визиты и получите скидку на следующую стрижку.",
    themeColor: "#1d4ed8",
  },
  {
    id: "fastfood",
    business: "Фастфуд",
    title: "Комбо-бонус",
    icon: "🍔",
    goalCount: 7,
    rewardTitle: "Бонус к заказу",
    rewardDescription: "После 7 покупок получите бонус к следующему заказу.",
    clientText: "Собирайте покупки и заберите бонус к заказу.",
    themeColor: "#dc2626",
  },
];

export function findLoyaltyTemplate(id?: string) {
  return loyaltyTemplates.find((template) => template.id === id);
}
