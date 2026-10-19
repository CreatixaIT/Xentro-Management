import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background poster */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/xentro-karting-poster.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="glass-panel rounded-2xl p-8 text-center">
          <div className="mb-6">
            <img
              src="/xentro-logo.png"
              alt="Xentro Logo"
              className="h-16 w-auto mx-auto mb-4"
            />
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Check Your Inbox
            </h1>
            <p className="text-gray-300">
              We've sent a verification link to your email address. Please click the link to verify your account.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/sign-in"
              className="block w-full g-[#E31C25] hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-all duration-200"
            >
              Go to Sign In
            </Link>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            <p>Didn't receive the email?</p>
            <p className="mt-2">
              Check your spam folder or request a new verification link from sign in.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
