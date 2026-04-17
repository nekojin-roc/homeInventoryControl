import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Bin management
  const [binLabel, setBinLabel] = useState("");
  const [binDesc, setBinDesc] = useState("");

  const { data: bins } = useQuery({
    queryKey: ["bins"],
    queryFn: api.listBins,
  });

  const createBin = useMutation({
    mutationFn: api.createBin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      setBinLabel("");
      setBinDesc("");
    },
  });

  const deleteBin = useMutation({
    mutationFn: api.deleteBin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bins"] });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure storage bins and system preferences.
        </p>
      </div>

      {/* Bin management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Bins</CardTitle>
          <CardDescription>
            Define physical locations where you store packages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing bins */}
          {bins && bins.length > 0 && (
            <div className="space-y-2">
              {bins.map((bin) => (
                <div
                  key={bin.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{bin.label}</span>
                    {bin.description && (
                      <span className="text-sm text-muted-foreground ml-2">
                        {bin.description}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({bin.currentCount ?? 0}/{bin.capacity})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete bin "${bin.label}"?`)) {
                        deleteBin.mutate(bin.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new bin */}
          <div className="flex gap-2">
            <Input
              placeholder="Label (e.g. A-1)"
              value={binLabel}
              onChange={(e) => setBinLabel(e.target.value)}
              className="w-32"
            />
            <Input
              placeholder="Description (e.g. Top shelf)"
              value={binDesc}
              onChange={(e) => setBinDesc(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() =>
                createBin.mutate({
                  label: binLabel,
                  description: binDesc || undefined,
                })
              }
              disabled={!binLabel || createBin.isPending}
            >
              {createBin.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {createBin.isError && (
            <p className="text-sm text-destructive">
              {createBin.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email / SMTP info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription>
            SMTP settings are configured via the server's .env file. Edit
            server/.env to change your email provider, sender address, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current configuration is set on the server side. Restart the server
            after changing .env values.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
