import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload,
  X,
  FileText,
  ArrowRight,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Sparkles,
  Ticket,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOrder } from "@/components/order-provider";
import { uploadFile } from "@/lib/upload-utils";
import { UploadedFile, useGetQueueEstimate, getGetQueueEstimateQueryKey } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
];

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

export function PrintingForm() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { state, updateState } = useOrder();

  // Read URL query parameter for mode if passed
  const queryParams = new URLSearchParams(window.location.search);
  const modeFromQuery = queryParams.get("mode") as "walk-in" | "scheduled" | null;

  const [orderMode, setOrderMode] = useState<"walk-in" | "scheduled">(
    modeFromQuery || state.orderMode || "walk-in"
  );

  // For walk-in orders, order number is purely a 3-digit number with no letters
  const [walkInOrderNumber] = useState<string>(() => {
    if (state.orderNumber && /^\d{3}$/.test(state.orderNumber)) {
      return state.orderNumber;
    }
    return String(Math.floor(100 + Math.random() * 900));
  });

  const [customerName, setCustomerName] = useState(
    state.customerName?.startsWith("Walk-in") ? "" : (state.customerName || "")
  );
  const [email, setEmail] = useState(state.email || "");
  const [phone, setPhone] = useState(state.phone || "");

  // Pickup date & time for scheduled orders
  const pickupDates = getPickupDates();
  const defaultPickupDate = pickupDates[0]?.value || format(new Date(), "yyyy-MM-dd");
  const [selectedPickupDate, setSelectedPickupDate] = useState<string>(
    state.pickupTime ? format(parseISO(state.pickupTime), "yyyy-MM-dd") : defaultPickupDate
  );
  const [selectedPickupTime, setSelectedPickupTime] = useState<string>(
    state.pickupTime ? format(parseISO(state.pickupTime), "HH:mm") : "14:00"
  );

  // Files state
  const [files, setFiles] = useState<UploadedFile[]>(state.files || []);
  const [isUploading, setIsUploading] = useState(false);

  // Live queue estimate for walk-ins
  const estimateParams = { printColor: "bw", pageCount: 1, copies: 1 };
  const { data: queueEstimate } = useGetQueueEstimate(estimateParams, {
    query: { queryKey: getGetQueueEstimateQueryKey(estimateParams), refetchInterval: 10000 },
  });

  const ordersInQueue = queueEstimate?.ordersAhead ?? 0;
  const estimatedWait = queueEstimate?.estimatedWaitMinutes ?? 5;

  useEffect(() => {
    if (modeFromQuery && (modeFromQuery === "walk-in" || modeFromQuery === "scheduled")) {
      setOrderMode(modeFromQuery);
    }
  }, [modeFromQuery]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const newUploads = await Promise.all(
        selectedFiles.map(async (file) => {
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File ${file.name} is too large (max 200MB)`);
          }
          if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
            throw new Error(`File ${file.name} has an unsupported format. Supported: PNG, JPG, JPEG, PDF, DOCX, XLSX, PPTX`);
          }
          return await uploadFile(file);
        })
      );

      setFiles((prev) => [...prev, ...newUploads]);
      toast({
        title: "Files added",
        description: `Successfully uploaded ${newUploads.length} document(s).`,
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload file(s)",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();

    if (orderMode === "scheduled" && !customerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name for your scheduled pickup order.",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "No files submitted",
        description: "Please submit at least one document or image into the submission bin.",
        variant: "destructive",
      });
      return;
    }

    let pickupISO: string | undefined = undefined;
    if (orderMode === "scheduled") {
      const [hours, minutes] = selectedPickupTime.split(":").map(Number);
      const [year, month, day] = selectedPickupDate.split("-").map(Number);
      const scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      pickupISO = scheduledDateTime.toISOString();
    }

    const valid3Digit =
      state.orderNumber && /^\d{3}$/.test(state.orderNumber)
        ? state.orderNumber
        : String(Math.floor(100 + Math.random() * 900));
    const assignedOrderNumber = orderMode === "walk-in" ? walkInOrderNumber : valid3Digit;
    const assignedCustomerName = orderMode === "walk-in" ? `Walk-in (${walkInOrderNumber})` : customerName.trim();
    const assignedEmail = orderMode === "walk-in" ? "" : email.trim();
    const assignedPhone = orderMode === "walk-in" ? "" : phone.trim();

    updateState({
      serviceType: "printing",
      orderMode,
      orderNumber: assignedOrderNumber,
      customerName: assignedCustomerName,
      email: assignedEmail,
      phone: assignedPhone,
      pickupTime: pickupISO,
      files,
    });

    setLocation("/order/review");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header & Mode Switcher */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Document Printing Submission
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose your order procedure and submit your files.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-lg border bg-muted p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setOrderMode("walk-in")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                orderMode === "walk-in"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Walk-in
            </button>
            <button
              type="button"
              onClick={() => setOrderMode("scheduled")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                orderMode === "scheduled"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Scheduled
            </button>
          </div>
        </div>

        {/* 2.1 Prompt for Walk-Ins */}
        {orderMode === "walk-in" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">Current Walk-in Queue Status</h2>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    Live Shop Feed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  There are currently{" "}
                  <strong className="text-foreground">
                    {ordersInQueue === 0 ? "0 orders" : `${ordersInQueue} walk-in order(s)`}
                  </strong>{" "}
                  ahead in queue. Estimated turnaround:{" "}
                  <strong className="text-foreground">~{estimatedWait} minutes</strong>.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-medium text-primary">Join line upon submission</span>
            </div>
          </div>
        )}

        {/* 2.2 Prompt for Scheduled Orders */}
        {orderMode === "scheduled" && (
          <Card className="border-secondary/30 bg-secondary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Set Pickup Date & Time</CardTitle>
                    <CardDescription className="text-xs">
                      Select when you will arrive at JandC Internet Cafe to collect your printed documents.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-secondary text-secondary font-semibold">
                  Operating Hours: 8:00 AM – 6:00 PM (Mon–Sat)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 pt-0">
              <div className="space-y-1.5">
                <Label htmlFor="pickupDate" className="text-xs font-semibold">Pickup Date</Label>
                <Select value={selectedPickupDate} onValueChange={setSelectedPickupDate}>
                  <SelectTrigger id="pickupDate">
                    <SelectValue placeholder="Select date" />
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
                <Label htmlFor="pickupTime" className="text-xs font-semibold">Pickup Time</Label>
                <Select value={selectedPickupTime} onValueChange={setSelectedPickupTime}>
                  <SelectTrigger id="pickupTime">
                    <SelectValue placeholder="Select time" />
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
            </CardContent>
          </Card>
        )}
      </div>

      <form onSubmit={handleProceed} className="space-y-6">
        {/* Customer Details Box: Order Number Tracking for Walk-ins vs Contact Form for Scheduled */}
        {orderMode === "walk-in" ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary text-white">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Customer Tracking via Order Number</CardTitle>
                    <CardDescription className="text-xs">
                      Walk-in customers are identified and served exclusively by Order Number.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/40 bg-card text-primary font-semibold text-xs">
                  Walk-in Tracking ID
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Your Walk-in Order / Ticket Number:
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                      Auto-Generated
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-widest">
                      {walkInOrderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No names, emails, or mobile numbers required. You can track your print queue and claim your prints at the counter directly with this Order Number.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/60 rounded-xl p-3 sm:max-w-xs border space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-primary" /> Counter Verification
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Present or announce <strong>{walkInOrderNumber}</strong> to staff when claiming your completed prints.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Details (Scheduled Order)</CardTitle>
              <CardDescription className="text-xs">
                Enter your contact info so our staff can prepare and notify you for pickup.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerName" className="text-xs font-semibold">
                  Your Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  placeholder="e.g. Juan dela Cruz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerEmail" className="text-xs font-semibold">
                  Email Address <span className="text-muted-foreground text-[10px]">(for pickup updates)</span>
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="juan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone" className="text-xs font-semibold">
                  Mobile Number <span className="text-muted-foreground text-[10px]">(optional)</span>
                </Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="0917-000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2.1 & 2.2: Submission Bin */}
        <Card className="border-2 border-dashed border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Print Order Submission Bin</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                Max 200MB per file
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Supported file types: <strong>.png, .jpg, .jpeg, .pdf, .docx, .xlsx, .pptx</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/40 transition-colors relative">
              <Upload className="w-10 h-10 text-primary/70 mb-3" />
              <p className="text-sm font-semibold mb-1">
                Drop your documents into the submission bin
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supported formats: <strong>PNG, JPG, JPEG, PDF, DOCX, XLSX, PPTX</strong>
              </p>

              <div className="relative">
                <Input
                  type="file"
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={onFileChange}
                  accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png"
                  disabled={isUploading}
                />
                <Button type="button" variant="default" disabled={isUploading} className="pointer-events-none">
                  {isUploading ? "Uploading Files..." : "Browse & Submit Files"}
                </Button>
              </div>
            </div>

            {/* Submitted Files List */}
            {files.length > 0 && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted Files ({files.length})
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Total: {files.reduce((sum, f) => sum + (f.pageCount || 1), 0)} estimated pages
                  </span>
                </div>

                <div className="grid gap-2">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                            <span className="text-primary font-medium">
                              {file.pageCount ? `${file.pageCount} page(s)` : "1 page preview"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t p-4 bg-muted/10">
            <Button type="button" variant="outline" onClick={() => setLocation("/")}>
              Back to Home
            </Button>
            <Button
              type="submit"
              disabled={isUploading || files.length === 0}
              className="w-full sm:w-auto font-semibold"
            >
              Proceed to Print Preview & Specifications{" "}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
