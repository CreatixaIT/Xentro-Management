import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background poster */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/xentro-karting-poster.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Registration panel */}
          <div className="glass-panel rounded-2xl p-8 lg:p-12 max-w-lg">
            <div className="mb-8">
              <img
                src="/xentro-logo.png"
                alt="Xentro Logo"
                className="h-16 w-auto mb-4"
              />
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Join Our Team
              </h1>
              <p className="text-gray-200">
                Create your employee account to get started with Xentro Management
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/sign-up"
                className="block w-full hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg text-center transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                style={{ backgroundColor: '#E31C25' }}
              >
                Create Employee Account
              </Link>

              <Link
                href="/sign-in"
                className="block w-full bg-white hover:bg-gray-100 font-semibold py-4 px-6 rounded-lg text-center transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                style={{ color: '#1A1A1A' }}
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Right side - Empty to show kart */}
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 py-4 text-center text-white/70 text-sm">
        © 2026 Xentro Management. All rights reserved.
      </footer>
    </main>
  );
}
