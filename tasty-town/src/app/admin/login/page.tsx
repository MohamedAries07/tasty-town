import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Admin sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-line bg-white p-6">
        <div>
          <span className="flex size-10 items-center justify-center rounded-lg bg-ink text-sm font-black text-lime">TT</span>
          <h1 className="mt-4 text-2xl font-black tracking-tight">Admin sign in</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
