import { FastifyInstance } from "fastify";
import { z } from "zod";

const binSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().positive().default(10),
});

export async function binRoutes(app: FastifyInstance) {
  // List all bins with current occupancy
  app.get("/api/bins", async () => {
    const bins = await app.prisma.bin.findMany({
      orderBy: { label: "asc" },
      include: {
        _count: {
          select: { packages: { where: { status: { not: "PICKED_UP" } } } },
        },
      },
    });
    return bins.map((bin) => ({
      ...bin,
      currentCount: bin._count.packages,
    }));
  });

  // Create bin
  app.post("/api/bins", async (request, reply) => {
    const parsed = binSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const bin = await app.prisma.bin.create({ data: parsed.data });
    return reply.status(201).send(bin);
  });

  // Update bin
  app.patch<{ Params: { id: string } }>(
    "/api/bins/:id",
    async (request, reply) => {
      const parsed = binSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const bin = await app.prisma.bin.update({
        where: { id: request.params.id },
        data: parsed.data,
      });
      return bin;
    }
  );

  // Delete bin (only if empty)
  app.delete<{ Params: { id: string } }>(
    "/api/bins/:id",
    async (request, reply) => {
      const count = await app.prisma.package.count({
        where: { binId: request.params.id, status: { not: "PICKED_UP" } },
      });
      if (count > 0) {
        return reply
          .status(409)
          .send({ error: "Cannot delete bin that contains active packages" });
      }
      await app.prisma.bin.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    }
  );
}
