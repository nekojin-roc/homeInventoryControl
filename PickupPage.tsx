import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Package } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScanBarcode,
  Camera,
  Keyboard,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

type ScanMode = "manual" | "camera";

export default function PickupPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ScanMode>("manual");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [collectedBy, setCollectedBy] = useState("");
  const [scannedPkg, setScannedPkg] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Focus the input for USB scanner (keyboard mode)
  useEffect(() => {
    if (mode === "manual") {
      inputRef.current?.focus();
    }
  }, [mode]);

  // Lookup package by barcode
  const lookupBarcode = useCallback(async (barcode: string) => {
    setError(null);
    setScannedPkg(null);
    setSuccess(false);

    try {
      // We use the packages list filtered by barcode
      const packages = await api.listPackages({ search: barcode.trim() });
      const pkg = packages.find((p) => p.barcode === barcode.trim());
      if (!pkg) {
        setError(`No package found with barcode "${barcode.trim()}"`);
        return;
      }
      if (pkg.status === "PICKED_UP") {
        setError(
          `This package was already picked up on ${new Date(pkg.pickedUpAt!).toLocaleDateString()}`
        );
        return;
      }
      setScannedPkg(pkg);
    } catch (err: any) {
      setError(err.message ?? "Lookup failed");
    }
  }, []);

  // Pickup mutation
  const pickupMutation = useMutation({
    mutationFn: () =>
      api.pickup(scannedPkg!.barcode, {
        collectedBy: collectedBy || undefined,
        notify: true,
      }),
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Handle manual input submit (Enter key or button)
  const handleManualSubmit = () => {
    if (barcodeInput.trim()) {
      lookupBarcode(barcodeInput);
    }
  };

  // Start camera scanner
  const startCamera = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("camera-scanner");
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          scanner.stop().catch(() => {});
          setBarcodeInput(decodedText);
          lookupBarcode(decodedText);
          setMode("manual");
        },
        () => {} // ignore scan failures
      );
    } catch (err) {
      setError("Could not access camera. Check permissions.");
      setMode("manual");
    }
  }, [lookupBarcode]);

  // Cleanup camera on unmount or mode change
  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    }
    return () => {
      html5QrCodeRef.current?.stop?.().catch(() => {});
      html5QrCodeRef.current = null;
    };
  }, [mode, startCamera]);

  const handleReset = () => {
    setBarcodeInput("");
    setCollectedBy("");
    setScannedPkg(null);
    setError(null);
    setSuccess(false);
    pickupMutation.reset();
  };

  // Success screen
  if (success && scannedPkg) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>Package Collected</CardTitle>
            <CardDescription>
              {scannedPkg.barcode} for {scannedPkg.recipient?.name} has been
              marked as picked up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleReset}>
              <ScanBarcode className="mr-2 h-4 w-4" />
              Scan Next
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirmation screen after scanning
  if (scannedPkg) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Confirm Pickup</h1>
          <p className="text-muted-foreground">
            Verify details before marking as collected.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Barcode</span>
                <Badge variant="outline" className="font-mono">
                  {scannedPkg.barcode}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Recipient</span>
                <span className="font-medium">{scannedPkg.recipient?.name}</span>
              </div>
              {scannedPkg.description && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Description
                  </span>
                  <span>{scannedPkg.description}</span>
                </div>
              )}
              {scannedPkg.bin && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bin</span>
                  <span>{scannedPkg.bin.label}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Received</span>
                <span>
                  {new Date(scannedPkg.receivedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collected by (optional)</Label>
              <Input
                placeholder="Name of person picking up"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
              />
            </div>

            {pickupMutation.isError && (
              <p className="text-sm text-destructive">
                {pickupMutation.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={pickupMutation.isPending}
                onClick={() => pickupMutation.mutate()}
              >
                {pickupMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Confirm Pickup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scan/input screen
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Package Pickup</h1>
        <p className="text-muted-foreground">
          Scan or enter a barcode to mark a package as collected.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          <Keyboard className="mr-2 h-4 w-4" />
          Manual / Scanner
        </Button>
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("camera")}
        >
          <Camera className="mr-2 h-4 w-4" />
          Camera
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {mode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Scan or type barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                    autoFocus
                  />
                  <Button onClick={handleManualSubmit} disabled={!barcodeInput.trim()}>
                    <ScanBarcode className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: USB barcode scanners will type directly into this field.
                  Just scan!
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div
                id="camera-scanner"
                ref={cameraRef}
                className="w-full rounded-lg overflow-hidden bg-muted min-h-[250px]"
              />
              <p className="text-xs text-muted-foreground text-center">
                Point your camera at the barcode label.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
