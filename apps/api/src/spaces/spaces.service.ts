import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SpaceMemberRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  private newInviteToken(): string {
    return randomBytes(24).toString('base64url');
  }

  async create(userId: string, dto: CreateSpaceDto) {
    const inviteToken = this.newInviteToken();
    const space = await this.prisma.space.create({
      data: {
        name: dto.name.trim(),
        ownerId: userId,
        inviteToken,
        members: {
          create: { userId, role: SpaceMemberRole.OWNER },
        },
      },
    });
    return this.toSpaceDetail(space, true);
  }

  async findAllForUser(userId: string) {
    const rows = await this.prisma.spaceMember.findMany({
      where: { userId },
      include: {
        space: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.space.id,
      name: r.space.name,
      ownerId: r.space.ownerId,
      role: r.role,
      createdAt: r.space.createdAt,
      joinedAt: r.joinedAt,
    }));
  }

  async findOne(userId: string, spaceId: string) {
    await this.requireMember(userId, spaceId);
    const space = await this.prisma.space.findUniqueOrThrow({
      where: { id: spaceId },
    });
    const isOwner = space.ownerId === userId;
    return this.toSpaceDetail(space, isOwner);
  }

  async update(userId: string, spaceId: string, dto: UpdateSpaceDto) {
    const space = await this.requireOwner(userId, spaceId);
    const updated = await this.prisma.space.update({
      where: { id: space.id },
      data: { name: dto.name.trim() },
    });
    return this.toSpaceDetail(updated, true);
  }

  async remove(userId: string, spaceId: string) {
    await this.requireOwner(userId, spaceId);
    await this.prisma.space.delete({ where: { id: spaceId } });
  }

  async join(userId: string, spaceId: string, inviteToken: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!space) {
      throw new NotFoundException('Space not found');
    }
    if (space.inviteToken !== inviteToken.trim()) {
      throw new ForbiddenException('Invalid invite token');
    }

    const existing = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: { spaceId, userId },
      },
    });
    if (existing) {
      throw new ConflictException('Already a member of this space');
    }

    await this.prisma.spaceMember.create({
      data: {
        spaceId,
        userId,
        role: SpaceMemberRole.MEMBER,
      },
    });

    const refreshed = await this.prisma.space.findUniqueOrThrow({
      where: { id: spaceId },
    });
    return this.toSpaceDetail(refreshed, false);
  }

  async members(userId: string, spaceId: string) {
    await this.requireMember(userId, spaceId);
    const rows = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((m) => ({
      memberId: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  private toSpaceDetail(
    space: { id: string; name: string; ownerId: string; inviteToken: string; createdAt: Date },
    includeInviteToken: boolean,
  ) {
    return {
      id: space.id,
      name: space.name,
      ownerId: space.ownerId,
      createdAt: space.createdAt,
      ...(includeInviteToken ? { inviteToken: space.inviteToken } : {}),
    };
  }

  private async requireMember(userId: string, spaceId: string) {
    const m = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!m) {
      throw new ForbiddenException('Not a member of this space');
    }
    return m;
  }

  private async requireOwner(userId: string, spaceId: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!space) {
      throw new NotFoundException('Space not found');
    }
    if (space.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can perform this action');
    }
    return space;
  }
}
