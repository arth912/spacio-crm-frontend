"use client";

import React, { useState, useEffect, Suspense } from 'react';
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
  EyeOff
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

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
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // If already logged in, redirect directly
    const token = localStorage.getItem("decocrm_auth_token");
    if (token) {
      router.push(redirectPath);
    }
  }, [router, redirectPath]);

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
        name: "Spacio CRM",
        description: `${payInfo.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan Subscription`,
        image: "/spacio_logo.png",
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
                razorpay_signature: response.razorpay_signature
              })
            });
            
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              localStorage.setItem("decocrm_auth_token", verifyData.access_token);
              localStorage.setItem("decocrm_user", JSON.stringify(verifyData.user));
              setSuccessMsg("Payment verified! Account activated successfully. Redirecting...");
              setUnpaidPaymentInfo(null);
              setTimeout(() => {
                router.push(redirectPath);
              }, 1200);
            } else {
              setErrorMsg(verifyData.detail || "Payment verification failed. Please contact support.");
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
          color: "#1c1917"
        },
        modal: {
          ondismiss: function() {
            setErrorMsg("Subscription payment was not completed.");
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
          localStorage.setItem("decocrm_auth_token", data.access_token);
          localStorage.setItem("decocrm_user", JSON.stringify(data.user));
          setSuccessMsg("Logged in successfully! Redirecting...");
          setTimeout(() => {
            router.push(redirectPath);
          }, 1000);
        } else {
          if (res.status === 402 && data.detail && data.detail.error === "payment_pending") {
            setUnpaidPaymentInfo(data.detail);
            setErrorMsg("Payment pending! Please complete your subscription payment to activate your account.");
          } else {
            setErrorMsg(data.detail || "Invalid email or password. Please try again.");
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
          // Open Razorpay Checkout overlay
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
            name: "Spacio CRM",
            description: `${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan Subscription`,
            image: "/spacio_logo.png",
            order_id: data.razorpay_order_id,
            handler: async function (response: any) {
              setLoading(true);
              try {
                const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-payment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_id: data.user.id,
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
                  setName("");
                  setEmail("");
                  setPassword("");
                  setPhone("");
                  setLogo("");
                  setTimeout(() => {
                    router.push(redirectPath);
                  }, 1200);
                } else {
                  setErrorMsg(verifyData.detail || "Payment verification failed. Please contact support.");
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
                setErrorMsg("Subscription registration was cancelled. Please click register and complete payment to create your account.");
                setLoading(false);
              }
            }
          };
          
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          setErrorMsg(data.detail || "Registration failed. Email might already exist.");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg("Unable to connect to the authentication server. Please verify the backend is active.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center items-center gap-3">
          <img 
            src="/spacio_logo.png" 
            alt="Spacio Logo" 
            className="w-10 h-10 object-contain rounded-xl shadow-md"
          />
          <div className="border-l border-slate-200 pl-3">
            <span className="text-xl font-black text-slate-900 tracking-tight leading-none block">Spacio</span>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5 block">Quotation Builder Auth</span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl animate-fade-in">
        <div className="bg-white/80 backdrop-blur-md py-8 px-4 shadow-card border border-slate-200/50 sm:rounded-2xl sm:px-10">
          
          {unpaidPaymentInfo ? (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <span className="text-3xl">💳</span>
                <h3 className="text-lg font-black text-slate-900 mt-2">Subscription Payment Pending</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Complete your registration payment to activate your Spacio CRM account.</p>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-bold animate-fade-in">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-bold animate-fade-in">
                  ✨ {successMsg}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="text-slate-800">{unpaidPaymentInfo.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="text-slate-800">{unpaidPaymentInfo.email}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Selected Plan:</span>
                  <span className="text-slate-850 uppercase bg-stone-100 px-2 py-0.5 rounded text-[10px] tracking-wider">{unpaidPaymentInfo.plan}</span>
                </div>
                <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center text-sm font-black">
                  <span className="text-slate-800">Amount Due:</span>
                  <span className="text-slate-900">₹{(unpaidPaymentInfo.amount / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleResumePayment(unpaidPaymentInfo)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-955 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Pay & Activate Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                
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
          ) : (
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

              {errorMsg && (
                <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-bold animate-fade-in">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-bold animate-fade-in">
                  ✨ {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === 'login' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. designer@decoflare.in"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. designer@decoflare.in"
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
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                      <input 
                        type="text" 
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
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
                            onClick={() => setLogo("")}
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
                        <p className="text-slate-400 text-[10px] font-semibold">Perfect for designers testing Spacio CRM.</p>
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
                  <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="mt-8 text-center text-xs text-slate-400 font-bold flex justify-center items-center gap-1.5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <span>Powered by</span>
          <img src="/spacio_logo.png" alt="Spacio Logo" className="h-4 object-contain opacity-60 hover:opacity-100 transition-opacity" />
          <span className="text-slate-500">Spacio CRM</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        <p className="text-slate-400 text-xs mt-3 font-semibold tracking-wider uppercase">Loading Authentication...</p>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
