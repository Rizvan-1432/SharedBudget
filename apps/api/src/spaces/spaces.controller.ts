import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { CreateSpaceDto } from './dto/create-space.dto';
import { JoinSpaceDto } from './dto/join-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Post()
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateSpaceDto) {
    return this.spaces.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.spaces.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.spaces.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spaces.update(user.userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.spaces.remove(user.userId, id);
    return { ok: true };
  }

  @Post(':id/join')
  join(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JoinSpaceDto,
  ) {
    return this.spaces.join(user.userId, id, dto.inviteToken);
  }

  @Get(':id/members')
  members(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.spaces.members(user.userId, id);
  }
}
