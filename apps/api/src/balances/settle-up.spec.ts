import { fixCentDrift, settleUp, type CentBalance } from './settle-up';

describe('settleUp', () => {
  it('returns empty when all zero', () => {
    expect(
      settleUp([
        { userId: 'a', cents: 0 },
        { userId: 'b', cents: 0 },
      ]),
    ).toEqual([]);
  });

  it('one debtor and one creditor', () => {
    const t = settleUp([
      { userId: 'a', cents: -100 },
      { userId: 'b', cents: 100 },
    ]);
    expect(t).toEqual([
      { fromUserId: 'a', toUserId: 'b', cents: 100 },
    ]);
  });

  it('splits large creditor across debtors', () => {
    const t = settleUp([
      { userId: 'a', cents: -30 },
      { userId: 'b', cents: -20 },
      { userId: 'c', cents: 50 },
    ]);
    expect(t).toHaveLength(2);
    const total = t.reduce((s, x) => s + x.cents, 0);
    expect(total).toBe(50);
    expect(t.map((x) => x.cents).sort()).toEqual([20, 30]);
  });

  it('many small balances', () => {
    const b: CentBalance[] = [
      { userId: '1', cents: -15 },
      { userId: '2', cents: -10 },
      { userId: '3', cents: 25 },
    ];
    const t = settleUp(b);
    expect(t.length).toBeLessThanOrEqual(2);
    const paid = new Map<string, number>();
    const received = new Map<string, number>();
    for (const tr of t) {
      paid.set(tr.fromUserId, (paid.get(tr.fromUserId) ?? 0) + tr.cents);
      received.set(tr.toUserId, (received.get(tr.toUserId) ?? 0) + tr.cents);
    }
    expect((paid.get('1') ?? 0) + (paid.get('2') ?? 0)).toBe(25);
    expect(received.get('3')).toBe(25);
  });
});

describe('fixCentDrift', () => {
  it('leaves balanced list unchanged', () => {
    const b = [
      { userId: 'a', cents: -50 },
      { userId: 'b', cents: 50 },
    ];
    expect(fixCentDrift(b)).toEqual(b);
  });

  it('fixes off-by-one cent', () => {
    const fixed = fixCentDrift([
      { userId: 'a', cents: -50 },
      { userId: 'b', cents: 51 },
    ]);
    expect(fixed.reduce((s, x) => s + x.cents, 0)).toBe(0);
  });
});
