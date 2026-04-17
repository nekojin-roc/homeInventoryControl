import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "warning" | "success" }> = {
  RECEIVED: { label: "Received", variant: "warning" },
  NOTIFIED: { label: "Notified", variant: "default" },
  PICKED_UP: { label: "Picked Up", variant: "success" },
};

export default function PackagesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [search, setSearch] = useState("");

  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages", statusFilter, search],
    queryFn: () => {
      if (statusFilter === "active") {
        // Fetch both RECEIVED and NOTIFIED
        return api.listPackages({ search: search || undefined });
      }
      return api.listPackages({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
      });
    },
  });

  const filtered =
    statusFilter === "active"
      ? packages?.filter((p) => p.status !== "PICKED_UP")
      : packages;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Packages</h1>
        <p className="text-muted-foreground">
          View and search all registered packages.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search barcode, description, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (Waiting)</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="NOTIFIED">Notified</SelectItem>
            <SelectItem value="PICKED_UP">Picked Up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Package list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No packages found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((pkg) => {
            const statusInfo = STATUS_LABELS[pkg.status] ?? {
              label: pkg.status,
              variant: "default" as const,
            };
            return (
              <Card key={pkg.id}>
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Barcode + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {pkg.barcode}
                      </span>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {[
                        pkg.description,
                        pkg.orderNumber && `Order: ${pkg.orderNumber}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No description"}
                    </p>
                  </div>

                  {/* Recipient + bin */}
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <span className="font-medium">
                      {pkg.recipient?.name ?? "Unknown"}
                    </span>
                    {pkg.bin && (
                      <Badge variant="outline" className="text-xs">
                        Bin {pkg.bin.label}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {new Date(pkg.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
