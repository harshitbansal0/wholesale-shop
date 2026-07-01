import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  address: string;
  initialBalance: number;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, index: true },
    address: { type: String, default: "" },
    initialBalance: { type: Number, default: 0 },
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: "text" });

export default mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
