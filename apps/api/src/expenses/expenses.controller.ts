import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('spaces/:spaceId/expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenses.create(spaceId, user.userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expenses.findAll(spaceId, user.userId, query);
  }

  @Get(':expenseId')
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expenses.findOne(spaceId, expenseId, user.userId);
  }

  @Patch(':expenseId')
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(spaceId, expenseId, user.userId, dto);
  }

  @Delete(':expenseId')
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    await this.expenses.remove(spaceId, expenseId, user.userId);
    return { ok: true };
  }
}
