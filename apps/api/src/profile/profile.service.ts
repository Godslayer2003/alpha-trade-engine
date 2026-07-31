import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async upsertProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  /** True once the user has answered enough of the questionnaire to generate recommendations. */
  isComplete(profile: { riskTolerance?: unknown; timeHorizonYears?: unknown } | null): boolean {
    return !!profile && profile.timeHorizonYears !== null && profile.timeHorizonYears !== undefined;
  }
}
