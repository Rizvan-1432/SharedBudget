import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import { BalancesService } from './balances.service';

@Controller('spaces/:spaceId')
@UseGuards(JwtAuthGuard)
export class BalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Get('balances')
  getBalances(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ) {
    return this.balances.getBalances(spaceId, user.userId);
  }

  @Get('settlements')
  getSettlements(
    @CurrentUser() user: JwtUserPayload,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ) {
    return this.balances.getSettlements(spaceId, user.userId);
  }
}
