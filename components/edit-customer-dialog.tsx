"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: { _id: string; name: string; phone: string; address: string };
  onSuccess: () => void;
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: EditCustomerDialogProps) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(customer.name);
      setPhone(customer.phone);
      setAddress(customer.address);
      setError("");
    }
  }, [open, customer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim() }),
      });

      if (res.ok) {
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update customer");
      }
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-address">Address</Label>
            <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="size-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
