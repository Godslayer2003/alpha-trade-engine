import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Registered globally via PrismaModule (see prisma.module.ts) — every
// module gets this without re-importing it. onModuleInit/onModuleDestroy
// tie the connection lifecycle to Nest's app bootstrap/shutdown.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
