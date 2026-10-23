import { loadApiEnv } from "./load-env.ts";

loadApiEnv();

const { prisma } = await import("../apps/api/src/db.ts");
const { USE_CASES } = await import("./use-cases.ts");

const [action, argument] = process.argv.slice(2);

function write(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

if (action === "register") {
  const contractor =
    (await prisma.contractor.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.contractor.create({
      data: {
        name: "NicoBookings Studio",
        slug: "nicobookings",
        timezone: "America/Santiago",
        services: {
          create: [
            { name: "Haircut & Styling", priceCents: 2500, durationMins: 45 },
            { name: "Consultation", priceCents: 1500, durationMins: 30 },
          ],
        },
      },
      select: { id: true },
    }));

  for (const useCase of USE_CASES) {
    const existing = await prisma.agentTestCase.findFirst({
      where: { contractorId: contractor.id, name: useCase.id },
      select: { id: true },
    });

    const data = {
      input: useCase.input,
      expected: useCase.expected,
      criteria: {
        id: useCase.id,
        actor: useCase.actor,
        steps: useCase.steps,
      },
      isActive: true,
    };

    if (existing) {
      await prisma.agentTestCase.update({ where: { id: existing.id }, data });
    } else {
      await prisma.agentTestCase.create({
        data: { contractorId: contractor.id, name: useCase.id, ...data },
      });
    }
  }

  const retired = await prisma.agentTestCase.updateMany({
    where: {
      contractorId: contractor.id,
      name: { notIn: USE_CASES.map((useCase) => useCase.id) },
    },
    data: { isActive: false },
  });

  write({ registered: USE_CASES.length, retired: retired.count, contractorId: contractor.id });
} else if (action === "snapshot" && argument) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: argument },
    include: {
      customer: {
        include: { bookings: { orderBy: { createdAt: "asc" } } },
      },
      bookings: { orderBy: { createdAt: "asc" } },
      handoffs: { orderBy: { createdAt: "asc" } },
      contractor: {
        select: {
          timezone: true,
          services: {
            where: { isActive: true },
            select: { id: true, name: true, priceCents: true, durationMins: true },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });
  write(conversation);
} else if (action === "service" && argument) {
  const service = await prisma.service.findFirst({
    where: { name: argument },
    select: { id: true, name: true, priceCents: true, durationMins: true, isActive: true },
  });
  write(service);
} else {
  throw new Error("Usage: bun e2e/query.ts <register|snapshot|service> [argument]");
}

await prisma.$disconnect();
