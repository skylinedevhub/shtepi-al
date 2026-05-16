import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-sm border border-warmgray/20">
        <h1 className="text-2xl font-semibold mb-1 text-navy">ShtëpiAL Intel</h1>
        <p className="text-sm text-warmgray mb-6">Hyni në llogarinë tuaj.</p>
        <LoginForm />
      </div>
    </main>
  );
}
