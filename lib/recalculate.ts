import Customer from "@/lib/models/Customer";
import Bill from "@/lib/models/Bill";
import PaymentRecord from "@/lib/models/PaymentRecord";

export async function recalculateCustomerFinancials(customerId: string) {
  const customer = await Customer.findById(customerId);
  if (!customer) return;

  const bills = await Bill.find({ customerId, deletedAt: null });
  const payments = await PaymentRecord.find({ customerId });

  const totalPurchase = bills.reduce((sum, b) => sum + b.goodsTotal, 0);
  const billPayments = bills.reduce((sum, b) => sum + b.payment.totalPaid, 0);
  const standalonePaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = billPayments + standalonePaid;
  const totalDue = customer.initialBalance + totalPurchase - totalPaid;

  customer.totalPurchase = totalPurchase;
  customer.totalPaid = totalPaid;
  customer.totalDue = Math.max(0, totalDue);
  await customer.save();
}
