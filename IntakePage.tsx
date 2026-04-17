import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Printer, Check, Loader2 } from "lucide-react";

export default function IntakePage() {
  const queryClient = useQueryClient();

  const [recipientId, setRecipientId] = useState("");
  const [description, setDescription] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [binId, setBinId] = useState("");
  const [notify, setNotify] = useState(true);

  // Result state after successful intake
  const [result, setResult] = useState<{
    barcode: string;
    recipientName: string;
  } | null>(null);

  const { data: recipients } = useQuery({
    queryKey: ["recipients"],
    queryFn: api.listRecipients,
  });

  const { data: bins } = useQuery({
    queryKey: ["bins"],
    queryFn: api.listBins,
  });

  const intakeMutation = useMutation({
    mutationFn: api.intake,
    onSuccess: (pkg) => {
      setResult({
        barcode: pkg.barcode,
        recipientName: pkg.recipient?.name ?? "Unknown",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });

  const handleSubmit = () => {
    if (!recipientId) return;
    intakeMutation.mutate({
      recipientId,
      description: description || undefined,
      orderNumber: orderNumber || undefined,
      trackingNumber: trackingNumber || undefined,
      binId: binId || undefined,
      notify,
    });
  };

  const handleReset = () => {
    setRecipientId("");
    setDescription("");
    setOrderNumber("");
    setTrackingNumber("");
    setBinId("");
    setNotify(true);
    setResult(null);
    intakeMutation.reset();
  };

  const handlePrint = (barcode: string) => {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Label: ${barcode}</title></head>
        <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace;">
          <img src="/api/packages/barcode/${barcode}.png" style="max-width:90%;" />
          <p style="margin-top:8px;font-size:14px;">${barcode}</p>
          <script>
            document.querySelector('img').onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Success screen
  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>Package Registered</CardTitle>
            <CardDescription>
              Package for {result.recipientName} has been logged
              {notify ? " and notified" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border p-4 bg-muted/30">
              <img
                src={api.barcodeImageUrl(result.barcode)}
                alt={result.barcode}
                className="max-w-[280px]"
              />
              <Badge variant="outline" className="font-mono text-sm">
                {result.barcode}
              </Badge>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handlePrint(result.barcode)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Label
              </Button>
              <Button className="flex-1" onClick={handleReset}>
                <PackagePlus className="mr-2 h-4 w-4" />
                Next Package
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Intake form
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Package Intake</h1>
        <p className="text-muted-foreground">
          Register a new incoming package.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Recipient */}
          <div className="space-y-2">
            <Label>Recipient *</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient..." />
              </SelectTrigger>
              <SelectContent>
                {recipients?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="e.g. Anime figure, Electronics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Order Number */}
          <div className="space-y-2">
            <Label>Order Number</Label>
            <Input
              placeholder="e.g. ORD-12345"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>

          {/* Tracking Number */}
          <div className="space-y-2">
            <Label>Carrier Tracking Number</Label>
            <Input
              placeholder="e.g. 1Z999AA10123456784"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>

          {/* Bin */}
          <div className="space-y-2">
            <Label>Storage Bin</Label>
            <Select value={binId} onValueChange={setBinId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bin..." />
              </SelectTrigger>
              <SelectContent>
                {bins?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                    {b.description ? ` — ${b.description}` : ""}
                    {b.currentCount !== undefined
                      ? ` (${b.currentCount}/${b.capacity})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notify toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="notify" className="cursor-pointer">
              Send email notification to recipient
            </Label>
          </div>

          {/* Error */}
          {intakeMutation.isError && (
            <p className="text-sm text-destructive">
              {intakeMutation.error.message}
            </p>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={!recipientId || intakeMutation.isPending}
            onClick={handleSubmit}
          >
            {intakeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="mr-2 h-4 w-4" />
            )}
            Register Package
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
