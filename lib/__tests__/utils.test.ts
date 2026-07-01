import { describe, it, expect } from "vitest";
import { roundMoney, formatCurrency, escapeRegex } from "../utils";

describe("roundMoney", () => {
  it("rounds down below .5 boundary", () => {
    expect(roundMoney(1.004)).toBe(1.0);
    expect(roundMoney(1.3249)).toBe(1.32);
  });

  it("rounds up above .5 boundary", () => {
    expect(roundMoney(1.006)).toBe(1.01);
    expect(roundMoney(1.3251)).toBe(1.33);
  });

  it("handles the IEEE 754 boundary at 1.005", () => {
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it("handles additional IEEE 754 boundary values", () => {
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(1.045)).toBe(1.05);
  });

  it("handles zero", () => {
    expect(roundMoney(0)).toBe(0);
  });

  it("handles negative values", () => {
    expect(roundMoney(-1.006)).toBe(-1.01);
    expect(roundMoney(-1.004)).toBe(-1.0);
  });

  it("handles large values", () => {
    expect(roundMoney(999999.99)).toBe(999999.99);
    expect(roundMoney(100000.006)).toBe(100000.01);
  });

  it("passes integers through unchanged", () => {
    expect(roundMoney(100)).toBe(100);
    expect(roundMoney(0)).toBe(0);
    expect(roundMoney(999999)).toBe(999999);
  });

  it("handles values already at 2 decimal places", () => {
    expect(roundMoney(10.50)).toBe(10.5);
    expect(roundMoney(99.99)).toBe(99.99);
  });
});

describe("formatCurrency", () => {
  it("formats positive values with rupee symbol and 2 decimals", () => {
    expect(formatCurrency(1000)).toBe("₹1,000.00");
  });

  it("formats negative values with minus before rupee symbol", () => {
    const result = formatCurrency(-500);
    expect(result).toMatch(/^-₹/);
    expect(result).toContain("500.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₹0.00");
  });

  it("always shows exactly 2 decimal places", () => {
    expect(formatCurrency(100)).toMatch(/\.00$/);
    expect(formatCurrency(99.9)).toMatch(/\.90$/);
    expect(formatCurrency(50.12)).toMatch(/\.12$/);
  });

  it("uses Indian number formatting with commas", () => {
    expect(formatCurrency(100000)).toBe("₹1,00,000.00");
    expect(formatCurrency(1234567)).toBe("₹12,34,567.00");
  });
});

describe("escapeRegex", () => {
  it("escapes dots and asterisks", () => {
    expect(escapeRegex("a.*b")).toBe("a\\.\\*b");
  });

  it("escapes all regex special characters", () => {
    expect(escapeRegex("a+b?c$d")).toBe("a\\+b\\?c\\$d");
    expect(escapeRegex("(foo)[bar]")).toBe("\\(foo\\)\\[bar\\]");
    expect(escapeRegex("a{1,2}|b")).toBe("a\\{1,2\\}\\|b");
    expect(escapeRegex("^start$")).toBe("\\^start\\$");
  });

  it("leaves normal strings unchanged", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
    expect(escapeRegex("BILL-001")).toBe("BILL-001");
    expect(escapeRegex("9876543210")).toBe("9876543210");
  });

  it("handles empty string", () => {
    expect(escapeRegex("")).toBe("");
  });
});

describe("Financial Invariants", () => {
  it("goodsTotal equals sum of rounded item amounts", () => {
    const items = [
      { qty: 5, rate: 33.33 },
      { qty: 3, rate: 150.5 },
      { qty: 10, rate: 25 },
    ];

    const itemAmounts = items.map((i) => roundMoney(i.qty * i.rate));
    const goodsTotal = roundMoney(itemAmounts.reduce((s, a) => s + a, 0));

    expect(itemAmounts[0]).toBe(roundMoney(5 * 33.33));
    expect(itemAmounts[1]).toBe(roundMoney(3 * 150.5));
    expect(itemAmounts[2]).toBe(roundMoney(10 * 25));
    expect(goodsTotal).toBe(roundMoney(itemAmounts[0] + itemAmounts[1] + itemAmounts[2]));
  });

  it("grandTotal = goodsTotal + oldBalance", () => {
    const goodsTotal = roundMoney(1500.55);
    const oldBalance = 2000;
    const grandTotal = roundMoney(goodsTotal + oldBalance);

    expect(grandTotal).toBe(3500.55);
  });

  it("dueAmount = max(0, grandTotal - totalPaid)", () => {
    const grandTotal = 5000;
    const totalPaid = roundMoney(1000 + 500 + 200);

    const dueAmount = Math.max(0, roundMoney(grandTotal - totalPaid));
    expect(dueAmount).toBe(3300);
  });

  it("dueAmount clamps to 0 on overpayment", () => {
    const grandTotal = 1000;
    const totalPaid = 1500;

    const dueAmount = Math.max(0, roundMoney(grandTotal - totalPaid));
    expect(dueAmount).toBe(0);
  });

  it("customer totalDue = max(0, initialBalance + totalPurchase - totalPaid)", () => {
    const initialBalance = 5000;
    const bills = [
      { goodsTotal: 10000, billPaid: 8000 },
      { goodsTotal: 5000, billPaid: 5000 },
    ];
    const standalonePayments = [1000, 500];

    const totalPurchase = roundMoney(bills.reduce((s, b) => s + b.goodsTotal, 0));
    const billPayments = roundMoney(bills.reduce((s, b) => s + b.billPaid, 0));
    const standalonePaid = roundMoney(standalonePayments.reduce((s, p) => s + p, 0));
    const totalPaid = roundMoney(billPayments + standalonePaid);
    const totalDue = Math.max(0, roundMoney(initialBalance + totalPurchase - totalPaid));

    expect(totalPurchase).toBe(15000);
    expect(totalPaid).toBe(14500);
    expect(totalDue).toBe(5500);
  });

  it("customer totalDue clamps to 0 when overpaid", () => {
    const initialBalance = 0;
    const totalPurchase = 10000;
    const totalPaid = 12000;

    const totalDue = Math.max(0, roundMoney(initialBalance + totalPurchase - totalPaid));
    expect(totalDue).toBe(0);
  });

  it("dashboard KPI invariant: totalSales - totalReceived = totalDue (before clamp)", () => {
    const bills = [
      { goodsTotal: 10000, billPaid: 8000 },
      { goodsTotal: 5000, billPaid: 3000 },
      { goodsTotal: 2000, billPaid: 2000 },
    ];
    const standalonePaid = 500;

    const totalSales = bills.reduce((s, b) => s + b.goodsTotal, 0);
    const billReceived = bills.reduce((s, b) => s + b.billPaid, 0);
    const totalReceived = billReceived + standalonePaid;
    const rawDue = bills.reduce((s, b) => s + (b.goodsTotal - b.billPaid), 0) - standalonePaid;

    expect(totalSales - totalReceived).toBe(rawDue);
  });
});
