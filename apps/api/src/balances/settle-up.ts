/** Балансы в целых центах. Сумма по всем участникам должна быть 0. */

export type CentBalance = { userId: string; cents: number };

export type SettlementTransfer = {
  fromUserId: string;
  toUserId: string;
  /** целые центы */
  cents: number;
};

/**
 * Минимальное число переводов: жадно сводим должников с кредиторами.
 */
export function settleUp(balances: CentBalance[]): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.cents < 0)
    .map((b) => ({ userId: b.userId, cents: -b.cents }))
    .sort((a, b) => b.cents - a.cents);

  const creditors = balances
    .filter((b) => b.cents > 0)
    .map((b) => ({ userId: b.userId, cents: b.cents }))
    .sort((a, b) => b.cents - a.cents);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      transfers.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        cents: pay,
      });
    }
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }

  return transfers;
}

/**
 * После округления балансов до центов сумма может уйти от нуля на ±1…N центов.
 * Корректируем участника с наибольшим |балансом|.
 */
export function fixCentDrift(balances: CentBalance[]): CentBalance[] {
  const copy = balances.map((b) => ({ ...b }));
  const sum = copy.reduce((s, b) => s + b.cents, 0);
  if (sum === 0 || copy.length === 0) {
    return copy;
  }
  let bestIdx = 0;
  for (let k = 1; k < copy.length; k++) {
    if (Math.abs(copy[k].cents) > Math.abs(copy[bestIdx].cents)) {
      bestIdx = k;
    }
  }
  copy[bestIdx].cents -= sum;
  return copy;
}
