import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  serviceType: text("service_type").notNull(),
  status: text("status").notNull().default("pending"),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  paperSize: text("paper_size"),
  printColor: text("print_color"),
  copies: integer("copies").notNull().default(1),
  backToBack: boolean("back_to_back").notNull().default(false),
  photoSize: text("photo_size"),
  pageCount: integer("page_count").notNull().default(1),
  fileCount: integer("file_count").notNull().default(0),
  queuePosition: integer("queue_position").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(5),
  files: jsonb("files").notNull().default([]),
  // Scheduling
  pickupTime: timestamp("pickup_time", { withTimezone: true }),
  // Payment
  paymentMethod: text("payment_method").notNull().default("online"),
  totalAmount: integer("total_amount").notNull().default(0),
  paymentReference: text("payment_reference"),
  paymentReceiptFilename: text("payment_receipt_filename"),
  paymentReceiptUrl: text("payment_receipt_url"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentAdminNote: text("payment_admin_note"),
  // Timestamps
  processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
