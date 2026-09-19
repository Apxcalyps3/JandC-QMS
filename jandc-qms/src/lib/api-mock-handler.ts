import type { IncomingMessage, ServerResponse } from "http";

export interface ServiceItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  estimatedMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderNumber: string;
  serviceType: string;
  status: string;
  customerName: string;
  email: string;
  phone: string;
  paperSize?: string;
  printColor?: string;
  copies: number;
  backToBack?: boolean;
  photoSize?: string;
  pageCount?: number;
  fileCount: number;
  queuePosition: number;
  estimatedMinutes: number;
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  pickupTime: string;
  paymentMethod: string;
  totalAmount: number;
  paymentReference?: string;
  paymentReceiptFilename?: string;
  paymentReceiptUrl?: string;
  paymentStatus: string;
  paymentAdminNote?: string;
  adminNotes?: string;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const services: ServiceItem[] = [
  {
    id: 1,
    name: "Document Printing",
    slug: "printing",
    description: "B&W and full-color high-speed document printing (A4, Short, Long)",
    estimatedMinutes: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "ID Picture Package",
    slug: "id-picture",
    description: "Formal 1x1, 2x2, and Passport photo prints with background enhancement",
    estimatedMinutes: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Photo Printing",
    slug: "photo-printing",
    description: "Premium glossy 4R, 5R, and 8R vibrant photo prints",
    estimatedMinutes: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: "Binding & Lamination",
    slug: "binding-lamination",
    description: "Thermal lamination and ring coil document binding",
    estimatedMinutes: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const orders: OrderItem[] = [
  {
    id: 1,
    orderNumber: "101",
    customerName: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "09171234567",
    serviceType: "printing",
    status: "processing",
    paperSize: "A4",
    printColor: "bw",
    copies: 2,
    backToBack: true,
    pageCount: 25,
    fileCount: 1,
    queuePosition: 1,
    estimatedMinutes: 6,
    totalAmount: 50,
    paymentMethod: "counter",
    paymentStatus: "pending",
    files: [
      {
        id: "f1",
        name: "Thesis_Final_Draft.pdf",
        size: 1048576,
        type: "application/pdf",
        url: "/api/files/sample.pdf",
      },
    ],
    pickupTime: new Date(Date.now() + 3600000).toISOString(),
    processingStartedAt: new Date(Date.now() - 600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    orderNumber: "102",
    customerName: "Carlos Reyes",
    email: "carlos.reyes@email.com",
    phone: "09189876543",
    serviceType: "printing",
    status: "pending",
    paperSize: "Legal",
    printColor: "bw",
    copies: 2,
    backToBack: true,
    pageCount: 15,
    fileCount: 1,
    queuePosition: 2,
    estimatedMinutes: 5,
    totalAmount: 45,
    paymentMethod: "online",
    paymentReference: "GCASH-9827364",
    paymentStatus: "verified",
    paymentReceiptFilename: "receipt_102.jpg",
    paymentReceiptUrl: "/api/files/sample_receipt.jpg",
    files: [
      {
        id: "f2",
        name: "Affidavit_Contract.pdf",
        size: 1548576,
        type: "application/pdf",
        url: "/api/files/sample_affidavit.pdf",
      },
    ],
    pickupTime: new Date(Date.now() + 7200000).toISOString(),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    orderNumber: "103",
    customerName: "Alyssa Tan",
    email: "alyssa.tan@email.com",
    phone: "09205554321",
    serviceType: "printing",
    status: "pending",
    paperSize: "Letter",
    printColor: "color",
    copies: 1,
    backToBack: false,
    pageCount: 15,
    fileCount: 1,
    queuePosition: 3,
    estimatedMinutes: 8,
    totalAmount: 150,
    paymentMethod: "counter",
    paymentStatus: "pending",
    files: [
      {
        id: "f3",
        name: "Marketing_Brochure.pdf",
        size: 3145728,
        type: "application/pdf",
        url: "/api/files/sample_brochure.pdf",
      },
    ],
    pickupTime: new Date(Date.now() + 10800000).toISOString(),
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    orderNumber: "104",
    customerName: "Juan Dela Cruz",
    email: "juan.delacruz@email.com",
    phone: "09191112233",
    serviceType: "printing",
    status: "for_pickup",
    paperSize: "A4",
    printColor: "bw",
    copies: 1,
    backToBack: false,
    pageCount: 10,
    fileCount: 1,
    queuePosition: 0,
    estimatedMinutes: 3,
    totalAmount: 20,
    paymentMethod: "counter",
    paymentStatus: "verified",
    files: [
      {
        id: "f4",
        name: "Resume_Standard.pdf",
        size: 512000,
        type: "application/pdf",
        url: "/api/files/sample_resume.pdf",
      },
    ],
    pickupTime: new Date(Date.now() + 1800000).toISOString(),
    processingStartedAt: new Date(Date.now() - 1200000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    orderNumber: "105",
    customerName: "Elena Ramos",
    email: "elena.ramos@email.com",
    phone: "09224445566",
    serviceType: "printing",
    status: "completed",
    paperSize: "Folio",
    printColor: "color",
    copies: 2,
    backToBack: true,
    pageCount: 12,
    fileCount: 1,
    queuePosition: 0,
    estimatedMinutes: 6,
    totalAmount: 180,
    paymentMethod: "online",
    paymentReference: "MAYA-5432109",
    paymentStatus: "verified",
    files: [],
    pickupTime: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let nextOrderId = 6;
let nextServiceId = 5;

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

export function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = req.method?.toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  if (!pathname.startsWith("/api")) {
    next();
    return;
  }

  // Health
  if (pathname === "/api/healthz" || pathname === "/api/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  // Services
  if (pathname === "/api/services") {
    if (method === "GET") {
      sendJson(res, 200, services);
      return;
    }
    if (method === "POST") {
      parseBody(req).then((body) => {
        const newService: ServiceItem = {
          id: nextServiceId++,
          name: body.name || "Untitled Service",
          slug: body.slug || `service-${nextServiceId}`,
          description: body.description || "",
          estimatedMinutes: Number(body.estimatedMinutes) || 5,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        services.push(newService);
        sendJson(res, 201, newService);
      });
      return;
    }
  }

  const serviceIdMatch = pathname.match(/^\/api\/services\/(\d+)$/);
  if (serviceIdMatch) {
    const id = Number(serviceIdMatch[1]);
    const idx = services.findIndex((s) => s.id === id);
    if (idx === -1) {
      sendJson(res, 404, { error: "Service not found" });
      return;
    }
    if (method === "PATCH") {
      parseBody(req).then((body) => {
        services[idx] = {
          ...services[idx],
          ...body,
          updatedAt: new Date().toISOString(),
        };
        sendJson(res, 200, services[idx]);
      });
      return;
    }
    if (method === "DELETE") {
      services.splice(idx, 1);
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // Queue
  if (pathname === "/api/queue") {
    if (method === "GET") {
      const activeOrders = orders
        .filter((o) => o.status === "pending" || o.status === "processing")
        .sort((a, b) => a.queuePosition - b.queuePosition);
      const totalWait = activeOrders.reduce(
        (sum, o) => sum + (o.estimatedMinutes || 5),
        0,
      );
      sendJson(res, 200, {
        orders: activeOrders,
        activeCount: activeOrders.length,
        estimatedWaitMinutes: totalWait,
      });
      return;
    }
  }

  if (pathname === "/api/queue/estimate") {
    const activeOrders = orders.filter(
      (o) => o.status === "pending" || o.status === "processing",
    );
    const pages = Number(url.searchParams.get("pageCount")) || 1;
    const copies = Number(url.searchParams.get("copies")) || 1;
    const isColor = url.searchParams.get("printColor") === "color";
    const jobMinutes = Math.ceil((pages * copies) / (isColor ? 10 : 25)) + 2;
    const currentWait = activeOrders.reduce(
      (sum, o) => sum + (o.estimatedMinutes || 5),
      0,
    );
    sendJson(res, 200, {
      queueLength: activeOrders.length,
      estimatedWaitMinutes: currentWait + jobMinutes,
      currentActiveOrders: activeOrders.length,
    });
    return;
  }

  if (pathname === "/api/queue/reorder" && method === "PATCH") {
    parseBody(req).then((body) => {
      const orderIds: number[] = body.orderIds || [];
      orderIds.forEach((id, index) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          order.queuePosition = index + 1;
          order.updatedAt = new Date().toISOString();
        }
      });
      const activeOrders = orders
        .filter((o) => o.status === "pending" || o.status === "processing")
        .sort((a, b) => a.queuePosition - b.queuePosition);
      const totalWait = activeOrders.reduce(
        (sum, o) => sum + (o.estimatedMinutes || 5),
        0,
      );
      sendJson(res, 200, {
        orders: activeOrders,
        activeCount: activeOrders.length,
        estimatedWaitMinutes: totalWait,
      });
    });
    return;
  }

  // Order stats & analytics
  if (pathname === "/api/orders/stats/summary") {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const processingOrders = orders.filter((o) => o.status === "processing").length;
    const forPickupOrders = orders.filter((o) => o.status === "for_pickup" || o.status === "ready").length;
    const completedOrders = orders.filter((o) => o.status === "completed").length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    sendJson(res, 200, {
      totalOrders,
      pendingOrders,
      processingOrders,
      forPickupOrders,
      completedOrders,
      totalRevenue,
      averageWaitMinutes: 12,
    });
    return;
  }

  if (pathname === "/api/orders/analytics") {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const completedToday = orders.filter((o) => o.status === "completed").length;
    sendJson(res, 200, {
      totalRevenue,
      totalOrders: orders.length,
      completedToday,
      averageProcessingMinutes: 7,
      hourlyDistribution: [
        { hour: "8 AM", count: 4 },
        { hour: "9 AM", count: 8 },
        { hour: "10 AM", count: 15 },
        { hour: "11 AM", count: 12 },
        { hour: "1 PM", count: 18 },
        { hour: "2 PM", count: 14 },
        { hour: "3 PM", count: 9 },
        { hour: "4 PM", count: 6 },
      ],
      serviceBreakdown: [
        { service: "Document Printing", count: 32, revenue: 1250 },
        { service: "ID Picture", count: 18, revenue: 2160 },
        { service: "Photo Printing", count: 10, revenue: 850 },
        { service: "Binding & Lamination", count: 6, revenue: 450 },
      ],
    });
    return;
  }

  // Order tracking
  const trackMatch = pathname.match(/^\/api\/orders\/track\/([^/]+)$/);
  if (trackMatch) {
    const orderNum = decodeURIComponent(trackMatch[1]).trim();
    const cleanDigits = orderNum.replace(/\D/g, "");
    const order = orders.find(
      (o) => o.orderNumber === orderNum || (cleanDigits && o.orderNumber === cleanDigits),
    );
    if (!order) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }
    sendJson(res, 200, order);
    return;
  }

  // Single Order Status Update
  const statusMatch = pathname.match(/^\/api\/orders\/(\d+)\/status$/);
  if (statusMatch && method === "PATCH") {
    const id = Number(statusMatch[1]);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }
    parseBody(req).then((body) => {
      if (body.status) order.status = body.status;
      if (body.adminNotes) order.adminNotes = body.adminNotes;
      if (body.status === "processing" && !order.processingStartedAt) {
        order.processingStartedAt = new Date().toISOString();
      }
      if (body.status === "for_pickup" && !(order as any).forPickupAt) {
        (order as any).forPickupAt = new Date().toISOString();
      }
      if (body.status === "completed") {
        order.completedAt = new Date().toISOString();
        order.queuePosition = 0;
      }
      order.updatedAt = new Date().toISOString();
      sendJson(res, 200, order);
    });
    return;
  }

  // Single Order Payment Update
  const paymentMatch = pathname.match(/^\/api\/orders\/(\d+)\/payment$/);
  if (paymentMatch && method === "PATCH") {
    const id = Number(paymentMatch[1]);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }
    parseBody(req).then((body) => {
      if (body.paymentStatus) order.paymentStatus = body.paymentStatus;
      if (body.paymentAdminNote) order.paymentAdminNote = body.paymentAdminNote;
      order.updatedAt = new Date().toISOString();
      sendJson(res, 200, order);
    });
    return;
  }

  // Orders list and create
  if (pathname === "/api/orders") {
    if (method === "GET") {
      let filtered = [...orders];
      const statusParam = url.searchParams.get("status");
      const serviceParam = url.searchParams.get("serviceType");
      const searchParam = url.searchParams.get("search");

      if (statusParam) {
        filtered = filtered.filter((o) => o.status === statusParam);
      }
      if (serviceParam) {
        filtered = filtered.filter((o) => o.serviceType === serviceParam);
      }
      if (searchParam) {
        const q = searchParam.toLowerCase();
        filtered = filtered.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.phone.toLowerCase().includes(q),
        );
      }
      sendJson(res, 200, filtered);
      return;
    }

    if (method === "POST") {
      parseBody(req).then((body) => {
        // Order numbers must be purely 3-digit numbers with no letters
        const rawDigits =
          body.orderNumber && typeof body.orderNumber === "string"
            ? body.orderNumber.replace(/\D/g, "")
            : "";
        let orderNum = rawDigits.length === 3 ? rawDigits : "";
        if (!orderNum) {
          const usedNumbers = new Set(orders.map((o) => o.orderNumber));
          for (let i = 0; i < 500; i++) {
            const candidate = String(Math.floor(101 + Math.random() * 898));
            if (!usedNumbers.has(candidate)) {
              orderNum = candidate;
              break;
            }
          }
          if (!orderNum) {
            orderNum = String(Math.floor(100 + Math.random() * 900));
          }
        }

        const activeOrders = orders.filter(
          (o) => o.status === "pending" || o.status === "processing",
        );
        const newOrder: OrderItem = {
          id: nextOrderId++,
          orderNumber: orderNum,
          serviceType: body.serviceType || "printing",
          status: "pending",
          customerName:
            body.customerName && body.customerName.trim()
              ? body.customerName
              : body.orderMode === "walk-in"
              ? `Order #${orderNum}`
              : "Customer",
          email: body.email || "",
          phone: body.phone || "",
          paperSize: body.paperSize,
          printColor: body.printColor,
          copies: Number(body.copies) || 1,
          backToBack: Boolean(body.backToBack),
          photoSize: body.photoSize,
          pageCount: Number(body.pageCount) || 1,
          fileCount: Array.isArray(body.files) ? body.files.length : 1,
          queuePosition: activeOrders.length + 1,
          estimatedMinutes: Number(body.estimatedMinutes) || 8,
          files: Array.isArray(body.files) ? body.files : [],
          pickupTime: body.pickupTime || new Date(Date.now() + 3600000).toISOString(),
          paymentMethod: body.paymentMethod || "counter",
          totalAmount: Number(body.totalAmount) || 25,
          paymentReference: body.paymentReference,
          paymentReceiptFilename: body.paymentReceiptFilename,
          paymentReceiptUrl: body.paymentReceiptUrl,
          paymentStatus: body.paymentMethod === "online" ? "pending" : "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        orders.unshift(newOrder);
        sendJson(res, 201, newOrder);
      });
      return;
    }
  }

  // Single order GET
  const singleOrderMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (singleOrderMatch && method === "GET") {
    const id = Number(singleOrderMatch[1]);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }
    sendJson(res, 200, order);
    return;
  }

  // Customers
  if (pathname === "/api/customers" && method === "GET") {
    const customerMap = new Map<string, any>();
    orders.forEach((o, index) => {
      const key = o.phone || o.email || o.customerName;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: index + 1,
          name: o.customerName,
          email: o.email,
          phone: o.phone,
          totalOrders: 1,
          lastOrderDate: o.createdAt,
        });
      } else {
        const c = customerMap.get(key);
        c.totalOrders += 1;
        if (new Date(o.createdAt) > new Date(c.lastOrderDate)) {
          c.lastOrderDate = o.createdAt;
        }
      }
    });
    sendJson(res, 200, Array.from(customerMap.values()));
    return;
  }

  // File upload
  if (pathname === "/api/files/upload" && method === "POST") {
    const mockFilename = `upload_${Date.now()}.pdf`;
    sendJson(res, 200, {
      filename: mockFilename,
      originalName: "uploaded_document.pdf",
      size: 102400,
      mimeType: "application/pdf",
      url: `/api/files/${mockFilename}`,
      assetType: "document",
      pageCount: 2,
    });
    return;
  }

  // Files get
  if (pathname.startsWith("/api/files/")) {
    const filename = pathname.replace("/api/files/", "");
    res.writeHead(200, {
      "Content-Type": filename.endsWith(".jpg") ? "image/jpeg" : "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    });
    res.end(Buffer.from("Sample JNConnect file content preview"));
    return;
  }

  next();
}
