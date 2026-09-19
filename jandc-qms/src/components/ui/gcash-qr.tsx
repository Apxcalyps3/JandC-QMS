import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, ShieldCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface GCashQRCodeProps {
  amount: number;
  orderNumber?: string;
  accountName?: string;
  accountNumber?: string;
  className?: string;
}

export function GCashQRCode({
  amount,
  orderNumber = "PRINT-ORDER",
  accountName = "JandC Internet Cafe & Services",
  accountNumber = "0917 123 4567",
  className = "",
}: GCashQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Generate EMVCo / GCash payload string for scanner compatibility
    const qrPayload = `https://getgcash.page.link/pay?amount=${amount.toFixed(2)}&account=${accountNumber.replace(/\s+/g, "")}&merchant=${encodeURIComponent(accountName)}&ref=${orderNumber}`;

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 280,
      color: {
        dark: "#0055EE", // GCash primary brand blue
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error("QR Code generation error:", err);
      });
  }, [amount, orderNumber, accountName, accountNumber]);

  const copyNumber = () => {
    navigator.clipboard.writeText(accountNumber.replace(/\s+/g, ""));
    setCopied(true);
    toast({
      title: "Number copied",
      description: `${accountNumber} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border-2 border-[#0055EE]/20 bg-card overflow-hidden shadow-md max-w-sm mx-auto ${className}`}>
      {/* GCash branded header */}
      <div className="bg-[#0055EE] px-5 py-3.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center font-black text-[#0055EE] text-xs">
            G
          </div>
          <div>
            <p className="text-xs font-black tracking-wider uppercase">GCash Scan to Pay</p>
            <p className="text-[11px] text-white/80">InstaPay / P2P Merchant</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
          <ShieldCheck className="w-3 h-3" /> Verified
        </span>
      </div>

      <div className="p-5 flex flex-col items-center text-center space-y-4">
        {/* Merchant & Amount details */}
        <div>
          <p className="text-xs text-muted-foreground font-medium">Pay to Merchant</p>
          <h4 className="text-base font-bold text-foreground">{accountName}</h4>
        </div>

        {/* Amount Badge */}
        <div className="w-full bg-[#0055EE]/5 border border-[#0055EE]/20 rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Exact Amount to Send
          </p>
          <p className="text-3xl font-black text-[#0055EE] tracking-tight">
            ₱{amount.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Receipt amount must match this exact value
          </p>
        </div>

        {/* QR Canvas */}
        <div className="p-3 bg-white rounded-xl border border-border shadow-xs">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="GCash Payment QR Code"
              className="w-52 h-52 object-contain"
            />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-muted-foreground text-xs">
              Generating GCash QR...
            </div>
          )}
        </div>

        {/* Account Number with Copy */}
        <div className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg border text-xs">
          <div className="text-left">
            <span className="text-[10px] text-muted-foreground block">GCash Account Number</span>
            <span className="font-mono font-bold text-foreground">{accountNumber}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyNumber}
            className="h-7 px-2 text-xs font-medium text-[#0055EE] hover:bg-[#0055EE]/10"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </>
            )}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Open your <strong>GCash App</strong> → Tap <strong>QR / Pay</strong> → Scan this code or send to{" "}
          <strong>{accountNumber}</strong>. Save the screenshot receipt.
        </p>
      </div>
    </div>
  );
}
