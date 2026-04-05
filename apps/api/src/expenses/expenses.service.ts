import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseSplitMode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const expenseInclude = {
  payer: { select: { id: true, email: true } },
  splits: {
    select: { id: true, userId: true, mode: true, weight: true },
    orderBy: { userId: 'asc' as const },
  },
} satisfies Prisma.ExpenseInclude;

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: typeof expenseInclude;
}>;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(spaceId: string, actorId: string, dto: CreateExpenseDto) {
    await this.requireMember(actorId, spaceId);
    const split = this.normalizeSplitPayload(dto);
    await this.validateMemberIds(spaceId, [dto.payerId, ...split.userIds]);

    const amountDecimal = this.parseAmount(dto.amount);
    const splitCreates = this.buildSplitCreates(dto.splitMode, split);

    const expense = await this.prisma.expense.create({
      data: {
        spaceId,
        amount: amountDecimal,
        payerId: dto.payerId,
        description: dto.description?.trim() || null,
        splits: { create: splitCreates },
      },
      include: expenseInclude,
    });

    return this.serializeExpense(expense);
  }

  async findAll(
    spaceId: string,
    actorId: string,
    query: ListExpensesQueryDto,
  ) {
    await this.requireMember(actorId, spaceId);
    const where: Prisma.ExpenseWhereInput = { spaceId };

    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) {
      createdAt.gte = this.parseRangeStart(query.from);
    }
    if (query.to) {
      createdAt.lte = this.parseRangeEnd(query.to);
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    const rows = await this.prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((e) => this.serializeExpense(e));
  }

  async findOne(spaceId: string, expenseId: string, actorId: string) {
    await this.requireMember(actorId, spaceId);
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, spaceId },
      include: expenseInclude,
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return this.serializeExpense(expense);
  }

  async update(
    spaceId: string,
    expenseId: string,
    actorId: string,
    dto: UpdateExpenseDto,
  ) {
    await this.requireMember(actorId, spaceId);
    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, spaceId },
    });
    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    const split = this.normalizeSplitPayload(dto);
    await this.validateMemberIds(spaceId, [dto.payerId, ...split.userIds]);
    const amountDecimal = this.parseAmount(dto.amount);
    const splitCreates = this.buildSplitCreates(dto.splitMode, split);

    const expense = await this.prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId } });
      return tx.expense.update({
        where: { id: expenseId },
        data: {
          amount: amountDecimal,
          payerId: dto.payerId,
          description: dto.description?.trim() || null,
          splits: { create: splitCreates },
        },
        include: expenseInclude,
      });
    });

    return this.serializeExpense(expense);
  }

  async remove(spaceId: string, expenseId: string, actorId: string) {
    await this.requireMember(actorId, spaceId);
    const res = await this.prisma.expense.deleteMany({
      where: { id: expenseId, spaceId },
    });
    if (res.count === 0) {
      throw new NotFoundException('Expense not found');
    }
  }

  private normalizeSplitPayload(
    dto: CreateExpenseDto | UpdateExpenseDto,
  ): { userIds: string[]; weights?: number[] } {
    if (dto.splitMode === ExpenseSplitMode.EQUAL) {
      if (!dto.participantIds?.length) {
        throw new BadRequestException(
          'participantIds is required for EQUAL split',
        );
      }
      const userIds = [...new Set(dto.participantIds)];
      if (userIds.length !== dto.participantIds.length) {
        throw new BadRequestException('Duplicate participantIds');
      }
      return { userIds };
    }

    if (!dto.weightedParticipants?.length) {
      throw new BadRequestException(
        'weightedParticipants is required for WEIGHT split',
      );
    }
    const userIds: string[] = [];
    const weights: number[] = [];
    const seen = new Set<string>();
    for (const row of dto.weightedParticipants) {
      if (seen.has(row.userId)) {
        throw new BadRequestException('Duplicate weightedParticipants.userId');
      }
      seen.add(row.userId);
      userIds.push(row.userId);
      weights.push(row.weight);
    }
    return { userIds, weights };
  }

  private buildSplitCreates(
    mode: ExpenseSplitMode,
    split: { userIds: string[]; weights?: number[] },
  ): Prisma.ExpenseSplitCreateWithoutExpenseInput[] {
    if (mode === ExpenseSplitMode.EQUAL) {
      return split.userIds.map((userId) => ({
        mode: ExpenseSplitMode.EQUAL,
        weight: null,
        user: { connect: { id: userId } },
      }));
    }
    const weights = split.weights!;
    return split.userIds.map((userId, i) => ({
      mode: ExpenseSplitMode.WEIGHT,
      weight: new Prisma.Decimal(String(weights[i])),
      user: { connect: { id: userId } },
    }));
  }

  private parseAmount(n: number): Prisma.Decimal {
    return new Prisma.Decimal(String(n)).toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_HALF_UP,
    );
  }

  private async requireMember(userId: string, spaceId: string) {
    const m = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!m) {
      throw new ForbiddenException('Not a member of this space');
    }
  }

  private async validateMemberIds(spaceId: string, userIds: string[]) {
    const unique = [...new Set(userIds)];
    const count = await this.prisma.spaceMember.count({
      where: { spaceId, userId: { in: unique } },
    });
    if (count !== unique.length) {
      throw new BadRequestException(
        'payerId and all participants must be members of this space',
      );
    }
  }

  private parseRangeStart(iso: string): Date {
    return iso.length <= 10
      ? new Date(`${iso}T00:00:00.000Z`)
      : new Date(iso);
  }

  private parseRangeEnd(iso: string): Date {
    return iso.length <= 10
      ? new Date(`${iso}T23:59:59.999Z`)
      : new Date(iso);
  }

  private serializeExpense(expense: ExpenseWithRelations) {
    return {
      id: expense.id,
      spaceId: expense.spaceId,
      amount: expense.amount.toFixed(2),
      payerId: expense.payerId,
      description: expense.description,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      payer: expense.payer,
      splits: expense.splits.map((s) => ({
        id: s.id,
        userId: s.userId,
        mode: s.mode,
        weight: s.weight === null ? null : s.weight.toFixed(4),
      })),
    };
  }
}
