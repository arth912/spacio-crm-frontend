"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Upload,
  Eye,
  EyeOff,
  ChevronLeft
} from 'lucide-react';
import SpaceLoader from '../components/SpaceLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type FieldKey = 'email' | 'password' | 'name' | 'phone' | 'logo' | 'otpCode' | 'resetToken' | 'newPassword' | 'confirmNewPassword';

type DebouncedInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  /** Debounced: called once the user pauses typing (updates parent state / triggers re-render). */
  onValueChange: (v: string) => void;
  /** Immediate, no re-render: keeps the latest typed value available for submit. */
  onLiveChange?: (v: string) => void;
  transform?: (v: string) => string;
  delay?: number;
};

/**
 * Keeps keystrokes in local state so only this input re-renders while typing.
 * The parent form is updated after `delay` ms of inactivity (and on unmount).
 */
function DebouncedInput({ value, onValueChange, onLiveChange, transform, delay = 300, ...rest }: DebouncedInputProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const lastEmitted = useRef(value);
  const latest = useRef({ onValueChange });
  latest.current = { onValueChange };

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      lastEmitted.current = pending.current;
      latest.current.onValueChange(pending.current);
      pending.current = null;
    }
  }, []);

  // Pick up programmatic changes from the parent (e.g. logo upload, form reset)
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      pending.current = null;
      setLocal(value);
    }
  }, [value]);

  useEffect(() => flush, [flush]);

  return (
    <input
      {...rest}
      value={local}
      onChange={(e) => {
        const v = transform ? transform(e.target.value) : e.target.value;
        setLocal(v);
        onLiveChange?.(v);
        pending.current = v;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, delay);
      }}
      onBlur={(e) => {
        flush();
        rest.onBlur?.(e);
      }}
    />
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectPath =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.startsWith('/login')
      ? rawRedirect
      : '/dashboard';
  const logoutReason = searchParams.get('reason');

  // State Views: 'auth' (Sign In / Signup Tabs), 'verify_email', 'forgot_request', 'forgot_confirm'
  const [authView, setAuthView] = useState<'auth' | 'verify_email' | 'forgot_request' | 'forgot_confirm'>('auth');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [unpaidPaymentInfo, setUnpaidPaymentInfo] = useState<any>(null);
  const [couponCode, setCouponCode] = useState("");

  // New OTP & Password Reset Inputs
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Always-current values (updated on every keystroke without re-rendering); used by submit handlers
  const valuesRef = useRef<Record<FieldKey, string>>({
    email: "", password: "", name: "", phone: "", logo: "",
    otpCode: "", resetToken: "", newPassword: "", confirmNewPassword: "",
  });
  const live = (k: FieldKey) => (v: string) => { valuesRef.current[k] = v; };
  const resetFields = (...keys: FieldKey[]) => { keys.forEach((k) => { valuesRef.current[k] = ""; }); };

  useEffect(() => {
    if (logoutReason === 'idle') setErrorMsg("You were signed out after a period of inactivity. Please sign in again.");
    else if (logoutReason === 'expired') setErrorMsg("Your session has ended (it expired or you signed in on another device). Please sign in again.");
  }, [logoutReason]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        valuesRef.current.logo = reader.result as string;
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // If already logged in, check if access has expired
    const token = localStorage.getItem("decocrm_auth_token");
    const rawUser = localStorage.getItem("decocrm_user");
    if (token) {
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (u.access_end && new Date(u.access_end) < new Date() && u.role !== 'Admin') {
            localStorage.removeItem("decocrm_auth_token");
            localStorage.removeItem("decocrm_user");
            setErrorMsg("Your account access has expired. Please sign in below to select a plan and renew your subscription.");
            return;
          }
        } catch (e) {}
      }
      router.replace(redirectPath);
    }
  }, [router, redirectPath]);

  const handleChangePlan = async (newPlan: 'monthly' | 'yearly') => {
    if (!unpaidPaymentInfo) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/create-subscription-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: unpaidPaymentInfo.user_id,
          selected_plan: newPlan
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUnpaidPaymentInfo((prev: any) => ({
          ...prev,
          ...data,
          plan: newPlan,
          amount: data.amount,
          razorpay_order_id: data.razorpay_order_id
        }));
      } else {
        setErrorMsg(errText(data.detail, "Failed to update plan selection."));
      }
    } catch (err) {
      console.error("Plan switch error:", err);
      setErrorMsg("Connection error while updating plan selection.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!unpaidPaymentInfo || !couponCode.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/redeem-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: unpaidPaymentInfo.user_id, code: couponCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("decocrm_auth_token");
        localStorage.removeItem("decocrm_user");
        setUnpaidPaymentInfo(null);
        setCouponCode("");
        setAuthView('auth');
        setActiveTab('login');
        setSuccessMsg("🎉 Coupon applied! You now have 2 months of free access to all features. Please sign in to continue.");
      } else {
        setErrorMsg(errText(data.detail, "Could not apply this coupon."));
      }
    } catch (err) {
      console.error("Coupon redeem error:", err);
      setErrorMsg("Connection error while applying the coupon.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumePayment = async (payInfo: any) => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setErrorMsg("Failed to load Razorpay checkout script. Please check your internet connection.");
        setLoading(false);
        return;
      }
      
      const options = {
        key: payInfo.razorpay_key_id,
        amount: payInfo.amount,
        currency: "INR",
        name: "SpaceIO CRM",
        description: `${payInfo.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan Subscription`,
        image: "/spaceio_logo.png",
        order_id: payInfo.razorpay_order_id,
        handler: async function (response: any) {
          setLoading(true);
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: payInfo.user_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                selected_plan: payInfo.plan
              })
            });
            
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              // Reset auth state & redirect to login view
              localStorage.removeItem("decocrm_auth_token");
              localStorage.removeItem("decocrm_user");
              setUnpaidPaymentInfo(null);
              setAuthView('auth');
              setActiveTab('login');
              setSuccessMsg("🎉 Payment verified & plan activated! Confirmation email with plan details has been sent. Please log in to continue.");
              router.push('/login');
            } else {
              setErrorMsg(errText(verifyData.detail, "Payment verification failed. Please contact support."));
            }
          } catch (err) {
            console.error("Verification error:", err);
            setErrorMsg("Payment verification server connection failed.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: payInfo.name,
          email: payInfo.email,
          contact: payInfo.phone
        },
        theme: {
          color: "#ea580c"
        },
        modal: {
          ondismiss: function() {
            setErrorMsg("Subscription payment was cancelled.");
            setLoading(false);
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment launch error:", err);
      setErrorMsg("Failed to open Razorpay payment interface.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password, name, phone, logo } = valuesRef.current;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (activeTab === 'login') {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
          // Login returns only the token; load the profile from the user API.
          const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` }
          });
          if (!meRes.ok) {
            setErrorMsg("Signed in, but could not load your profile. Please try again.");
            return;
          }
          const me = await meRes.json();
          localStorage.setItem("decocrm_auth_token", data.access_token);
          localStorage.setItem("decocrm_user", JSON.stringify(me));
          localStorage.setItem("decocrm_last_active", String(Date.now()));
          setSuccessMsg("Logged in successfully! Redirecting...");
          router.replace(redirectPath);
        } else {
          if (res.status === 402 && data.detail && (data.detail.error === "payment_pending" || data.detail.error === "access_expired")) {
            setUnpaidPaymentInfo(data.detail);
            if (data.detail.error === "access_expired") {
              setErrorMsg("Your account access has expired! Please select a plan (Monthly or Yearly) below to complete payment and renew access.");
            } else {
              setErrorMsg("Payment pending! Please complete your subscription payment to activate your account.");
            }
          } else if (res.status === 403 && data.detail === "email_unverified") {
            setErrorMsg("Your email address is unverified. Please complete verification.");
            setAuthView('verify_email');
          } else {
            setErrorMsg(errText(data.detail, "Invalid email or password. Please try again."));
          }
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name, 
            email, 
            password, 
            phone, 
            company_logo: logo || null,
            selected_plan: selectedPlan
          })
        });

        const data = await res.json();
        if (res.ok) {
          setSuccessMsg("Registration successful! A 6-digit verification code has been sent to your email.");
          setAuthView('verify_email');
        } else {
          setErrorMsg(errText(data.detail, "Registration failed. Email might already exist."));
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg("Unable to connect to the authentication server. Please verify the backend is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password, name, phone, logo, otpCode } = valuesRef.current;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(errText(data.detail, "Invalid or expired verification code."));
      }

      setSuccessMsg("Email address verified! Launching subscription payment overlay...");
      
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setErrorMsg("Failed to load Razorpay checkout script. Please check your internet connection.");
        setLoading(false);
        return;
      }

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: "SpaceIO CRM",
        description: `${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan Subscription`,
        image: "/spaceio_logo.png",
        order_id: data.razorpay_order_id,
        handler: async function (response: any) {
          setLoading(true);
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: data.user_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                name: name,
                email: email,
                password: password,
                phone: phone,
                company_logo: logo || null,
                selected_plan: selectedPlan
              })
            });
            
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              localStorage.setItem("decocrm_auth_token", verifyData.access_token);
              localStorage.setItem("decocrm_user", JSON.stringify(verifyData.user));
              setSuccessMsg("Payment verified! Account activated successfully. Redirecting...");
              resetFields('name', 'email', 'password', 'phone', 'logo', 'otpCode');
              setName("");
              setEmail("");
              setPassword("");
              setPhone("");
              setLogo("");
              setOtpCode("");
              setAuthView('auth');
              router.replace(redirectPath);
            } else {
              setErrorMsg(errText(verifyData.detail, "Payment verification failed. Please contact support."));
            }
          } catch (err) {
            console.error("Verification error:", err);
            setErrorMsg("Payment verification server connection failed.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: name,
          email: email,
          contact: phone
        },
        theme: {
          color: "#1c1917"
        },
        modal: {
          ondismiss: function() {
            setErrorMsg("Subscription registration payment was cancelled. You can sign in to complete payment later.");
            setLoading(false);
            setAuthView('auth');
            setActiveTab('login');
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify email code.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email } = valuesRef.current;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(errText(data.detail, "Failed to submit password reset request."));
      }
      setSuccessMsg("Password reset code triggered! If your email is registered, you will receive a code.");
      setAuthView('forgot_confirm');
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, resetToken, newPassword, confirmNewPassword } = valuesRef.current;
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          token: resetToken, 
          new_password: newPassword 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(errText(data.detail, "Failed to reset password."));
      }
      setSuccessMsg("Password has been reset successfully! Please sign in with your new password.");
      setAuthView('auth');
      setActiveTab('login');
      resetFields('password', 'newPassword', 'confirmNewPassword', 'resetToken');
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetToken("");
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center items-center gap-3">
          <img 
            src="/spaceio_logo.png" 
            alt="SpaceIO Logo" 
            className="w-10 h-10 object-contain rounded-xl shadow-md"
          />
          <div className="border-l border-slate-200 pl-3">
            <span className="text-xl font-black text-slate-900 tracking-tight leading-none block">SpaceIO</span>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5 block">Quotation Builder Auth</span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white/80 backdrop-blur-md py-8 px-4 shadow-card border border-slate-200/50 sm:rounded-2xl sm:px-10">
          
          {errorMsg && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-bold flex items-start gap-2">
              <span className="shrink-0 text-[14px]">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-bold flex items-start gap-2">
              <span className="shrink-0 text-[14px]">✨</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: UNPAID RESUME PAYMENT & EXPIRED ACCESS PLAN SELECTION */}
          {unpaidPaymentInfo && authView === 'auth' ? (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-3xl">💳</span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  {unpaidPaymentInfo.error === 'access_expired' ? 'Account Access Expired' : 'Subscription Payment Pending'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {unpaidPaymentInfo.error === 'access_expired' 
                    ? 'Select a plan (Monthly or Yearly) and complete payment to restore full access to your account.'
                    : 'Complete your subscription payment to activate your SpaceIO CRM account.'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="text-slate-800">{unpaidPaymentInfo.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="text-slate-800">{unpaidPaymentInfo.email}</span>
                </div>

                {/* PLAN SELECTION TOGGLE */}
                <div className="pt-1">
                  <span className="text-xs font-bold text-slate-600 block mb-2">Choose Plan Duration:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChangePlan('monthly')}
                      disabled={loading}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        unpaidPaymentInfo.plan === 'monthly'
                          ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">Monthly</span>
                        {unpaidPaymentInfo.plan === 'monthly' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-orange-600 mt-1">₹499 <span className="text-[10px] text-slate-400 font-normal">/ mo</span></div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">30 days access</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangePlan('yearly')}
                      disabled={loading}
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                        unpaidPaymentInfo.plan === 'yearly'
                          ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="absolute -right-6 top-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black px-6 py-0.5 rotate-45 shadow-xs">SAVE 16%</div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">Yearly</span>
                        {unpaidPaymentInfo.plan === 'yearly' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-orange-600 mt-1">₹4,999 <span className="text-[10px] text-slate-400 font-normal">/ yr</span></div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">365 days access</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center text-sm font-black">
                  <span className="text-slate-800">Total Amount Due:</span>
                  <span className="text-orange-600 text-base">₹{(unpaidPaymentInfo.amount / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleResumePayment(unpaidPaymentInfo)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md shadow-orange-600/20 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <SpaceLoader fullPage={false} size="sm" />
                  ) : (
                    <>
                      <span>Pay ₹{(unpaidPaymentInfo.amount / 100).toLocaleString('en-IN')} & Activate Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                
                <div className="border-t border-slate-200/60 pt-3">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Have a coupon code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      maxLength={50}
                      placeholder="Enter coupon code"
                      disabled={loading}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    <button
                      type="button"
                      onClick={handleRedeemCoupon}
                      disabled={loading || !couponCode.trim()}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Valid coupons unlock all features free for 2 months.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUnpaidPaymentInfo(null);
                    setErrorMsg("");
                  }}
                  disabled={loading}
                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 py-1.5 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : authView === 'verify_email' ? (
            /* VIEW: EMAIL VERIFICATION OTP SCREEN */
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-3xl">✉️</span>
                <h3 className="text-lg font-black text-slate-900 mt-2">Verify Your Email</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">We have sent a 6-digit verification code to <span className="text-stone-900 font-bold">{email}</span>. Please enter it below.</p>
              </div>

              <form onSubmit={handleVerifyEmail} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-center">
                    6-Digit Code
                  </label>
                  <DebouncedInput
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onValueChange={setOtpCode}
                    onLiveChange={live('otpCode')}
                    transform={(v) => v.replace(/\D/g, '')}
                    placeholder="e.g. 123456"
                    className="w-full text-center text-lg font-mono font-black bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 tracking-[0.4em] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 focus:outline-none"
                  >
                    {loading ? (
                      <SpaceLoader fullPage={false} size="sm" />
                    ) : (
                      <>
                        <span>Verify & Proceed to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <button
                onClick={() => {
                  setAuthView('auth');
                  setErrorMsg("");
                  setSuccessMsg("");
                  resetFields('otpCode');
                  setOtpCode("");
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-750 flex items-center justify-center gap-1 mt-4"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : authView === 'forgot_request' ? (
            /* VIEW: FORGOT PASSWORD EMAIL REQUEST */
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-3xl">🔑</span>
                <h3 className="text-lg font-black text-slate-900 mt-2">Reset Password</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Enter your registered email address and we'll send you a 6-digit OTP code to verify and set a new password.</p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <DebouncedInput
                      type="email"
                      required
                      value={email}
                      onValueChange={setEmail}
                      onLiveChange={live('email')}
                      placeholder="e.g. hello@withspaceio.in"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 focus:outline-none"
                  >
                    {loading ? (
                      <SpaceLoader fullPage={false} size="sm" />
                    ) : (
                      <>
                        <span>Send Reset Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <button
                onClick={() => {
                  setAuthView('auth');
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-750 flex items-center justify-center gap-1 mt-4"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : authView === 'forgot_confirm' ? (
            /* VIEW: PASSWORD RESET TOKEN & NEW PASSWORD FORM */
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-3xl">🔒</span>
                <h3 className="text-lg font-black text-slate-900 mt-2">Set New Password</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">We have sent a reset verification code to <span className="font-bold text-stone-900">{email}</span>. Fill in the code and your new credentials below.</p>
              </div>

              <form onSubmit={handleConfirmReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-center">
                    6-Digit Verification Code
                  </label>
                  <DebouncedInput
                    type="text"
                    required
                    maxLength={6}
                    value={resetToken}
                    onValueChange={setResetToken}
                    onLiveChange={live('resetToken')}
                    transform={(v) => v.replace(/\D/g, '')}
                    placeholder="e.g. 123456"
                    className="w-full text-center text-base font-mono font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 tracking-[0.3em] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <DebouncedInput
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onValueChange={setNewPassword}
                      onLiveChange={live('newPassword')}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <DebouncedInput
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onValueChange={setConfirmNewPassword}
                      onLiveChange={live('confirmNewPassword')}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 focus:outline-none"
                  >
                    {loading ? (
                      <SpaceLoader fullPage={false} size="sm" />
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <button
                onClick={() => {
                  setAuthView('auth');
                  setErrorMsg("");
                  setSuccessMsg("");
                  resetFields('resetToken', 'newPassword', 'confirmNewPassword');
                  setResetToken("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-750 flex items-center justify-center gap-1 mt-4"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : (
            /* VIEW: DEFAULT SIGN IN / SIGN UP AUTH INTERFACE */
            <>
              {/* TAB SELECTOR */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 mb-6">
                <button
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'login'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'register'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {activeTab === 'login' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <DebouncedInput
                          type="email"
                          required
                          value={email}
                          onValueChange={setEmail}
                          onLiveChange={live('email')}
                          placeholder="e.g. hello@withspaceio.in"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg("");
                            setSuccessMsg("");
                            setAuthView('forgot_request');
                          }}
                          className="text-[11px] font-black text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <DebouncedInput
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onValueChange={setPassword}
                          onLiveChange={live('password')}
                          placeholder="••••••••"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <DebouncedInput
                          type="text"
                          required
                          value={name}
                          onValueChange={setName}
                          onLiveChange={live('name')}
                          placeholder="e.g. Rajesh Kumar"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Phone Number <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-black">📞</span>
                        <DebouncedInput
                          type="tel"
                          required
                          value={phone}
                          onValueChange={setPhone}
                          onLiveChange={live('phone')}
                          placeholder="e.g. +91 99000 12345"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <DebouncedInput
                          type="email"
                          required
                          value={email}
                          onValueChange={setEmail}
                          onLiveChange={live('email')}
                          placeholder="e.g. hello@withspaceio.in"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Password <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <DebouncedInput
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onValueChange={setPassword}
                          onLiveChange={live('password')}
                          placeholder="••••••••"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Company Logo (Optional)
                      </label>
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                        {logo ? (
                          <img 
                            src={logo} 
                            alt="Preview" 
                            className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-100/50 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 00-1.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <DebouncedInput 
                            type="text" 
                            value={logo}
                            onValueChange={setLogo}
                            onLiveChange={live('logo')}
                            placeholder="Paste logo URL here..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                          />
                          <div className="flex items-center gap-2.5">
                            <label className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all border border-slate-200 shadow-sm">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>Upload File</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleLogoUpload} 
                                className="hidden" 
                              />
                            </label>
                            {logo && (
                              <button
                                type="button"
                                onClick={() => { resetFields('logo'); setLogo(""); }}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 transition-colors"
                              >
                                Remove Logo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Choose plan */}
                    <div className="md:col-span-2 mt-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                        Choose Your Subscription Plan <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Monthly Card */}
                        <div 
                          onClick={() => setSelectedPlan('monthly')}
                          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                            selectedPlan === 'monthly'
                              ? 'border-stone-900 bg-stone-50/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Monthly Plan</span>
                              {selectedPlan === 'monthly' && <span className="w-2.5 h-2.5 rounded-full bg-stone-900" />}
                            </div>
                            <p className="text-slate-400 text-[10px] font-semibold">Perfect for designers testing SpaceIO CRM.</p>
                          </div>
                          <div className="mt-4">
                            <span className="text-2xl font-black text-slate-900">₹499</span>
                            <span className="text-slate-400 text-xs font-bold"> / month</span>
                          </div>
                        </div>

                        {/* Yearly Card */}
                        <div 
                          onClick={() => setSelectedPlan('yearly')}
                          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                            selectedPlan === 'yearly'
                              ? 'border-stone-900 bg-stone-50/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                            Save 17%
                          </span>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Yearly Plan</span>
                              {selectedPlan === 'yearly' && <span className="w-2.5 h-2.5 rounded-full bg-stone-900" />}
                            </div>
                            <p className="text-slate-400 text-[10px] font-semibold">Best value! Unlimited estimations for a year.</p>
                          </div>
                          <div className="mt-4">
                            <span className="text-2xl font-black text-slate-900">₹4,999</span>
                            <span className="text-slate-400 text-xs font-bold"> / year</span>
                            <p className="text-emerald-600 text-[9px] font-extrabold mt-1">₹417/mo equivalent (saves ₹989)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white border border-stone-950 font-bold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {loading ? (
                      <SpaceLoader fullPage={false} size="sm" />
                    ) : (
                      <>
                        <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 font-bold flex justify-center items-center gap-1.5" style={{ animationDelay: '0.1s' }}>
          <span>Powered by</span>
          <img src="/spaceio_logo.png" alt="SpaceIO Logo" className="h-4 object-contain opacity-60 hover:opacity-100 transition-opacity" />
          <span className="text-slate-500">SpaceIO CRM</span>
        </div>
      </div>
    </div>
  );
}

// FastAPI returns `detail` as a string, or as an array of validation errors (422): always render text.
const errText = (detail: any, fallback: string): string => {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail[0]?.msg) {
    const field = Array.isArray(detail[0].loc) ? String(detail[0].loc[detail[0].loc.length - 1]) : '';
    return field ? `${field}: ${detail[0].msg}` : String(detail[0].msg);
  }
  return fallback;
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <SpaceLoader loading={true} text="Loading Authentication..." />
    }>
      <LoginFormContent />
    </Suspense>
  );
}
