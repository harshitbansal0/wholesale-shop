import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentRecord extends Document {
  customerId: mongoose.Types.ObjectId;
  billId: mongoose.Types.ObjectId | null;
  amount: number;
  type: "cash" | "self" | "shop";
  date: Date;
  note: string;
  createdAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    billId: { type: Schema.Types.ObjectId, ref: "Bill", default: null },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["cash", "self", "shop"], required: true },
    date: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

PaymentRecordSchema.index({ customerId: 1, date: -1 });

export default mongoose.models.PaymentRecord ||
  mongoose.model<IPaymentRecord>("PaymentRecord", PaymentRecordSchema);
