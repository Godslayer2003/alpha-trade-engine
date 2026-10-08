import { Body, Controller, Get, Module, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SecurityQuotaService } from '../auth/security-quota.service';

export class ContactRequestDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['privacy', 'support', 'cancellation']) category!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(10) @MaxLength(4000) message!: string;
}

@Controller('api/v1/contact')
export class ContactController {
  constructor(private readonly prisma: PrismaService, private readonly quota: SecurityQuotaService) {}
  @Post()
  async submit(@Body() dto: ContactRequestDto, @Req() request: Request) {
    await this.quota.consume('contact-ip', request.ip ?? 'unknown', 5, 86_400_000);
    await this.quota.consume('contact-global', 'application', 200, 86_400_000);
    const receipt = await this.prisma.contactRequest.create({ data: { email: dto.email, category: dto.category, message: dto.message }, select: { id: true } });
    return { receipt: receipt.id };
  }
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  list() { return this.prisma.contactRequest.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: 'asc' }, take: 100 }); }
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async resolve(@Param('id') id: string) {
    await this.prisma.contactRequest.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date() } });
    return { ok: true };
  }
}

@Module({ imports: [AuthModule], controllers: [ContactController] })
export class ContactModule {}
