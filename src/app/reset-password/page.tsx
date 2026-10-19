'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'password' | 'passcode'>('password');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isValidSession, setIsValidSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    // This will be validated server-side on submit
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          passwordMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setSubmitError(data.message || 'Password reset failed');
        }
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to sign in
      router.push('/sign-in?reset=1');
    } catch (error) {
      setSubmitError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  if (!isValidSession) {
    return (
      <main className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/xentro-karting-poster.png')",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 w-full max-w-md mx-auto px-4">
          <div className="glass-panel rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Invalid or Expired Link
            </h1>
            <p className="text-gray-300 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block g-[#E31C25] hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
        <div className="glass-panel rounded-2xl p-8">
          <div className="mb-6 text-center">
            <img
              src="/xentro-logo.png"
              alt="Xentro Logo"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              Reset Password
            </h1>
            <p className="text-gray-300 text-sm">
              Enter your new password or passcode
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Password Mode *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="passwordMode"
                    value="password"
                    checked={passwordMode === 'password'}
                    onChange={() => setPasswordMode('password')}
                    className="mr-2"
                  />
                  <span className="text-gray-200">Password (6+ chars, 1 uppercase, 1 digit)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="passwordMode"
                    value="passcode"
                    checked={passwordMode === 'passcode'}
                    onChange={() => setPasswordMode('passcode')}
                    className="mr-2"
                  />
                  <span className="text-gray-200">6-digit Passcode</span>
                </label>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                {passwordMode === 'password' ? 'New Password *' : 'New Passcode *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : passwordMode === 'passcode' ? 'tel' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25] pr-10"
                  placeholder={passwordMode === 'passcode' ? '6-digit passcode' : 'Enter new password'}
                  required
                  maxLength={passwordMode === 'passcode' ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                Confirm {passwordMode === 'password' ? 'Password *' : 'Passcode *'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : passwordMode === 'passcode' ? 'tel' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25] pr-10"
                  placeholder={passwordMode === 'passcode' ? 'Confirm 6-digit passcode' : 'Confirm new password'}
                  required
                  maxLength={passwordMode === 'passcode' ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg">
                {submitError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full g-[#E31C25] hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/sign-in"
              className="text-[#FFD700] hover:underline text-sm"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
