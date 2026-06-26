import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateBarcodeId, renderBarcodePng } from "../utils/barcode.js";
import {
  sendArrivalNotification,
  sendPickupConfirmation,
} from "../services/email.js";

const intakeSchema = z.object({
  recipientId: z.string().min(1),
  description: z.string().optional(),
  orderNumber: z.string().optional(),
  trackingNumber: z.string().optional(),
  binId: z.string().optional(),
  notify: z.boolean().default(true),
});

const pickupSchema = z.object({
  collectedBy: z.string().optional(),
  notify: z.boolean().default(true),
});

export async function packageRoutes(app: FastifyInstance) {
  // List packages with filters
  app.get("/api/packages", async (request) => {
    const query = request.query as {
      status?: string;
      recipientId?: string;
      search?: string;
    };

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.recipientId) where.recipientId = query.recipientId;
    if (query.search) {
      where.OR = [
        { barcode: { contains: query.search } },
        { description: { contains: query.search } },
        { orderNumber: { contains: query.search } },
        { trackingNumber: { contains: query.search } },
      ];
    }

    const packages = await app.prisma.package.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      include: {
        recipient: { select: { id: true, name: true, email: true } },
        bin: { select: { id: true, label: true } },
      },
    });
    return packages;
  });

  // Get single package
  app.get<{ Params: { id: string } }>(
    "/api/packages/:id",
    async (request, reply) => {
      const pkg = await app.prisma.package.findUnique({
        where: { id: request.params.id },
        include: { recipient: true, bin: true },
      });
      if (!pkg) return reply.status(404).send({ error: "Not found" });
      return pkg;
    }
  );

  // Intake: create a new package (the main workflow entry point)
  app.post("/api/packages/intake", async (request, reply) => {
    const parsed = intakeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const barcode = generateBarcodeId();
    const data = parsed.data;

    const pkg = await app.prisma.package.create({
      data: {
        barcode,
        description: data.description,
        orderNumber: data.orderNumber,
        trackingNumber: data.trackingNumber,
        recipientId: data.recipientId,
        binId: data.binId || null,
        status: "RECEIVED",
      },
      include: { recipient: true, bin: true },
    });

    // Send email notification if requested
    if (data.notify && pkg.recipient.email) {
      const sent = await sendArrivalNotification({
        recipientName: pkg.recipient.name,
        recipientEmail: pkg.recipient.email,
        packageBarcode: pkg.barcode,
        description: pkg.description,
        binLabel: pkg.bin?.label,
        orderNumber: pkg.orderNumber,
      });

      if (sent) {
        await app.prisma.package.update({
          where: { id: pkg.id },
          data: { status: "NOTIFIED", notifiedAt: new Date() },
        });
        pkg.status = "NOTIFIED";
      }
    }

    return reply.status(201).send(pkg);
  });

  // Pickup: mark a package as collected by scanning its barcode
  app.post<{ Params: { barcode: string } }>(
    "/api/packages/pickup/:barcode",
    async (request, reply) => {
      const pkg = await app.prisma.package.findUnique({
        where: { barcode: request.params.barcode },
        include: { recipient: true },
      });

      if (!pkg) {
        return reply.status(404).send({ error: "Package not found" });
      }
      if (pkg.status === "PICKED_UP") {
        return reply.status(409).send({
          error: "Package already picked up",
          pickedUpAt: pkg.pickedUpAt,
        });
      }

      const body = pickupSchema.safeParse(request.body);
      const collectedBy = body.success ? body.data.collectedBy : undefined;
      const notify = body.success ? body.data.notify : true;

      const updated = await app.prisma.package.update({
        where: { id: pkg.id },
        data: {
          status: "PICKED_UP",
          pickedUpAt: new Date(),
          collectedBy: collectedBy || null,
        },
        include: { recipient: true, bin: true },
      });

      if (notify && pkg.recipient.email) {
        await sendPickupConfirmation({
          recipientName: pkg.recipient.name,
          recipientEmail: pkg.recipient.email,
          packageBarcode: pkg.barcode,
          collectedBy,
        });
      }

      return updated;
    }
  );

  // Generate barcode image for a package
  app.get<{ Params: { barcode: string } }>(
    "/api/packages/barcode/:barcode.png",
    async (request, reply) => {
      const png = await renderBarcodePng(request.params.barcode);
      return reply.type("image/png").send(png);
    }
  );

  // Dashboard stats
  app.get("/api/dashboard", async () => {
    const [total, waiting, pickedUp, byRecipient] = await Promise.all([
      app.prisma.package.count(),
      app.prisma.package.count({
        where: { status: { in: ["RECEIVED", "NOTIFIED"] } },
      }),
      app.prisma.package.count({ where: { status: "PICKED_UP" } }),
      app.prisma.package.groupBy({
        by: ["recipientId"],
        where: { status: { in: ["RECEIVED", "NOTIFIED"] } },
        _count: true,
      }),
    ]);

    // Enrich with recipient names
    const recipientIds = byRecipient.map((r) => r.recipientId);
    const recipients = await app.prisma.recipient.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(recipients.map((r) => [r.id, r.name]));

    return {
      total,
      waiting,
      pickedUp,
      byRecipient: byRecipient.map((r) => ({
        recipientId: r.recipientId,
        recipientName: nameMap.get(r.recipientId) ?? "Unknown",
        count: r._count,
      })),
    };
  });
}
