import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Printer,
  FileText,
  User,
  Upload,
  Pencil,
  XCircle,
  Ticket,
  ZoomIn,
  X,
  ExternalLink,
  Clock,
  Calendar,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOrder } from "@/components/order-provider";
import {
  useCreateOrder,
  useGetQueueEstimate,
  getGetQueueEstimateQueryKey,
  UploadedFile,
} from "@workspace/api-client-react";
import { uploadFile } from "@/lib/upload-utils";
import {
  validateCheckoutContact,
  validatePaymentRequirements,
  normalizeEstimatedWaitMinutes,
  isCounterPaymentAvailable,
  MAX_COUNTER_PAYMENT_COPIES,
} from "@/lib/workflow-rules";
import { format, addMinutes, isBefore, setHours, setMinutes, parseISO } from "date-fns";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
];

// Business hours: 8am–6pm Mon–Sat
const OPEN_HOUR = 8;
const CLOSE_HOUR = 18;
const OPEN_DAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat

// Pricing (₱)
const PAGE_PRICE: Record<string, number> = { bw: 3, colored: 10 };
const ID_PRICE: Record<string, number> = { "1x1": 15, "2x2": 20, Passport: 25 };

function computeTotalAmount(
  serviceType: string | null,
  printColor: string | undefined,
  photoSize: string | undefined,
  copies: number,
  pageCount: number
): number {
  if (serviceType === "id-picture") {
    const price = photoSize ? (ID_PRICE[photoSize] ?? 20) : 20;
    return price * copies;
  }
  const perPage = printColor === "colored" ? PAGE_PRICE.colored : PAGE_PRICE.bw;
  return perPage * pageCount * copies;
}

function isBusinessHour(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  return OPEN_DAYS.includes(day) && hour >= OPEN_HOUR && hour < CLOSE_HOUR;
}

function getNextBusinessSlot(): Date {
  const now = new Date();
  const candidate = addMinutes(now, 30);
  if (isBusinessHour(candidate)) return candidate;
  const next = new Date(candidate);
  while (!isBusinessHour(next)) {
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    if (next.getHours() >= CLOSE_HOUR || !OPEN_DAYS.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
      next.setHours(OPEN_HOUR, 0, 0, 0);
    }
  }
  return next;
}

function generateTimeSlots(): { label: string; value: string }[] {
  const slots: { label: string; value: string }[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (const m of [0, 30]) {
      const label = format(setMinutes(setHours(new Date(), h), m), "h:mm a");
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push({ label, value });
    }
  }
  return slots;
}

const contactSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").or(z.literal("")),
  phone: z.string().optional(),
});

// ── Lightbox ─────────────────────────────────────────────────────────────────
function FileViewerDialog({
  file,
  open,
  onClose,
}: {
  file: UploadedFile | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!file) return null;
  const ext = file.originalName.split(".").pop()?.toLowerCase() ?? "";
  const isImage = file.assetType === "image";
  const isPdf = ext === "pdf";
  const isOffice = ["docx", "xlsx", "pptx", "doc", "xls", "ppt"].includes(ext);
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
        <DialogTitle className="sr-only">{file.originalName}</DialogTitle>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{file.originalName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={file.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
            </a>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="bg-muted/30 flex items-center justify-center" style={{ minHeight: 520 }}>
          {isImage && (
            <img src={file.url} alt={file.originalName}
              className="max-h-[70vh] max-w-full object-contain rounded" />
          )}
          {isPdf && (
            <iframe src={file.url} title={file.originalName}
              className="w-full border-0" style={{ height: "70vh" }} />
          )}
          {isOffice && (
            <iframe src={googleViewerUrl} title={file.originalName}
              className="w-full border-0" style={{ height: "70vh" }} />
          )}
          {!isImage && !isPdf && !isOffice && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <FileText className="w-16 h-16 text-primary/40" />
              <p className="text-muted-foreground">
                Preview not available for <strong>.{ext}</strong> files.
              </p>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" /> Open file
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sheet thumbnail ───────────────────────────────────────────────────────────
function SheetPreview({
  file,
  index,
  onRemove,
  onClick,
  isBW,
}: {
  file: UploadedFile;
  index: number;
  onRemove: (i: number) => void;
  onClick: (file: UploadedFile) => void;
  isBW: boolean;
}) {
  const isImage = file.assetType === "image";
  const shortName =
    file.originalName.length > 24
      ? file.originalName.slice(0, 21) + "…"
      : file.originalName;

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative">
        <button
          type="button"
          onClick={() => onClick(file)}
          className="bg-white rounded shadow-[4px_4px_16px_rgba(0,0,0,0.18)] border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-[4px_4px_24px_rgba(0,0,0,0.28)] transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ width: 120, height: 160 }}
          title="Click to preview"
        >
          {isImage ? (
            <img
              src={file.url}
              alt={file.originalName}
              className="w-full h-full object-cover"
              style={isBW ? { filter: "grayscale(100%)" } : undefined}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4"
              style={isBW ? { filter: "grayscale(100%)" } : undefined}>
              <FileText className="w-10 h-10 text-primary/60" />
              <span className="text-[10px] text-center break-all leading-tight text-gray-400">
                {file.originalName.split(".").pop()?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
            <ZoomIn className="w-7 h-7 text-white drop-shadow" />
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          className="absolute -top-2 -right-2 bg-white rounded-full shadow text-destructive hover:bg-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
          title="Remove file"
        >
          <XCircle className="w-5 h-5" />
        </button>
        <div
          className="absolute bottom-0 right-0 w-0 h-0 pointer-events-none"
          style={{ borderLeft: "14px solid transparent", borderBottom: "14px solid #e5e7eb" }}
        />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
          SHEET {index + 1}
        </p>
        <p className="text-[11px] text-gray-500 max-w-[120px] truncate" title={file.originalName}>
          {shortName}
        </p>
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = [
    { label: "Transaction", icon: CreditCard },
    { label: "Review", icon: Printer },
    { label: "Pickup", icon: Calendar },
    { label: "Payment", icon: CreditCard },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <div key={s.label} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${active ? "text-primary" : done ? "text-green-600" : "text-muted-foreground"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${active ? "border-primary bg-primary text-white" : done ? "border-green-600 bg-green-600 text-white" : "border-muted-foreground/30"}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 mb-4 ${step > num ? "bg-green-600" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ReviewOrder() {
  const [_loc, setLocation] = useLocation();
  const { toast } = useToast();
  const { state, updateState, clearState } = useOrder();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>(state.files || []);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Pickup state
  const today = new Date();
  const defaultSlot = getNextBusinessSlot();
  const [pickupDate, setPickupDate] = useState<string>(
    state.pickupTime ? format(parseISO(state.pickupTime), "yyyy-MM-dd") : format(defaultSlot, "yyyy-MM-dd")
  );
  const [pickupTimeStr, setPickupTimeStr] = useState<string>(
    state.pickupTime ? format(parseISO(state.pickupTime), "HH:mm") : format(defaultSlot, "HH:mm")
  );

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"counter" | "online" | null>(
    state.paymentMethod || null
  );
  const [paymentReference, setPaymentReference] = useState(state.paymentReference || "");
  const [receiptFile, setReceiptFile] = useState<UploadedFile | null>(
    state.paymentReceiptUrl && state.paymentReceiptFilename
      ? { filename: state.paymentReceiptFilename, originalName: state.paymentReceiptFilename, mimeType: "image/jpeg", size: 0, url: state.paymentReceiptUrl, assetType: "image" }
      : null
  );
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const createOrder = useCreateOrder();
  const isBW = state.printColor === "bw";
  const copies = state.copies || 1;
  const counterPaymentAvailable = isCounterPaymentAvailable(copies);

  // Compute total page count from uploaded files
  const totalPageCount = files.reduce((acc, f) => acc + (f.pageCount || 1), 0) || 1;
  const totalAmount = computeTotalAmount(
    state.serviceType,
    state.printColor,
    state.photoSize,
    state.copies || 1,
    totalPageCount
  );

  const estimateParams = {
    printColor: state.printColor || "bw",
    pageCount: files.length || 1,
    copies: state.copies || 1,
  };
  const { data: queueEstimate } = useGetQueueEstimate(
    estimateParams,
    { query: { queryKey: getGetQueueEstimateQueryKey(estimateParams), refetchInterval: 15000 } }
  );

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      customerName: state.customerName,
      email: state.email,
      phone: state.phone || "",
    },
  });

  useEffect(() => {
    if (!state.serviceType || state.files.length === 0) {
      setLocation("/");
    }
  }, [state, setLocation]);

  useEffect(() => {
    if (!counterPaymentAvailable && paymentMethod === "counter") {
      setPaymentMethod("online");
    }
  }, [counterPaymentAvailable, paymentMethod]);

  if (!state.serviceType || state.files.length === 0) return null;

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setIsUploading(true);
    try {
      const uploads = await Promise.all(
        selected.map(async (f) => {
          if (f.size > MAX_FILE_SIZE) throw new Error(`${f.name} too large (max 200MB)`);
          if (!ACCEPTED_FILE_TYPES.includes(f.type)) throw new Error(`${f.name}: unsupported format`);
          return await uploadFile(f);
        })
      );
      setFiles((prev) => [...prev, ...uploads]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Receipt must be under 200MB.", variant: "destructive" });
      return;
    }
    setIsUploadingReceipt(true);
    try {
      const uploaded = await uploadFile(file);
      setReceiptFile(uploaded);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = "";
    }
  };

  // Transaction type → Review
  const handleTransactionNext = () => {
    if (!paymentMethod) {
      toast({
        title: "Select a transaction type",
        description: "Choose pay at the counter or online transaction.",
        variant: "destructive",
      });
      return;
    }
    if (paymentMethod === "counter" && !counterPaymentAvailable) {
      toast({
        title: "Online transaction required",
        description: `Orders above ${MAX_COUNTER_PAYMENT_COPIES} copies must be paid online.`,
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  // Review → Pickup
  const handleReviewNext = contactForm.handleSubmit((values) => {
    if (files.length === 0) {
      toast({ title: "No files", description: "Please add at least one file.", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({
        title: "Select a transaction type",
        description: "Choose pay at the counter or online transaction.",
        variant: "destructive",
      });
      return;
    }
    const contactValidation = validateCheckoutContact(paymentMethod, values.email);
    if (!contactValidation.valid) {
      toast({
        title: "Email required",
        description: contactValidation.message,
        variant: "destructive",
      });
      return;
    }
    updateState({ ...values, files });
    setStep(3);
  });

  // Build combined pickup datetime
  function getPickupISO(): string {
    const [year, month, day] = pickupDate.split("-").map(Number);
    const [hour, minute] = pickupTimeStr.split(":").map(Number);
    const d = new Date(year, month - 1, day, hour, minute, 0);
    return d.toISOString();
  }

  function isPickupValid(): { valid: boolean; msg?: string } {
    const [year, month, day] = pickupDate.split("-").map(Number);
    const [hour, minute] = pickupTimeStr.split(":").map(Number);
    const d = new Date(year, month - 1, day, hour, minute, 0);
    if (isBefore(d, addMinutes(new Date(), 15))) return { valid: false, msg: "Pickup time must be at least 15 minutes from now." };
    if (!OPEN_DAYS.includes(d.getDay())) return { valid: false, msg: "The shop is closed on Sundays. Please choose another day." };
    if (d.getHours() < OPEN_HOUR || d.getHours() >= CLOSE_HOUR) return { valid: false, msg: `Business hours are ${OPEN_HOUR}:00 AM – ${CLOSE_HOUR - 12}:00 PM only.` };
    return { valid: true };
  }

  // Pickup → Payment
  const handlePickupNext = () => {
    const check = isPickupValid();
    if (!check.valid) {
      toast({ title: "Invalid pickup time", description: check.msg, variant: "destructive" });
      return;
    }
    updateState({ pickupTime: getPickupISO() });
    setStep(4);
  };

  // Final submit
  const handleSubmitOrder = () => {
    const paymentValidation = validatePaymentRequirements({
      paymentMethod,
      paymentReference,
      hasReceipt: !!receiptFile,
      copies,
    });
    if (!paymentValidation.valid) {
      toast({
        title: "Payment details required",
        description: paymentValidation.message,
        variant: "destructive",
      });
      return;
    }

    const pickupISO = getPickupISO();
    updateState({ paymentMethod: paymentMethod ?? undefined, totalAmount, paymentReference, paymentReceiptFilename: receiptFile?.filename, paymentReceiptUrl: receiptFile?.url });

    createOrder.mutate(
      {
        data: {
          serviceType: state.serviceType!,
          customerName: state.customerName,
          email: paymentMethod === "online" ? state.email : "",
          phone: paymentMethod === "online" ? state.phone || undefined : undefined,
          paperSize: state.paperSize,
          printColor: state.printColor,
          copies: state.copies,
          photoSize: state.photoSize,
          files: files.map((f) => f.filename),
          pickupTime: pickupISO,
          paymentMethod: paymentMethod,
          totalAmount: totalAmount,
          paymentReference: paymentMethod === "online" ? paymentReference : undefined,
          paymentReceiptFilename: paymentMethod === "online" ? receiptFile?.filename : undefined,
        } as any,
      },
      {
        onSuccess: (data) => {
          clearState();
           setLocation(
             `/order/confirmation?orderNumber=${data.orderNumber}&wait=${queueEstimate?.estimatedWaitMinutes || 1}&method=${paymentMethod}`
           );
        },
        onError: () => {
          toast({
            title: "Order Failed",
            description: "There was a problem submitting your order. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCancel = () => {
    clearState();
    setLocation("/");
  };

  // ── Compute ready-by time display ──
  const readyByTime = queueEstimate?.readyByTime
    ? format(parseISO(queueEstimate.readyByTime), "h:mm a")
    : null;
  const waitMins = normalizeEstimatedWaitMinutes(queueEstimate?.estimatedWaitMinutes);

  // Min date for picker (today)
  const minDate = format(today, "yyyy-MM-dd");
  const timeSlots = generateTimeSlots();

  // Pricing breakdown label
  const pricingLabel = state.serviceType === "id-picture"
    ? `${state.photoSize || "2x2"} × ${state.copies || 1} set${(state.copies || 1) !== 1 ? "s" : ""}`
    : `${isBW ? "B&W" : "Colored"} × ${totalPageCount} page${totalPageCount !== 1 ? "s" : ""} × ${state.copies || 1} cop${(state.copies || 1) !== 1 ? "ies" : "y"}`;
  const pricePerUnit = state.serviceType === "id-picture"
    ? ID_PRICE[state.photoSize || "2x2"] ?? 20
    : (isBW ? PAGE_PRICE.bw : PAGE_PRICE.colored);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Place Your Order</h1>
        <p className="text-muted-foreground">Complete each step to submit your print job.</p>
      </div>

      <StepIndicator step={step} />

      {/* ── STEP 1: Transaction Type ── */}
      {step === 1 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5 text-primary" /> Choose Transaction Type
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select how you will pay before reviewing your order.
              </p>
              {!counterPaymentAvailable && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Orders above {MAX_COUNTER_PAYMENT_COPIES} copies require an online transaction.
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("counter")}
                  disabled={!counterPaymentAvailable}
                  className={`border-2 rounded-xl p-5 text-left transition-all flex flex-col gap-2 ${
                    !counterPaymentAvailable
                      ? "cursor-not-allowed border-border bg-muted/50 opacity-60"
                      :
                    paymentMethod === "counter"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote className={`w-5 h-5 ${paymentMethod === "counter" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold">Pay at the Counter</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {counterPaymentAvailable
                      ? "Pay in cash when you pick up your order."
                      : `Available only up to ${MAX_COUNTER_PAYMENT_COPIES} copies.`}
                  </p>
                  {!counterPaymentAvailable ? (
                    <Badge variant="outline" className="self-start mt-1 text-[10px]">
                      Not available
                    </Badge>
                  ) : paymentMethod === "counter" ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] self-start mt-1">
                      Selected
                    </Badge>
                   ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`border-2 rounded-xl p-5 text-left transition-all flex flex-col gap-2 ${
                    paymentMethod === "online"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className={`w-5 h-5 ${paymentMethod === "online" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold">Online Transaction</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {counterPaymentAvailable
                      ? "Pay using GCash or Maya and upload your receipt."
                       : `Required for orders above ${MAX_COUNTER_PAYMENT_COPIES} copies. Upload your receipt.`}
                  </p>
                  {!counterPaymentAvailable ? (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] self-start mt-1">
                      Required
                    </Badge>
                  ) : paymentMethod === "online" ? (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] self-start mt-1">
                      Selected
                    </Badge>
                   ) : null}
                </button>
              </div>
            </CardContent>
          </Card>
          <Button
            type="button"
            onClick={handleTransactionNext}
            disabled={!paymentMethod}
            className="w-full flex items-center justify-center gap-2 font-semibold"
          >
            Continue to Review <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Queue estimate banner */}
      {step === 2 && (
        <div className="rounded-lg border bg-blue-50 border-blue-200 px-4 py-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-blue-800">
              Estimated wait: ~{waitMins} min
              {readyByTime ? ` · Ready by ${readyByTime}` : ""}
            </span>
            <span className="text-blue-600 ml-2">
              ({queueEstimate?.queueLength ?? 0} job{queueEstimate?.queueLength !== 1 ? "s" : ""} ahead)
            </span>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review ── */}
      {step === 2 && (
        <>
          {/* Contact Info */}
          <Form {...contactForm}>
            <form id="contact-form" onSubmit={handleReviewNext}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4 text-primary" /> Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={contactForm.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="Juan Dela Cruz" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {paymentMethod === "online" && (
                    <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="juan@example.com" {...field} /></FormControl>
                          <FormDescription>For order notifications.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl><Input placeholder="09123456789" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>
                  )}
                </CardContent>
              </Card>
            </form>
          </Form>

          {/* Print Color Indicator */}
          {isBW && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/20">
              <AlertCircle className="w-4 h-4" />
              B&amp;W mode — preview shows grayscale as it will print.
            </div>
          )}

          {/* Virtual Print Preview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 justify-center text-base">
                <Printer className="w-5 h-5 text-primary" />
                Virtual Print Preview
                {isBW && <Badge variant="secondary" className="ml-1">B&amp;W</Badge>}
              </CardTitle>
              <p className="text-center text-sm text-muted-foreground">
                Click any sheet to view the full document
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 justify-center py-4 min-h-[200px]">
                {files.map((file, i) => (
                  <SheetPreview
                    key={i}
                    file={file}
                    index={i}
                    onRemove={removeFile}
                    onClick={setPreviewFile}
                    isBW={isBW}
                  />
                ))}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-muted/40 hover:bg-muted border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                    style={{ width: 120, height: 160 }}
                    title="Add more files"
                  >
                    {isUploading ? (
                      <span className="text-xs text-center px-2">Uploading…</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6" />
                        <span className="text-xs">Add file</span>
                      </div>
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground/50 font-bold tracking-widest">&nbsp;</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAddFiles}
                accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
              />

              <p className="text-center text-xs text-muted-foreground mt-1">
                Hover a sheet to remove it · Click to preview
              </p>
            </CardContent>
          </Card>

          {/* Print Options Summary + Price Estimate */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground block text-xs">Size</span>{state.paperSize || "A4"}</div>
                <div><span className="text-muted-foreground block text-xs">Color</span>{isBW ? "Black & White" : "Colored"}</div>
                <div><span className="text-muted-foreground block text-xs">Copies</span>{state.copies || 1}</div>
                <div>
                  <span className="text-muted-foreground block text-xs">Est. Total</span>
                  <span className="font-bold text-primary">₱{totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Button type="button" variant="outline" onClick={() => { updateState({ files }); setLocation("/order/printing"); }}
              className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}
              className="flex items-center gap-2 text-destructive border-destructive/40 hover:bg-destructive/5">
              <XCircle className="w-4 h-4" /> Cancel
            </Button>
            <Button type="submit" form="contact-form"
              className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold"
              disabled={files.length === 0}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── STEP 3: Pickup Scheduling ── */}
      {step === 3 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5 text-primary" /> Schedule Pickup
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Business hours: Mon–Sat · 8:00 AM – 6:00 PM
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {readyByTime && (
                <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-green-800">
                    Based on the current queue, your order could be ready by <strong>{readyByTime}</strong>.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Pickup Date</label>
                <Input
                  type="date"
                  min={minDate}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pickup Time</label>
                <select
                  value={pickupTimeStr}
                  onChange={(e) => setPickupTimeStr(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Your selected time: <strong>
                    {format(new Date(`${pickupDate}T${pickupTimeStr}`), "EEEE, MMMM d · h:mm a")}
                  </strong>
                </p>
              </div>

              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <strong>Note:</strong> Your selected pickup time is locked to your order. Please arrive during your chosen window. The shop closes at 6:00 PM — no late pickups.
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
             <Button type="button" variant="outline" onClick={() => setStep(2)}
              className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
             <Button type="button" onClick={handlePickupNext}
              className="flex items-center gap-2 font-semibold">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── STEP 4: Payment ── */}
      {step === 4 && (
        <>
          {/* Pricing Breakdown */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4 text-primary" /> Order Total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{pricingLabel}</span>
                <span>₱{pricePerUnit} × {state.serviceType === "id-picture" ? (state.copies || 1) : totalPageCount * (state.copies || 1)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total Amount</span>
                <span className="text-primary text-xl">₱{totalAmount}</span>
              </div>
            </CardContent>
          </Card>

           <Card className="border-primary/20 bg-primary/5">
             <CardContent className="pt-4 pb-4 flex items-center gap-3">
               {paymentMethod === "counter"
                 ? <Banknote className="w-5 h-5 text-primary" />
                 : <Smartphone className="w-5 h-5 text-primary" />}
               <div className="text-sm">
                 <p className="font-semibold">
                   {paymentMethod === "counter" ? "Pay at the Counter" : "Online Transaction"}
                 </p>
                 <p className="text-muted-foreground">
                   {paymentMethod === "counter"
                     ? "Cash payment when you pick up your order."
                     : "GCash or Maya payment with receipt verification."}
                 </p>
               </div>
             </CardContent>
           </Card>

          {/* Counter payment confirmation */}
          {paymentMethod === "counter" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">Counter payment confirmed</p>
                  <p className="text-muted-foreground">
                    Pay <strong className="text-primary">₱{totalAmount}</strong> in cash at the counter when you pick up your order.
                    Your ticket will be placed at the <strong>front of the queue</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Online payment form */}
          {paymentMethod === "online" && (
            <Card>
              <CardContent className="pt-5 space-y-5">
                {/* GCash/Maya info */}
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Send payment to</p>
                  <p className="text-2xl font-bold text-primary">JandC Print Shop</p>
                  <p className="text-sm text-muted-foreground">GCash / Maya · Amount: <strong>₱{totalAmount}</strong></p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Number</label>
                  <Input
                    placeholder="e.g. 2024071512345678"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">The reference number from your GCash or Maya transaction.</p>
                </div>

                {/* Receipt upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Screenshot</label>
                  {receiptFile ? (
                    <div className="relative border rounded-lg overflow-hidden bg-muted/20">
                      <img
                        src={receiptFile.url}
                        alt="Payment receipt"
                        className="w-full max-h-64 object-contain p-2"
                      />
                      <div className="flex items-center justify-between p-2 border-t bg-card">
                        <span className="text-xs text-muted-foreground truncate">{receiptFile.originalName}</span>
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => setReceiptFile(null)}
                          className="text-destructive hover:text-destructive h-7 px-2 text-xs">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => receiptInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Upload payment screenshot</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG · max 200MB</p>
                      </div>
                      {isUploadingReceipt && <p className="text-xs text-primary">Uploading…</p>}
                    </div>
                  )}
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleReceiptUpload}
                  />
                </div>

                {(!receiptFile || paymentReference.trim().length < 4) && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {!receiptFile
                      ? "Upload your payment screenshot to enable order placement."
                      : "Enter your reference number to continue."}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order summary before final submit */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2 text-sm">
              <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Order Summary</p>
              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-muted-foreground">Files</span>
                <span className="font-medium">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                <span className="text-muted-foreground">Print type</span>
                <span className="font-medium">{isBW ? "Black & White" : "Colored"} · {state.paperSize}</span>
                <span className="text-muted-foreground">Copies</span>
                <span className="font-medium">{copies}</span>
                <span className="text-muted-foreground">Pickup</span>
                <span className="font-medium">
                  {format(new Date(`${pickupDate}T${pickupTimeStr}`), "MMM d · h:mm a")}
                </span>
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">₱{totalAmount}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
             <Button type="button" variant="outline" onClick={() => setStep(3)}
              className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmitOrder}
              className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold"
              disabled={
                createOrder.isPending ||
                !paymentMethod ||
                files.length === 0 ||
                (paymentMethod === "online" && (!receiptFile || paymentReference.trim().length < 4))
              }
            >
              <Ticket className="w-4 h-4" />
              {createOrder.isPending ? "Submitting…" : "Get Ticket"}
            </Button>
          </div>
        </>
      )}

      {/* Full-document lightbox */}
      <FileViewerDialog
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
