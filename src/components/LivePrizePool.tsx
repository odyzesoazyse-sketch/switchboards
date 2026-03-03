import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface LivePrizePoolProps {
  battleId: string;
  initialAmount?: number;
  currency?: string;
  paymentUrl?: string;
}

/**
 * Live Prize Pool component — shows dynamic prize counter with QR for donations.
 * Prepared for webhook API integration (payment providers).
 */
export default function LivePrizePool({
  battleId,
  initialAmount = 0,
  currency = "₽",
  paymentUrl,
}: LivePrizePoolProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [showQR, setShowQR] = useState(false);

  // In production: subscribe to a webhook/edge function for live updates
  // For now, just use initial amount
  useEffect(() => {
    setAmount(initialAmount);
  }, [initialAmount]);

  const qrUrl = paymentUrl || `${window.location.origin}/battle/${battleId}/donate`;

  return (
    <div className="relative">
      <div
        className="p-6 rounded-2xl border border-border bg-card cursor-pointer hover:border-primary/30 transition-colors"
        onClick={() => setShowQR(!showQR)}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Prize Pool</div>
            <motion.div
              className="text-3xl font-black font-display text-foreground"
              key={amount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {currency}{amount.toLocaleString()}
            </motion.div>
          </div>
        </div>

        {showQR && (
          <motion.div
            className="mt-4 flex flex-col items-center gap-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
          >
            <QRCodeSVG value={qrUrl} size={120} bgColor="transparent" fgColor="currentColor" className="text-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Scan to contribute</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
