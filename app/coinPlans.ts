export type CoinChargePlan = {
  id: string;
  coins: number;
  price: number;
  bonus?: string;
};

export const COIN_CHARGE_PLANS: readonly CoinChargePlan[] = [
  { id: "coins_100", coins: 100, price: 140 },
  { id: "coins_300", coins: 300, price: 420 },
  { id: "coins_500", coins: 500, price: 700 },
  { id: "coins_700", coins: 700, price: 980 },
  { id: "coins_1030", coins: 1030, price: 1400, bonus: "30コインお得！" },
  { id: "coins_2070", coins: 2070, price: 2800, bonus: "70コインお得！" },
  { id: "coins_3140", coins: 3140, price: 4200, bonus: "140コインお得！" },
  { id: "coins_5260", coins: 5260, price: 7000, bonus: "260コインお得！" },
  { id: "coins_10550", coins: 10550, price: 14000, bonus: "550コインお得！" },
] as const;

export const getCoinChargePlan = (planId: string) =>
  COIN_CHARGE_PLANS.find((plan) => plan.id === planId);

export const getCoinChargePlanByCoins = (coins: number) =>
  COIN_CHARGE_PLANS.find((plan) => plan.coins === coins);
