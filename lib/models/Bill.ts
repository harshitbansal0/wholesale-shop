import mongoose, { Schema, Document } from "mongoose";

export interface IBillItem {
  sNo: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IPayment {
  cash: number;
  self: number;
  shop: number;
  totalPaid: number;
}

export interface IBill extends Document {
  billNumber: string;
  date: Date;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  items: IBillItem[];
  goodsTotal: number;
  oldBalance: number;
  grandTotal: number;
  payment: IPayment;
  dueAmount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const BillItemSchema = new Schema<IBillItem>(
  {
    sNo: { type: Number, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    cash: { type: Number, default: 0 },
    self: { type: Number, default: 0 },
    shop: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
  },
  { _id: false }
);

const BillSchema = new Schema<IBill>(
  {
    billNumber: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [BillItemSchema],
    goodsTotal: { type: Number, required: true },
    oldBalance: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    payment: { type: PaymentSchema, required: true },
    dueAmount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BillSchema.index({ date: -1 });
BillSchema.index({ customerId: 1, date: -1 });
BillSchema.index({ deletedAt: 1, date: -1 });

export default mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);
