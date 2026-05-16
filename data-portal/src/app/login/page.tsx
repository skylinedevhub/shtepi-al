import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient grid + glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(94,230,160,0.10), transparent 60%), radial-gradient(circle at 80% 100%, rgba(244,184,96,0.08), transparent 50%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Terminal-style frame header */}
        <div className="border border-line border-b-0 bg-ink-800/80 backdrop-blur-md
          rounded-t flex items-center px-3 py-2 gap-2 font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
          <span aria-hidden className="h-2 w-2 rounded-full bg-acc-mint animate-pulse-dot
            shadow-[0_0_8px_rgba(94,230,160,0.6)]" />
          <span className="text-acc-mint">SECURE</span>
          <span className="text-fg-dim">·</span>
          <span>auth · /login</span>
          <span className="ml-auto text-fg-dim">v1.0</span>
        </div>

        <div className="border border-line bg-ink-800/80 backdrop-blur-md rounded-b
          shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] p-7">
          <h1 className="font-mono text-xl text-fg mb-1 tracking-tight">
            ShtëpiAL <span className="text-acc-mint">Intel</span>
          </h1>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim mb-6">
            B2B terminal · vetëm me ftesë
          </p>
          <LoginForm />
        </div>

        <p className="mt-3 text-center font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
          shtepial.al — të dhëna proprietare
        </p>
      </div>
    </main>
  );
}
