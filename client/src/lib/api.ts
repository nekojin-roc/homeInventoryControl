const BASE = "/api";

// Normalize the various error shapes the API returns into a readable string.
// Plain string errors pass through; Zod's flattened error object
// ({ formErrors, fieldErrors }) is collapsed into a human-readable message.
function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const flat = error as {
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    };
    const messages = [
      ...(flat.formErrors ?? []),
      ...Object.entries(flat.fieldErrors ?? {}).map(([field, msgs]) =>
        msgs?.length ? `${field}: ${msgs.join(", ")}` : null
      ),
    ].filter((m): m is string => Boolean(m));
    if (messages.length) return messages.join("; ");
  }
  return undefined;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      // Only send a JSON content-type when there's actually a body —
      // Fastify rejects an empty body with content-type application/json.
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(extractErrorMessage(err.error) ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ----- Types -----

export interface Recipient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { packages: number };
}

export interface Bin {
  id: string;
  label: string;
  description?: string | null;
  capacity: number;
  currentCount?: number;
}

export interface Package {
  id: string;
  barcode: string;
  description?: string | null;
  orderNumber?: string | null;
  trackingNumber?: string | null;
  photoPath?: string | null;
  status: "RECEIVED" | "NOTIFIED" | "PICKED_UP";
  collectedBy?: string | null;
  receivedAt: string;
  notifiedAt?: string | null;
  pickedUpAt?: string | null;
  recipientId: string;
  recipient?: Pick<Recipient, "id" | "name" | "email">;
  binId?: string | null;
  bin?: Pick<Bin, "id" | "label"> | null;
}

export interface DashboardStats {
  total: number;
  waiting: number;
  pickedUp: number;
  byRecipient: { recipientId: string; recipientName: string; count: number }[];
}

// ----- API Functions -----

export const api = {
  // Dashboard
  dashboard: () => request<DashboardStats>("/dashboard"),

  // Recipients
  listRecipients: () => request<Recipient[]>("/recipients"),
  getRecipient: (id: string) =>
    request<Recipient & { packages: Package[] }>(`/recipients/${id}`),
  createRecipient: (data: { name: string; email: string; phone?: string; notes?: string }) =>
    request<Recipient>("/recipients", { method: "POST", body: JSON.stringify(data) }),
  updateRecipient: (id: string, data: Partial<{ name: string; email: string; phone: string; notes: string }>) =>
    request<Recipient>(`/recipients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRecipient: (id: string) =>
    request<void>(`/recipients/${id}`, { method: "DELETE" }),

  // Bins
  listBins: () => request<Bin[]>("/bins"),
  createBin: (data: { label: string; description?: string; capacity?: number }) =>
    request<Bin>("/bins", { method: "POST", body: JSON.stringify(data) }),
  updateBin: (id: string, data: Partial<{ label: string; description: string; capacity: number }>) =>
    request<Bin>(`/bins/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBin: (id: string) =>
    request<void>(`/bins/${id}`, { method: "DELETE" }),

  // Packages
  listPackages: (params?: { status?: string; recipientId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.recipientId) query.set("recipientId", params.recipientId);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return request<Package[]>(`/packages${qs ? `?${qs}` : ""}`);
  },
  getPackage: (id: string) => request<Package>(`/packages/${id}`),
  intake: (data: {
    recipientId: string;
    description?: string;
    orderNumber?: string;
    trackingNumber?: string;
    binId?: string;
    notify?: boolean;
  }) => request<Package>("/packages/intake", { method: "POST", body: JSON.stringify(data) }),
  pickup: (barcode: string, data?: { collectedBy?: string; notify?: boolean }) =>
    request<Package>(`/packages/pickup/${barcode}`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  // Barcode image URL
  barcodeImageUrl: (barcode: string) => `${BASE}/packages/barcode/${barcode}.png`,
};
