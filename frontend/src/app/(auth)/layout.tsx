import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.05),transparent_60%)] blur-3xl" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.02),transparent_60%)] blur-2xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-6 px-6 sm:px-10">
        <Link href="/" className="inline-block">
          <Image
            src="/images/logo-white.svg"
            alt="TAP"
            width={110}
            height={36}
            className="h-[30px] w-auto opacity-80 hover:opacity-100 transition-opacity"
            priority
          />
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        {children}
      </div>

      <div className="relative z-10 pb-6 text-center">
        <p className="text-[11px] text-white/30 tracking-[1px]">
          TAP — Talent Acceleration Platform
        </p>
      </div>
    </div>
  );
}
