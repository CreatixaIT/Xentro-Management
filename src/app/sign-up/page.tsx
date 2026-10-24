'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    age: '',
    address: '',
    nid: '',
    bloodGroup: '',
    contactNumber: '',
    emergencyContactNumber: '',
    designation: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'password' | 'passcode'>('password');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const usernameDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));

    // Handle username availability check
    if (name === 'username') {
      clearTimeout(usernameDebounceRef.current);
      const normalized = value.trim().toLowerCase();

      if (!normalized) {
        setUsernameStatus('idle');
        setUsernameMessage('');
        return;
      }

      // Basic format check
      const formatValid = /^[a-z0-9._-]{3,24}$/.test(normalized);
      if (!formatValid) {
        setUsernameStatus('invalid');
        setUsernameMessage('Username can only contain lowercase letters, digits, dot, underscore, and hyphen (3-24 characters)');
        return;
      }

      setUsernameStatus('checking');
      setUsernameMessage('Checking...');

      usernameDebounceRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/check-username?username=${encodeURIComponent(normalized)}`);
          const data = await response.json();

          if (data.available) {
            setUsernameStatus('available');
            setUsernameMessage('');
          } else {
            setUsernameStatus('taken');
            setUsernameMessage(data.message || 'Username already exists');
          }
        } catch (error) {
          setUsernameStatus('invalid');
          setUsernameMessage('Error checking username availability');
        }
      }, 500);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setErrors(prev => ({ ...prev, photo: '' }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // Validate photo
      if (!photo) {
        setErrors(prev => ({ ...prev, photo: 'Photo is required' }));
        setIsSubmitting(false);
        return;
      }

      // Create FormData
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      formDataToSend.append('photo', photo);
      formDataToSend.append('passwordMode', passwordMode);

      const response = await fetch('/api/sign-up', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setSubmitError(data.message || 'Registration failed');
        }
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to sign-in with pending approval message
      router.push('/sign-in?registered=true');
    } catch (error) {
      setSubmitError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

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
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="glass-panel rounded-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
          <div className="mb-6">
            <img
              src="/xentro-logo.png"
              alt="Xentro Logo"
              className="h-12 w-auto mb-4"
            />
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Create Employee Account
            </h1>
            <p className="text-gray-300 text-sm">
              Fill in your details to register as an employee
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-1">
                Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25] ${
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500' : ''
                } ${usernameStatus === 'available' ? 'border-green-500' : ''}`}
                placeholder="Enter username"
                required
              />
              {usernameMessage && (
                <p className={`text-xs mt-1 ${
                  usernameStatus === 'available' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {usernameMessage}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-200 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="Enter your full name"
                required
              />
              {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-200 mb-1">
                Age *
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                min="1"
                max="120"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="Enter your age"
                required
              />
              {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-200 mb-1">
                Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="Enter your address"
                required
              />
              {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
            </div>

            {/* NID */}
            <div>
              <label htmlFor="nid" className="block text-sm font-medium text-gray-200 mb-1">
                Bangladesh NID Number *
              </label>
              <input
                type="text"
                id="nid"
                name="nid"
                value={formData.nid}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="Enter your NID number"
                required
              />
              {errors.nid && <p className="text-red-400 text-xs mt-1">{errors.nid}</p>}
            </div>

            {/* Blood Group */}
            <div>
              <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-200 mb-1">
                Blood Group *
              </label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                required
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodGroup && <p className="text-red-400 text-xs mt-1">{errors.bloodGroup}</p>}
            </div>

            {/* Contact Number */}
            <div>
              <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-200 mb-1">
                Contact Number *
              </label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="+880XXXXXXXXXX"
                required
              />
              {errors.contactNumber && <p className="text-red-400 text-xs mt-1">{errors.contactNumber}</p>}
            </div>

            {/* Emergency Contact Number */}
            <div>
              <label htmlFor="emergencyContactNumber" className="block text-sm font-medium text-gray-200 mb-1">
                Emergency Contact Number *
              </label>
              <input
                type="tel"
                id="emergencyContactNumber"
                name="emergencyContactNumber"
                value={formData.emergencyContactNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="+880XXXXXXXXXX"
                required
              />
              {errors.emergencyContactNumber && <p className="text-red-400 text-xs mt-1">{errors.emergencyContactNumber}</p>}
            </div>

            {/* Designation */}
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-gray-200 mb-1">
                Designation *
              </label>
              <input
                type="text"
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="Enter your designation"
                required
              />
              {errors.designation && <p className="text-red-400 text-xs mt-1">{errors.designation}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                Registered Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                placeholder="Enter your email"
                required
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Photo */}
            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-gray-200 mb-1">
                Employee Photo *
              </label>
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#E31C25] file:text-white file:cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E31C25]"
                required
              />
              {errors.photo && <p className="text-red-400 text-xs mt-1">{errors.photo}</p>}
              {photoPreview && (
                <div className="mt-2">
                  <img
                    src={photoPreview}
                    alt="Photo preview"
                    className="w-32 h-32 object-cover rounded-lg border border-white/20"
                  />
                </div>
              )}
            </div>

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
                {passwordMode === 'password' ? 'Password *' : 'Passcode *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : passwordMode === 'passcode' ? 'tel' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C25] pr-10"
                  placeholder={passwordMode === 'passcode' ? '6-digit passcode' : 'Enter password'}
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
                  placeholder={passwordMode === 'passcode' ? 'Confirm 6-digit passcode' : 'Confirm password'}
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
              disabled={isSubmitting || (usernameStatus !== 'available' && !!formData.username)}
              className="w-full bg-[#E31C25] hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-[#FFD700] hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
