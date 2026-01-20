import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Mail, Lock, User, Phone, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

// InputField component moved OUTSIDE to prevent re-creation on every render
const InputField = ({ icon: Icon, label, name, type = 'text', placeholder, required = false, value, onChange, focusedField, setFocusedField }) => (
  <div className="relative">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className={`relative rounded-xl transition-all duration-300 ${
      focusedField === name ? 'ring-2 ring-green-500/50' : ''
    }`}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className={`w-5 h-5 transition-colors ${
          focusedField === name ? 'text-green-600' : 'text-gray-400'
        }`} />
      </div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocusedField(name)}
        onBlur={() => setFocusedField(null)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500/50 focus:bg-white transition-all text-sm"
        required={required}
      />
    </div>
  </div>
);

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company_name: formData.company_name || null,
        password: formData.password,
      });
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'Send unlimited WhatsApp messages',
    'Real-time delivery tracking',
    'GST compliant invoices',
    'Pay-as-you-go pricing',
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -right-40 w-96 h-96 bg-green-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-300/10 rounded-full blur-[150px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <img src="/site_logo.png" alt="Akashvanni" className="h-12" />
            <span className="text-2xl font-bold text-gray-800 tracking-tight">Akashvanni</span>
          </div>

          {/* Hero text */}
          <h1 className="text-5xl xl:text-6xl font-bold text-gray-800 leading-tight mb-6">
            Start Your
            <span className="block bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              WhatsApp Journey
            </span>
          </h1>

          <p className="text-lg text-gray-600 mb-12 max-w-lg">
            Join thousands of businesses using Akashvanni to reach customers
            on WhatsApp with ease.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right side - Register form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-20" />

              {/* Card content */}
              <div className="relative bg-white/80 backdrop-blur-2xl border border-gray-200 rounded-3xl p-8 shadow-2xl">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
                  <img src="/site_logo.png" alt="Akashvanni" className="h-10" />
                  <span className="text-xl font-bold text-gray-800">Akashvanni</span>
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Create your account</h2>
                  <p className="text-gray-500 text-sm">Get started in just a few minutes</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    icon={User}
                    label="Full Name"
                    name="name"
                    placeholder="John Doe"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                  />

                  <InputField
                    icon={Mail}
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      icon={Phone}
                      label="Phone"
                      name="phone"
                      placeholder="+91 98765..."
                      value={formData.phone}
                      onChange={handleChange}
                      focusedField={focusedField}
                      setFocusedField={setFocusedField}
                    />

                    <InputField
                      icon={Building2}
                      label="Company"
                      name="company_name"
                      placeholder="Acme Inc"
                      value={formData.company_name}
                      onChange={handleChange}
                      focusedField={focusedField}
                      setFocusedField={setFocusedField}
                    />
                  </div>

                  <InputField
                    icon={Lock}
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="Min 6 characters"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                  />

                  <InputField
                    icon={Lock}
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                  />

                  {/* Submit button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full relative group mt-6"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300" />
                    <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-semibold">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                  </motion.button>
                </form>

                {/* Sign in link */}
                <p className="text-center text-gray-500 text-sm mt-6">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-green-600 font-medium hover:text-green-700 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-gray-500 text-sm mt-6">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-green-600 hover:underline">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-green-600 hover:underline">Privacy Policy</a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
