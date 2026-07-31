import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Injectable()
export class StrategyService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.userStrategy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, dto: CreateStrategyDto) {
    return this.prisma.userStrategy.create({
      data: {
        userId,
        name: dto.name,
        style: dto.style,
        preferredTickers: dto.preferredTickers ?? [],
        maxRiskPerTrade: dto.maxRiskPerTrade ?? 0.02,
        notes: dto.notes,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateStrategyDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.userStrategy.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.userStrategy.delete({ where: { id } });
    return { id };
  }

  private async assertOwnership(userId: string, id: string) {
    const strategy = await this.prisma.userStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found.');
    }
    if (strategy.userId !== userId) {
      throw new ForbiddenException('This strategy belongs to another account.');
    }
  }
}
