import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scan, Check, AlertCircle } from "lucide-react";

interface NfcCheckinProps {
  onCheckin: (code: string) => void;
}

/**
 * NFC/Barcode Check-in stub component.
 * Expects scanner input (keyboard wedge mode) or manual entry.
 * In production, connect to NFC Web API or a barcode scanner.
 */
export default function NfcCheckin({ onCheckin }: NfcCheckinProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      onCheckin(code.trim());
      setLastCheckin(code.trim());
      setStatus("success");
      setCode("");
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-border bg-card space-y-4">
      <div className="flex items-center gap-2">
        <Scan className="w-5 h-5 text-primary" />
        <h3 className="font-bold font-display text-sm uppercase tracking-wider">NFC / Barcode Check-in</h3>
        <Badge variant="outline" className="text-[10px]">BETA</Badge>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scan or enter code..."
          className="font-mono"
          autoFocus
        />
        <Button type="submit" size="sm">
          Check In
        </Button>
      </form>

      {status === "success" && (
        <div className="flex items-center gap-2 text-success text-sm">
          <Check className="w-4 h-4" />
          <span>Checked in: {lastCheckin}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Check-in failed</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Point scanner at this field. Supports NFC, QR, and barcode scanners in keyboard wedge mode.
      </p>
    </div>
  );
}
