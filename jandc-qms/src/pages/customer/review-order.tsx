import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { JNConnectLogo } from "@/components/ui/jnconnect-logo";
import {
  Printer,
  FileText,
  User,
  Upload,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  CreditCard,
  ZoomIn,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  validatePaymentRequirements,
  isLargePrintOrder,
  LARGE_ORDER_PAGE_THRESHOLD,
  normalizeEstimatedWaitMinutes,
} from "@/lib/workflow-rules";
import { GCashQRCode } from "@/components/ui/gcash-qr";
import { format, addMinutes, parseISO } from "date-fns";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
];

// Pricing (₱)
const PAGE_PRICE: Record<string, number> = { bw: 3, colored: 10 };

function computeTotalAmount(
  printColor: string,
  copies: number,
  pageCount: number
): number {
  const perPage = printColor === "colored" ? PAGE_PRICE.colored : PAGE_PRICE.bw;
  return perPage * pageCount * copies;
}

const TIME_SLOTS = [
  { value: "08:00", label: "08:00 AM" },
  { value: "08:30", label: "08:30 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "13:30", label: "01:30 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "17:30", label: "05:30 PM" },
];

function getPickupDates(): Array<{ value: string; label: string }> {
  const dates: Array<{ value: string; label: string }> = [];
  const curr = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(curr.getTime() + i * 24 * 60 * 60 * 1000);
    if (d.getDay() === 0) continue; // Closed on Sundays
    const val = format(d, "yyyy-MM-dd");
    let label = format(d, "EEE, MMM d");
    if (i === 0) label += " (Today)";
    else if (i === 1) label += " (Tomorrow)";
    dates.push({ value: val, label });
  }
  return dates;
}

export function ReviewOrder() {
  const [_loc, setLocation] = useLocation();
  const { toast } = useToast();
  const { state, updateState, clearState } = useOrder();

  // Workflow Stage: 1 = Preview & Specs (Step 3.1/3.2), 2 = GCash QR & Receipt Submission (Step 4.1)
  const [currentStage, setCurrentStage] = useState<1 | 2>(1);

  // Files from state
  const [files, setFiles] = useState<UploadedFile[]>(state.files || []);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  // Print Specifications
  const [paperSize, setPaperSize] = useState<string>(state.paperSize || "A4");
  const [printColor, setPrintColor] = useState<"bw" | "colored">((state.printColor as any) || "bw");
  const [copies, setCopies] = useState<number>(state.copies || 1);
  const [backToBack, setBackToBack] = useState<boolean>(false);

  // Order Mode (walk-in vs scheduled)
  const [orderMode, setOrderMode] = useState<"walk-in" | "scheduled">(state.orderMode || "walk-in");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const pickupDates = getPickupDates();
  const [scheduledDate, setScheduledDate] = useState<string>(
    state.pickupTime ? format(parseISO(state.pickupTime), "yyyy-MM-dd") : pickupDates[0]?.value || ""
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    state.pickupTime ? format(parseISO(state.pickupTime), "HH:mm") : "14:00"
  );

  // In-System File Editing & Transformations
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [filterMode, setFilterMode] = useState<"original" | "grayscale">("original");
  const [pageRange, setPageRange] = useState<string>("all");
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [isUploadingMore, setIsUploadingMore] = useState(false);
  const [previewZoomModal, setPreviewZoomModal] = useState(false);

  // Step 4.1: GCash Payment & Receipt Submission state
  const [receiptFile, setReceiptFile] = useState<UploadedFile | null>(
    state.paymentReceiptUrl && state.paymentReceiptFilename
      ? {
          filename: state.paymentReceiptFilename,
          originalName: state.paymentReceiptFilename,
          mimeType: "image/jpeg",
          size: 0,
          url: state.paymentReceiptUrl,
          assetType: "image",
        }
      : null
  );
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string>(state.paymentReference || "");
  const [receiptAmountInput, setReceiptAmountInput] = useState<string>(
    state.receiptAmount ? String(state.receiptAmount) : ""
  );

  const createOrder = useCreateOrder();

  // Guard: if no files or service type, return to order entry
  useEffect(() => {
    if (!state.serviceType || (!state.files || state.files.length === 0)) {
      setLocation("/order/printing");
    }
  }, [state, setLocation]);

  // Compute total pages
  const totalPageCount = files.reduce((acc, f) => acc + (f.pageCount || 1), 0) || 1;
  const totalAmount = computeTotalAmount(printColor, copies, totalPageCount);

  // Large order check
  const isLargeOrder = isLargePrintOrder(totalPageCount, copies);

  // Live queue estimate for elapsed time
  const estimateParams = {
    printColor,
    pageCount: totalPageCount,
    copies,
  };
  const { data: queueEstimate } = useGetQueueEstimate(estimateParams, {
    query: { queryKey: getGetQueueEstimateQueryKey(estimateParams), refetchInterval: 10000 },
  });

  const estimatedWaitMinutes = normalizeEstimatedWaitMinutes(queueEstimate?.estimatedWaitMinutes ?? 5);
  const ordersInQueue = queueEstimate?.ordersAhead ?? 0;

  const currentFile = files[selectedFileIndex] || files[0];

  // In-System file rotation handler
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // In-System Reconfirm & Update Preview
  const handleReconfirmPreview = () => {
    toast({
      title: "Preview Updated",
      description: `Applied rotation (${rotation}°), filter (${filterMode}), and page range settings. Preview updated.`,
    });
    setIsEditingFile(false);
  };

  // Upload more / replace file
  const handleAddMoreFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setIsUploadingMore(true);
    try {
      const uploads = await Promise.all(
        selected.map(async (f) => {
          if (f.size > MAX_FILE_SIZE) throw new Error(`${f.name} is too large (max 200MB)`);
          if (!ACCEPTED_FILE_TYPES.includes(f.type)) throw new Error(`${f.name}: unsupported format`);
          return await uploadFile(f);
        })
      );
      setFiles((prev) => [...prev, ...uploads]);
      toast({ title: "Files Added", description: `Added ${uploads.length} new document(s) to order.` });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingMore(false);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    if (files.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "Your order must have at least one file.",
        variant: "destructive",
      });
      return;
    }
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (selectedFileIndex >= newFiles.length) {
      setSelectedFileIndex(0);
    }
  };

  // Receipt upload
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
      toast({ title: "Receipt uploaded", description: "GCash payment receipt screenshot saved." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = "";
    }
  };

  // Receipt Amount matching check
  const parsedReceiptAmount = parseFloat(receiptAmountInput);
  const isAmountMatching =
    !isNaN(parsedReceiptAmount) && Math.abs(parsedReceiptAmount - totalAmount) < 0.01;

  // Validation before placing order
  const paymentValidation = validatePaymentRequirements({
    paymentMethod: "online",
    paymentReference,
    hasReceipt: !!receiptFile,
    copies,
    receiptAmount: isNaN(parsedReceiptAmount) ? null : parsedReceiptAmount,
    totalCost: totalAmount,
  });

  // Switch to Scheduled Pickup handler
  const handleApplySchedule = () => {
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const [year, month, day] = scheduledDate.split("-").map(Number);
    const scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0);

    setOrderMode("scheduled");
    updateState({
      orderMode: "scheduled",
      pickupTime: scheduledDateTime.toISOString(),
    });
    setShowScheduleDialog(false);
    toast({
      title: "Order Switched to Scheduled",
      description: `Pickup set for ${format(scheduledDateTime, "EEEE, MMM d 'at' h:mm a")}.`,
    });
  };

  // Proceed from Step 3 (Preview & Specs) to Step 4 (GCash QR & Receipt)
  const handleConfirmOrderSpecifications = () => {
    updateState({
      paperSize,
      printColor,
      copies,
      files,
      totalAmount,
    });
    setCurrentStage(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Order Submission (Step 4.1 -> Step 5.1)
  const handlePlaceOrder = () => {
    if (!paymentValidation.valid) {
      toast({
        title: "Payment Requirements Incomplete",
        description: paymentValidation.message || "Please complete all payment steps.",
        variant: "destructive",
      });
      return;
    }

    let pickupISO = state.pickupTime;
    if (orderMode === "scheduled" && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const [year, month, day] = scheduledDate.split("-").map(Number);
      pickupISO = new Date(year, month - 1, day, hours, minutes, 0).toISOString();
    }

    const rawDigits = state.orderNumber ? state.orderNumber.replace(/\D/g, "").slice(0, 3) : "";
    const finalOrderNumber = rawDigits.length === 3 ? rawDigits : String(Math.floor(100 + Math.random() * 900));
    const finalCustomerName =
      orderMode === "walk-in"
        ? `Order #${finalOrderNumber}`
        : (state.customerName || "Customer");
    const finalEmail = orderMode === "walk-in" ? "" : (state.email || "");
    const finalPhone = orderMode === "walk-in" ? "" : (state.phone || undefined);

    createOrder.mutate(
      {
        data: {
          serviceType: "printing",
          orderMode,
          orderNumber: finalOrderNumber,
          customerName: finalCustomerName,
          email: finalEmail,
          phone: finalPhone,
          paperSize,
          printColor,
          copies,
          files: files.map((f) => f.filename),
          pickupTime: pickupISO,
          paymentMethod: "online",
          totalAmount,
          paymentReference,
          paymentReceiptFilename: receiptFile?.filename,
        } as any,
      },
      {
        onSuccess: (data) => {
          clearState();
          setLocation(
            `/order/confirmation?orderNumber=${data.orderNumber}&wait=${estimatedWaitMinutes}&mode=${orderMode}`
          );
        },
        onError: () => {
          toast({
            title: "Order Placement Failed",
            description: "There was a problem submitting your order. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (!state.serviceType || files.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Workflow Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold">
              {orderMode === "walk-in" ? "Walk-in Order Procedure" : "Scheduled Order Procedure"}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              {orderMode === "walk-in" ? (
                <>
                  Tracking ID:{" "}
                  <strong className="text-primary font-mono font-bold">
                    {state.orderNumber ? state.orderNumber.replace(/\D/g, "").slice(0, 3) || "101" : "101"}
                  </strong>
                </>
              ) : (
                <>
                  Customer: <strong>{state.customerName}</strong>
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {currentStage === 1
              ? "Print Preview & Specifications"
              : "GCash QR & Receipt Submission"}
          </h1>
        </div>

        {/* Step indicator pills */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              currentStage === 1
                ? "bg-primary text-white"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Preview & Specs</span>
          </div>
          <div className="w-4 h-0.5 bg-muted-foreground/30" />
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              currentStage === 2
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>GCash & Receipt</span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* STAGE 1: STEP 3.1 & 3.2 (PREVIEW, SPECS, WARNING, PRICING, IN-SYSTEM EDIT) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {currentStage === 1 && (
        <div className="space-y-6">
          {/* Large Print Order Warning (Step 3.1) */}
          {orderMode === "walk-in" && isLargeOrder && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-900">
                      Large Print Order Recommendation
                    </h3>
                    <Badge className="bg-amber-600 text-white text-[10px]">
                      {totalPageCount * copies} Total Pages
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed max-w-xl">
                    Your order consists of <strong>{totalPageCount} page(s) × {copies} copy/copies</strong>. For large print runs, it is recommended that large orders be set for <strong>Schedule</strong> instead of Walk-in to prevent long waiting counter queues.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowScheduleDialog(true)}
                className="bg-amber-800 hover:bg-amber-900 text-white font-semibold shrink-0"
              >
                <Calendar className="w-4 h-4 mr-1.5" /> Switch to Scheduled Order
              </Button>
            </div>
          )}

          {/* Scheduled Status Banner if Scheduled */}
          {orderMode === "scheduled" && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-secondary" />
                <span className="text-xs text-foreground font-medium">
                  Scheduled Pickup: <strong>{scheduledDate}</strong> at <strong>{scheduledTime}</strong>
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowScheduleDialog(true)}
                className="text-xs h-7 text-secondary hover:bg-secondary/20"
              >
                Change Slot
              </Button>
            </div>
          )}

          {/* Main Grid: Left = PDF Print Preview & In-system Editor; Right = Specifications & Pricing */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: PDF Print Preview (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="overflow-hidden border-2 shadow-sm">
                <CardHeader className="bg-muted/30 pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      PDF Print Preview
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Document: <strong>{currentFile?.originalName}</strong>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-bold text-xs">
                      Total: {totalPageCount} Page(s)
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPreviewZoomModal(true)}
                      title="Enlarge preview"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* PDF / Document Embed Stage */}
                <CardContent className="p-0 bg-neutral-900/5 min-h-[380px] flex items-center justify-center relative overflow-hidden">
                  {currentFile ? (
                    <div
                      className="w-full h-[400px] flex items-center justify-center transition-transform duration-200"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        filter:
                          filterMode === "grayscale" || printColor === "bw"
                            ? "grayscale(100%) contrast(110%)"
                            : "none",
                      }}
                    >
                      {currentFile.assetType === "image" ||
                      currentFile.originalName.match(/\.(jpg|jpeg|png)$/i) ? (
                        <img
                          src={currentFile.url}
                          alt={currentFile.originalName}
                          className="max-h-full max-w-full object-contain p-4 drop-shadow-md"
                        />
                      ) : currentFile.originalName.endsWith(".pdf") ? (
                        <iframe
                          src={`${currentFile.url}#toolbar=0&navpanes=0&scrollbar=0`}
                          title={currentFile.originalName}
                          className="w-full h-full border-0 bg-white"
                        />
                      ) : (
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                            currentFile.url
                          )}&embedded=true`}
                          title={currentFile.originalName}
                          className="w-full h-full border-0 bg-white"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No file selected</p>
                  )}
                </CardContent>

                {/* In-System File Editing Bar */}
                <CardFooter className="bg-card border-t p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRotate}
                      className="h-8 text-xs font-medium"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1" />
                      Rotate ({rotation}°)
                    </Button>

                    <Button
                      type="button"
                      variant={filterMode === "grayscale" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() =>
                        setFilterMode((prev) => (prev === "grayscale" ? "original" : "grayscale"))
                      }
                      className="h-8 text-xs font-medium"
                    >
                      <Sliders className="w-3.5 h-3.5 mr-1" />
                      {filterMode === "grayscale" ? "B&W Preview" : "Color Preview"}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleReconfirmPreview}
                    className="h-8 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Reconfirm Preview
                  </Button>
                </CardFooter>
              </Card>

              {/* Multi-file selector sheets */}
              {files.length > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Select Sheet to Preview:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {files.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedFileIndex(idx);
                          setRotation(0);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium shrink-0 transition-all ${
                          selectedFileIndex === idx
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="max-w-[120px] truncate">{file.originalName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Print Specifications, Total Payment & Elapsed Time (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Print Specifications</CardTitle>
                  <CardDescription className="text-xs">
                    Configure preferred color, paper size, and number of copies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Color Preference */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preferred Color</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintColor("bw")}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          printColor === "bw"
                            ? "border-primary bg-primary/5 text-primary font-bold shadow-xs ring-1 ring-primary"
                            : "border-border bg-card hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-xs">Black & White</p>
                        <p className="text-[11px] text-muted-foreground font-normal">₱3.00 / page</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintColor("colored")}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          printColor === "colored"
                            ? "border-primary bg-primary/5 text-primary font-bold shadow-xs ring-1 ring-primary"
                            : "border-border bg-card hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-xs">Full Colored</p>
                        <p className="text-[11px] text-muted-foreground font-normal">₱10.00 / page</p>
                      </button>
                    </div>
                  </div>

                  {/* Paper Size */}
                  <div className="space-y-1.5">
                    <Label htmlFor="paperSize" className="text-xs font-semibold">Paper Size</Label>
                    <Select value={paperSize} onValueChange={setPaperSize}>
                      <SelectTrigger id="paperSize">
                        <SelectValue placeholder="Select paper size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (8.27" × 11.69")</SelectItem>
                        <SelectItem value="Short">Short / Letter (8.5" × 11")</SelectItem>
                        <SelectItem value="Long">Long / Legal (8.5" × 13")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Number of Copies */}
                  <div className="space-y-1.5">
                    <Label htmlFor="copiesInput" className="text-xs font-semibold">Number of Copies</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setCopies((prev) => Math.max(1, prev - 1))}
                      >
                        -
                      </Button>
                      <Input
                        id="copiesInput"
                        type="number"
                        min={1}
                        max={1000}
                        value={copies}
                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-center font-bold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setCopies((prev) => prev + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Back-to-Back toggle */}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs font-medium">Double-sided (Back-to-Back)</span>
                    <input
                      type="checkbox"
                      checked={backToBack}
                      onChange={(e) => setBackToBack(e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Total Payment & Elapsed Time Summary Card */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-muted-foreground">Order Breakdown:</span>
                    <span className="text-xs font-medium">
                      {totalPageCount} pages × {copies} copies = {totalPageCount * copies} sheets
                    </span>
                  </div>

                  {/* Total Payment */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Total Payment
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Rate: ₱{printColor === "colored" ? 10 : 3}.00 per page
                      </p>
                    </div>
                    <span className="text-3xl font-black text-primary tracking-tight">
                      ₱{totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Elapsed / Turnaround Time Display */}
                  <div className="rounded-lg bg-card p-3 border text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {orderMode === "walk-in" ? (
                        <span>Elapsed Turnaround Time: ~{estimatedWaitMinutes} mins</span>
                      ) : (
                        <span>Pickup Slot: {scheduledDate} at {scheduledTime}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {orderMode === "walk-in"
                        ? `Based on ${ordersInQueue} current walk-in order(s) ahead in shop queue.`
                        : "Your order will be printed and packed before your scheduled arrival."}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleConfirmOrderSpecifications}
                    className="w-full font-bold shadow-sm"
                  >
                    Confirm Order & Proceed to GCash Payment →
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* STAGE 2: STEP 4.1 (GCASH QR PROMPT & STRICT RECEIPT SUBMISSION)            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {currentStage === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStage(1)}
              className="text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Back to Preview & Specifications
            </Button>
            <span className="text-xs text-muted-foreground">
              Calculated Total: <strong>₱{totalAmount.toFixed(2)}</strong>
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: GCash QR Code Prompt */}
            <div>
              <GCashQRCode
                amount={totalAmount}
                orderNumber={state.orderNumber ? state.orderNumber.replace(/\D/g, "").slice(0, 3) || "101" : "101"}
                accountName="JandC Internet Cafe & Services"
                accountNumber="0917 123 4567"
              />
            </div>

            {/* Right: Designated Receipt Submission Box & Validation */}
            <div className="space-y-4">
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Receipt Submission Box</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Upload your GCash payment screenshot. Your receipt amount must strictly match the calculated cost.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Upload Dropzone */}
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-5 text-center bg-muted/10 hover:bg-muted/30 transition-colors relative">
                    <Upload className="w-8 h-8 text-primary/70 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground mb-1">
                      {receiptFile ? "Change Receipt Screenshot" : "Upload GCash Payment Receipt"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      JPG, JPEG, or PNG screenshot from your GCash app
                    </p>
                    <div className="relative inline-block">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleReceiptUpload}
                        disabled={isUploadingReceipt}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button type="button" variant="secondary" size="sm" disabled={isUploadingReceipt}>
                        {isUploadingReceipt ? "Uploading..." : "Select Screenshot"}
                      </Button>
                    </div>

                    {receiptFile && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Screenshot: {receiptFile.originalName}</span>
                      </div>
                    )}
                  </div>

                  {/* GCash Reference Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="paymentReference" className="text-xs font-semibold">
                      GCash Reference Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="paymentReference"
                      placeholder="e.g. 9012 3456 7890"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="font-mono text-sm"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Found on your GCash transaction confirmation receipt.
                    </p>
                  </div>

                  {/* Submitted Receipt Amount Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="receiptAmountInput" className="text-xs font-semibold">
                      Payment Amount on Receipt (₱) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="receiptAmountInput"
                      type="number"
                      step="0.01"
                      placeholder={`Exact amount: ${totalAmount.toFixed(2)}`}
                      value={receiptAmountInput}
                      onChange={(e) => setReceiptAmountInput(e.target.value)}
                      className="font-bold text-sm"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Calculated order cost: <strong>₱{totalAmount.toFixed(2)}</strong>. Both values must match.
                    </p>
                  </div>

                  {/* Amount Matching Status Callout */}
                  {receiptAmountInput && (
                    <div>
                      {isAmountMatching ? (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5 text-emerald-800 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Amount Verified!</p>
                            <p className="text-[11px] text-emerald-700">
                              Submitted receipt amount (₱{parsedReceiptAmount.toFixed(2)}) matches calculated total cost (₱{totalAmount.toFixed(2)}).
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2.5 text-destructive text-xs">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Receipt Amount Mismatch</p>
                            <p className="text-[11px] text-destructive leading-relaxed">
                              Submitted receipt amount (₱{isNaN(parsedReceiptAmount) ? "0.00" : parsedReceiptAmount.toFixed(2)}) must be exactly equal to the calculated cost (₱{totalAmount.toFixed(2)}) in order for the order to be placed.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t p-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={
                      createOrder.isPending ||
                      !paymentValidation.valid ||
                      !isAmountMatching ||
                      !receiptFile ||
                      paymentReference.trim().length < 4
                    }
                    className="w-full font-bold shadow-md bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    {createOrder.isPending ? "Placing Order..." : "Place Order & Get Ticket"}
                  </Button>

                  {(!isAmountMatching || !receiptFile || paymentReference.trim().length < 4) && (
                    <p className="text-[11px] text-center text-muted-foreground">
                      Upload receipt, enter reference, and ensure amounts match to enable order placement.
                    </p>
                  )}
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Switch to Scheduled Pickup Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Set Pickup Schedule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Avoid waiting in shop lines by scheduling your order pickup time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="schedDate" className="text-xs font-semibold">Select Pickup Date</Label>
              <Select value={scheduledDate} onValueChange={setScheduledDate}>
                <SelectTrigger id="schedDate">
                  <SelectValue placeholder="Choose date" />
                </SelectTrigger>
                <SelectContent>
                  {pickupDates.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedTime" className="text-xs font-semibold">Select Pickup Time</Label>
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger id="schedTime">
                  <SelectValue placeholder="Choose time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApplySchedule} className="font-semibold">
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enlarge Preview Modal */}
      <Dialog open={previewZoomModal} onOpenChange={setPreviewZoomModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-card">
            <DialogTitle className="text-sm font-medium truncate">
              {currentFile?.originalName}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] bg-neutral-900/5 flex items-center justify-center p-4">
            {currentFile &&
              (currentFile.assetType === "image" ||
              currentFile.originalName.match(/\.(jpg|jpeg|png)$/i) ? (
                <img
                  src={currentFile.url}
                  alt={currentFile.originalName}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <iframe
                  src={currentFile.url}
                  title={currentFile.originalName}
                  className="w-full h-full border-0 bg-white"
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
