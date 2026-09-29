import { BrandForm } from "@/components/brands/brand-form";
import { AppShell } from "@/components/layout/app-shell";

export default function NewBrandPage() {
  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New brand</h1>
      <BrandForm />
    </AppShell>
  );
}
