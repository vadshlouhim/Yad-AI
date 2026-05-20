import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const presets = await prisma.automationPreset.findMany();
  console.log(JSON.stringify(presets, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
