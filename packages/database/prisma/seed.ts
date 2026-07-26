import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Intentionally minimal: no default rows are invented beyond the schema's
  // own defaults. Extend here once real seed data is defined.
  console.log('Seed script ran. No seed data defined yet.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
