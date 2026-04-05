import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExpenseSplitMode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { fixCentDrift, settleUp } from './settle-up';

@Injectable()
export class BalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(spaceId: string, actorId: string) {
    await this.requireMember(actorId, spaceId);

    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      include: { user: { select: { email: true } } },
    });

    const balances = new Map<string, Prisma.Decimal>();
    for (const m of members) {
      balances.set(m.userId, new Prisma.Decimal(0));
    }

    const expenses = await this.prisma.expense.findMany({
      where: { spaceId },
      include: { splits: true },
    });

    for (const exp of expenses) {
      const amount = exp.amount;
      const curP = balances.get(exp.payerId) ?? new Prisma.Decimal(0);
      balances.set(exp.payerId, curP.plus(amount));

      const splits = exp.splits;
      if (splits.length === 0) continue;

      const mode = splits[0].mode;
      if (mode === ExpenseSplitMode.EQUAL) {
        const n = splits.length;
        const share = amount.div(n);
        for (const s of splits) {
          const cur = balances.get(s.userId) ?? new Prisma.Decimal(0);
          balances.set(s.userId, cur.minus(share));
        }
      } else {
        let sumW = new Prisma.Decimal(0);
        for (const s of splits) {
          sumW = sumW.plus(s.weight!);
        }
        for (const s of splits) {
          const share = amount.mul(s.weight!).div(sumW);
          const cur = balances.get(s.userId) ?? new Prisma.Decimal(0);
          balances.set(s.userId, cur.minus(share));
        }
      }
    }

    return members.map((m) => {
      const raw = balances.get(m.userId) ?? new Prisma.Decimal(0);
      const rounded = raw.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      return {
        userId: m.userId,
        email: m.user.email,
        balance: rounded.toFixed(2),
      };
    });
  }

  async getSettlements(spaceId: string, actorId: string) {
    const rows = await this.getBalances(spaceId, actorId);

    let centsBalances = rows.map((r) => ({
      userId: r.userId,
      cents: new Prisma.Decimal(r.balance)
        .mul(100)
        .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
        .toNumber(),
    }));

    centsBalances = fixCentDrift(centsBalances);

    const transfers = settleUp(centsBalances);

    const emailById = new Map(rows.map((r) => [r.userId, r.email]));

    return transfers.map((t) => ({
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      fromEmail: emailById.get(t.fromUserId) ?? null,
      toEmail: emailById.get(t.toUserId) ?? null,
      amount: (t.cents / 100).toFixed(2),
    }));
  }

  private async requireMember(userId: string, spaceId: string) {
    const m = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!m) {
      throw new ForbiddenException('Not a member of this space');
    }
  }
}
