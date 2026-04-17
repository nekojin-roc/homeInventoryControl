import { FastifyInstance } from "fastify";
import { z } from "zod";

const createRecipientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const updateRecipientSchema = createRecipientSchema.partial();

export async function recipientRoutes(app: FastifyInstance) {
  // List all recipients
  app.get("/api/recipients", async () => {
    const recipients = await app.prisma.recipient.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { packages: true },
        },
      },
    });
    return recipients;
  });

  // Get single recipient with their packages
  app.get<{ Params: { id: string } }>(
    "/api/recipients/:id",
    async (request, reply) => {
      const recipient = await app.prisma.recipient.findUnique({
        where: { id: request.params.id },
        include: {
          packages: {
            orderBy: { receivedAt: "desc" },
            include: { bin: true },
          },
        },
      });
      if (!recipient) return reply.status(404).send({ error: "Not found" });
      return recipient;
    }
  );

  // Create recipient
  app.post("/api/recipients", async (request, reply) => {
    const parsed = createRecipientSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const recipient = await app.prisma.recipient.create({
      data: parsed.data,
    });
    return reply.status(201).send(recipient);
  });

  // Update recipient
  app.patch<{ Params: { id: string } }>(
    "/api/recipients/:id",
    async (request, reply) => {
      const parsed = updateRecipientSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const recipient = await app.prisma.recipient.update({
        where: { id: request.params.id },
        data: parsed.data,
      });
      return recipient;
    }
  );

  // Delete recipient (only if no packages)
  app.delete<{ Params: { id: string } }>(
    "/api/recipients/:id",
    async (request, reply) => {
      const count = await app.prisma.package.count({
        where: { recipientId: request.params.id },
      });
      if (count > 0) {
        return reply.status(409).send({
          error: "Cannot delete recipient with existing packages",
        });
      }
      await app.prisma.recipient.delete({
        where: { id: request.params.id },
      });
      return reply.status(204).send();
    }
  );
}
