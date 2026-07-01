import Customer from "@/lib/models/Customer";
import Bill from "@/lib/models/Bill";
import PaymentRecord from "@/lib/models/PaymentRecord";
import { roundMoney } from "@/lib/utils";

export async function recalculateCustomerFinancials(customerId: string) {
  const customer = await Customer.findById(customerId);
  if (!customer) return;

  const bills = await Bill.find({ customerId, deletedAt: null });
  const payments = await PaymentRecord.find({ customerId });

  const totalPurchase = roundMoney(bills.reduce((sum, b) => sum + b.goodsTotal, 0));
  const billPayments = roundMoney(bills.reduce((sum, b) => sum + b.payment.totalPaid, 0));
  const standalonePaid = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
  const totalPaid = roundMoney(billPayments + standalonePaid);
  const totalDue = roundMoney(customer.initialBalance + totalPurchase - totalPaid);

  customer.totalPurchase = totalPurchase;
  customer.totalPaid = totalPaid;
  customer.totalDue = Math.max(0, totalDue);
  await customer.save();
}
