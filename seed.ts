import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create sample bins
  const bins = await Promise.all([
    prisma.bin.create({
      data: { label: "A-1", description: "Hallway shelf, top" },
    }),
    prisma.bin.create({
      data: { label: "A-2", description: "Hallway shelf, middle" },
    }),
    prisma.bin.create({
      data: { label: "B-1", description: "Closet, left side" },
    }),
    prisma.bin.create({
      data: { label: "B-2", description: "Closet, right side" },
    }),
    prisma.bin.create({
      data: { label: "C-1", description: "Large items, floor" },
    }),
  ]);

  // Create sample recipients
  const recipients = await Promise.all([
    prisma.recipient.create({
      data: {
        name: "Alice Chen",
        email: "alice@example.com",
        notes: "Prefers pickup on weekends",
      },
    }),
    prisma.recipient.create({
      data: {
        name: "Bob Tanaka",
        email: "bob@example.com",
        phone: "+81-90-1234-5678",
      },
    }),
  ]);

  console.log(`Seeded ${bins.length} bins and ${recipients.length} recipients.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
