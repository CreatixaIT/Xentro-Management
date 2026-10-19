import Link from 'next/link';

export default function PendingApprovalPage() {
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
            <div className="w-16 h-16 bg-xentro-yellow rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Account Pending Approval
            </h1>
            <p className="text-gray-300">
              Your email has been verified, but your account is awaiting administrator approval.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              You will be able to sign in once an administrator activates your account.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/sign-in"
              className="block w-full g-[#E31C25] hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-all duration-200"
            >
              Back to Sign In
            </Link>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            <p>Need help?</p>
            <p className="mt-2">
              Contact your administrator for account activation.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
