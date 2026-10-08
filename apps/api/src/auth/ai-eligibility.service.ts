import { ForbiddenException, Injectable } from '@nestjs/common';
import { Equals } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class AiEligibilityDto {
  @Equals('CA') country!: string;
  @Equals(true) adult!: boolean;
}

@Injectable()
export class AiEligibilityService {
  constructor(private readonly prisma: PrismaService) {}
  async get(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId },
      select: { aiCountry: true, aiAdultConfirmedAt: true, profile: { select: { age: true } } } });
    return { eligible: user.aiCountry === 'CA' && !!user.aiAdultConfirmedAt &&
      (user.profile?.age == null || user.profile.age >= 18) };
  }
  async confirm(userId: string, dto: AiEligibilityDto) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId }, select: { age: true } });
    if (dto.country !== 'CA' || dto.adult !== true || (profile?.age != null && profile.age < 18)) {
      throw new ForbiddenException('AI features are currently available only to adults aged 18 or older in Canada.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { aiCountry: dto.country, aiAdultConfirmedAt: new Date() } });
    return { eligible: true };
  }
  async require(userId: string) {
    if (!(await this.get(userId)).eligible) throw new ForbiddenException('Confirm that you are 18 or older and in Canada at /ai-access before using AI features.');
  }
  async withdraw(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { aiCountry: null, aiAdultConfirmedAt: null } });
    return { eligible: false };
  }
}
