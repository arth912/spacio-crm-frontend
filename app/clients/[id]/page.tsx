"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  FileText, 
  IndianRupee, 
  Download, 
  ArrowLeft,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Check,
  User,
  LogOut,
  ChevronDown,
  X,
  Lock,
  Upload,
  Save,
  Users
} from 'lucide-react';
import SpaceLoader from '../../components/SpaceLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("decocrm_auth_token");
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

interface Quote {
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  version: number;
  grand_total: number;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  client_id: string;
  name: string;
  site_address: string;
  budget: number;
  status: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface PaymentRecord {
  id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

interface LocalDashboardData {
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  payments: PaymentRecord[];
}

const LOCAL_DASHBOARD_DATA_KEY = "decocrm_local_dashboard_data";

const readLocalDashboardData = (): LocalDashboardData => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { clients: [], projects: [], quotes: [], payments: [] };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DASHBOARD_DATA_KEY);
    if (!raw) return { clients: [], projects: [], quotes: [], payments: [] };
    const parsed = JSON.parse(raw);
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch {
    return { clients: [], projects: [], quotes: [], payments: [] };
  }
};

const mergeById = <T extends { id: string }>(primary: T[], secondary: T[]) => {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const sanitizeNumericString = (val: string): string => {
  if (!val) return "";
  let clean = val;
  if (/^0{2,}\./.test(clean)) {
    clean = clean.replace(/^0+/, '0');
  }
  if (/^0+[1-9]/.test(clean)) {
    clean = clean.replace(/^0+/, '');
  }
  if (/^0+$/.test(clean) && clean.length > 1) {
    clean = "0";
  }
  return clean;
};

export default function ClientProfile({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ 
    name: string; 
    email: string; 
    role: string;
    phone?: string;
    company_logo?: string;
    general_terms?: string;
  } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Profile update form states
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLogo, setProfileLogo] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileTerms, setProfileTerms] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  useEffect(() => {
    if (showProfileModal && user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
      setProfilePhone(user.phone || "");
      setProfileLogo(user.company_logo || "");
      setProfileTerms(user.general_terms || "");
      setProfilePassword("");
      setProfileError("");
      setProfileSuccess("");
    }
  }, [showProfileModal, user]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const payload: any = {
        name: profileName,
        email: profileEmail,
        phone: profilePhone || null,
        company_logo: profileLogo || null,
        general_terms: profileTerms || null,
      };

      if (profilePassword.trim()) {
        if (profilePassword.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }
        payload.new_password = profilePassword;
      }

      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile");
      }

      localStorage.setItem("decocrm_user", JSON.stringify(data));
      setUser(data);
      setProfileSuccess("Profile updated successfully!");
      setProfilePassword("");
      setTimeout(() => {
        setShowProfileModal(false);
      }, 1500);
    } catch (err: any) {
      console.error("Profile save error:", err);
      setProfileError(err.message || "An error occurred while saving profile details");
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("decocrm_auth_token");
    if (!token) {
      router.push(`/login?redirect=/clients/${params.id}`);
    } else {
      setIsAuthenticated(true);
      const rawUser = localStorage.getItem("decocrm_user");
      if (rawUser) {
        try {
          setUser(JSON.parse(rawUser));
        } catch (e) {
          console.error("Failed to parse decocrm_user", e);
        }
      }
    }
  }, [router, params.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clientId = params.id;
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Wire Transfer'>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPDF = async (e: React.MouseEvent, quoteId: string, projectName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingId(quoteId);
    try {
      const token = localStorage.getItem("decocrm_auth_token");
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`${API_BASE_URL}/quotations/${quoteId}/pdf`, {
        headers
      });

      if (!res.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '_')}_proposal.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      window.open(`/pdf/${quoteId}`, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !paymentAmount) return;
    
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const paymentPayload = {
      project_id: project.id,
      amount: amountNum,
      payment_method: paymentMethod,
      transaction_id: transactionId || null,
      notes: paymentNotes || null,
      payment_date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString()
    };

    try {
      if (!project.id.startsWith("local_project_")) {
        const res = await fetch(`${API_BASE_URL}/payments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(paymentPayload)
        });
        if (res.ok) {
          const newPayment = await res.json();
          setPayments(prev => [newPayment, ...prev]);
          setPaymentAmount('');
          setTransactionId('');
          setPaymentNotes('');
          setShowAddPaymentForm(false);
          return;
        }
      }
      
      const newLocalPayment = {
        id: `local_payment_${Date.now()}`,
        project_id: project.id,
        amount: amountNum,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        transaction_id: transactionId || "",
        notes: paymentNotes || "",
        created_at: new Date().toISOString()
      };

      const localData = readLocalDashboardData();
      const updatedPayments = [newLocalPayment, ...localData.payments];
      window.localStorage.setItem(LOCAL_DASHBOARD_DATA_KEY, JSON.stringify({
        ...localData,
        payments: updatedPayments
      }));

      setPayments(prev => [newLocalPayment, ...prev]);
      setPaymentAmount('');
      setTransactionId('');
      setPaymentNotes('');
      setShowAddPaymentForm(false);
    } catch (err) {
      console.error("Failed to add payment:", err);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      if (!paymentId.startsWith("local_payment_")) {
        const res = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          setPayments(prev => prev.filter(p => p.id !== paymentId));
          return;
        }
      }

      const localData = readLocalDashboardData();
      const updatedPayments = localData.payments.filter(p => p.id !== paymentId);
      window.localStorage.setItem(LOCAL_DASHBOARD_DATA_KEY, JSON.stringify({
        ...localData,
        payments: updatedPayments
      }));
      setPayments(prev => prev.filter(p => p.id !== paymentId));
    } catch (err) {
      console.error("Failed to delete payment:", err);
    }
  };

  const handleMakeFinal = async (quoteId: string) => {
    try {
      // 1. Send status update to backend
      const res = await fetch(`${API_BASE_URL}/quotations/${quoteId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (res.ok) {
        const approvedQuote = quotes.find(q => q.id === quoteId);
        if (approvedQuote) {
          // Update local state
          const updatedQuotes = quotes.map(q => {
            if (q.id === quoteId) {
              return { ...q, status: 'approved' };
            } else if (q.project_id === approvedQuote.project_id && q.status === 'approved') {
              return { ...q, status: 'revised' };
            }
            return q;
          });
          setQuotes(updatedQuotes);

          // Update local storage
          const localData = readLocalDashboardData();
          const updatedLocalQuotes = localData.quotes.map(q => {
            if (q.id === quoteId) {
              return { ...q, status: 'approved' };
            } else if (q.project_id === approvedQuote.project_id && q.status === 'approved') {
              return { ...q, status: 'revised' };
            }
            return q;
          });
          window.localStorage.setItem(LOCAL_DASHBOARD_DATA_KEY, JSON.stringify({
            ...localData,
            quotes: updatedLocalQuotes
          }));

          // Revise other quotes on the backend
          for (const q of quotes) {
            if (q.id !== quoteId && q.project_id === approvedQuote.project_id && q.status === 'approved') {
              await fetch(`${API_BASE_URL}/quotations/${q.id}/status`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  ...getAuthHeaders()
                },
                body: JSON.stringify({ status: 'revised' })
              }).catch(() => null);
            }
          }
        }
      } else {
        // Fallback to local storage update
        const approvedQuote = quotes.find(q => q.id === quoteId);
        if (approvedQuote) {
          const updatedQuotes = quotes.map(q => {
            if (q.id === quoteId) {
              return { ...q, status: 'approved' };
            } else if (q.project_id === approvedQuote.project_id && q.status === 'approved') {
              return { ...q, status: 'revised' };
            }
            return q;
          });
          setQuotes(updatedQuotes);

          const localData = readLocalDashboardData();
          const updatedLocalQuotes = localData.quotes.map(q => {
            if (q.id === quoteId) {
              return { ...q, status: 'approved' };
            } else if (q.project_id === approvedQuote.project_id && q.status === 'approved') {
              return { ...q, status: 'revised' };
            }
            return q;
          });
          window.localStorage.setItem(LOCAL_DASHBOARD_DATA_KEY, JSON.stringify({
            ...localData,
            quotes: updatedLocalQuotes
          }));
        }
      }

      // Also update project status to Start Working
      if (project && !project.id.startsWith("local_project_")) {
        await fetch(`${API_BASE_URL}/projects/${project.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            name: project.name,
            site_address: project.site_address,
            budget: project.budget,
            status: 'Start Working'
          })
        }).then(async (res) => {
          if (res.ok) {
            const updatedProj = await res.json();
            setProject(updatedProj);
          }
        }).catch(() => null);
      } else if (project) {
        const localData = readLocalDashboardData();
        const updatedProjects = localData.projects.map(p => {
          if (p.id === project.id) {
            return { ...p, status: 'Start Working' };
          }
          return p;
        });
        window.localStorage.setItem(LOCAL_DASHBOARD_DATA_KEY, JSON.stringify({
          ...localData,
          projects: updatedProjects
        }));
        setProject({ ...project, status: 'Start Working' });
      }
    } catch (err) {
      console.error("Failed to mark quote as final:", err);
    }
  };

  const handleProjectStatusChange = async (newStatus: string) => {
    if (!project) return;
    try {
      if (!project.id.startsWith("local_project_")) {
        const res = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            client_id: project.client_id,
            name: project.name,
            site_address: project.site_address,
            budget: project.budget,
            status: newStatus
          })
        });
        if (res.ok) {
          const updatedProj = await res.json();
          setProject(updatedProj);
        }
      } else {
        const localData = readLocalDashboardData();
        const updatedProjects = localData.projects.map(p => {
          if (p.id === project.id) {
            return { ...p, status: newStatus };
          }
          return p;
        });
        window.localStorage.setItem(LOCAL_DASHBOARD_DATA_KEY, JSON.stringify({
          ...localData,
          projects: updatedProjects
        }));
        setProject({ ...project, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update project status:", err);
    }
  };

  useEffect(() => {
    const fetchClientProfile = async () => {
      setLoading(true);
      setLoadingQuotes(true);
      try {
        const localData = readLocalDashboardData();
        let resolvedClient = localData.clients.find((c) => c.id === clientId) || null;
        let allProjects = [...localData.projects];
        let allQuotes = [...localData.quotes];

        const [clientRes, projectsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/clients/${clientId}`, { cache: 'no-store', headers: getAuthHeaders() }).catch(() => null),
          fetch(`${API_BASE_URL}/projects`, { cache: 'no-store', headers: getAuthHeaders() }).catch(() => null),
        ]);

        if (clientRes?.status === 401 || clientRes?.status === 403 || projectsRes?.status === 401 || projectsRes?.status === 403) {
          localStorage.removeItem("decocrm_auth_token");
          localStorage.removeItem("decocrm_user");
          router.push(`/login?redirect=/clients/${clientId}`);
          return;
        }

        if (clientRes?.ok) {
          resolvedClient = await clientRes.json();
        }

        if (projectsRes?.ok) {
          allProjects = mergeById(localData.projects, await projectsRes.json());
        }

        const clientProjects = allProjects.filter((p) => p.client_id === clientId);

        for (const clientProject of clientProjects) {
          if (clientProject.id.startsWith("local_project_")) continue;

          const qRes = await fetch(`${API_BASE_URL}/projects/${clientProject.id}/quotations`, { cache: 'no-store', headers: getAuthHeaders() }).catch(() => null);
          if (!qRes?.ok) continue;

          const qData = await qRes.json();
          const mappedQuotes = qData.map((q: any) => ({
            id: q.id,
            project_id: q.project_id,
            project_name: q.project_name || clientProject.name,
            client_name: q.client_name || resolvedClient?.name || "Unknown Client",
            version: q.version,
            grand_total: q.grand_total,
            status: q.status,
            created_at: q.created_at.split('T')[0]
          }));
          allQuotes = mergeById(allQuotes, mappedQuotes);
        }

        const clientProjectIds = new Set(clientProjects.map((p) => p.id));
        const clientQuotes = allQuotes
          .filter((q) => clientProjectIds.has(q.project_id))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.version - a.version);

        setClient(resolvedClient);
        const clientProject = clientProjects[0] || null;
        setProject(clientProject);
        setQuotes(clientQuotes);

        if (clientProject) {
          if (!clientProject.id.startsWith("local_project_")) {
            const payRes = await fetch(`${API_BASE_URL}/projects/${clientProject.id}/payments`, { cache: 'no-store', headers: getAuthHeaders() }).catch(() => null);
            if (payRes?.ok) {
              const payData = await payRes.json();
              setPayments(payData);
            }
          } else {
            setPayments(localData.payments ? localData.payments.filter(p => p.project_id === clientProject.id) : []);
          }
        }
      } catch (err) {
        console.log("Failed to load client profile.", err);
        const localData = readLocalDashboardData();
        const fallbackClient = localData.clients.find((c) => c.id === clientId) || null;
        const fallbackProjects = localData.projects.filter((p) => p.client_id === clientId);
        const fallbackProjectIds = new Set(fallbackProjects.map((p) => p.id));

        setClient(fallbackClient);
        const fallbackProject = fallbackProjects[0] || null;
        setProject(fallbackProject);
        setQuotes(localData.quotes.filter((q) => fallbackProjectIds.has(q.project_id)));

        if (fallbackProject) {
          setPayments(localData.payments ? localData.payments.filter(p => p.project_id === fallbackProject.id) : []);
        }
      } finally {
        setLoading(false);
        setLoadingQuotes(false);
      }
    };

    fetchClientProfile();
  }, [clientId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'start working':
      case 'execution':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'sent':
      case 'designing':
      case 'design phase':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'draft':
      case 'planning':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'on hold':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'completed':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  // Early return for auth checking
  if (isAuthenticated === null) {
    return <SpaceLoader loading={true} text="Verifying session..." />;
  }

  // If loading is complete but client is not found, return Client Not Found early
  if (!loading && !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-card max-w-sm border border-slate-100">
          <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-800">Client Not Found</h3>
          <p className="text-slate-400 text-xs mt-2">The client you are looking for does not exist or has been removed.</p>
          <a href="/dashboard" className="mt-5 inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Safe client wrapper to prevent page crashing while loading
  const displayClient = client || {
    name: "Loading Client Profile...",
    phone: "Loading...",
    email: "Loading...",
    address: "Loading site address..."
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <SpaceLoader loading={loading} text="Loading Client Profile..." />
      
      {/* NAV BAR */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/60 px-6 py-4 md:px-10">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {user?.company_logo ? (
              <img 
                src={user.company_logo} 
                alt="Logo" 
                className="w-8 h-8 object-contain rounded shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[13px] flex items-center justify-center shadow-sm uppercase shrink-0">
                {(user?.name || "D")[0]}
              </div>
            )}
            <div className="border-l border-slate-200 pl-2">
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">{user?.name || "Decoflare"}</h1>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">CRM ENGINE</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <a href="/dashboard" className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </a>
            
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-1.5 focus:outline-none hover:opacity-85 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[13px] flex items-center justify-center shadow-md uppercase">
                  {(user?.name || "U")[0]}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in py-2">
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-1.5">
                    <div>
                      <p className="text-xs font-black text-slate-800 truncate leading-none">{user?.name || "Decoflare User"}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-1 leading-none">{user?.email || "user@decoflare.in"}</p>
                    </div>
                    <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/40">
                      {user?.role || "Designer"}
                    </span>
                  </div>
                  
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-amber-50/40 rounded-xl transition-all text-left"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      My Profile
                    </button>
                    
                    {user?.role === 'Admin' && (
                      <a
                        href="/users"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-amber-50/40 rounded-xl transition-all text-left"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        Users Management
                      </a>
                    )}
                    
                    <button
                      onClick={() => {
                        localStorage.removeItem("decocrm_auth_token");
                        localStorage.removeItem("decocrm_user");
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        
        {/* Profile Card */}
        <div className="glass-panel border border-amber-200/60 rounded-3xl p-6 md:p-8 shadow-card relative overflow-hidden bg-white/40 mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl -z-10" />
          
          {/* Header: Client & Project Info */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">
                  Client Details
                </span>
                {project && (
                  <div className="relative inline-block">
                    <select
                      value={project.status}
                      onChange={(e) => handleProjectStatusChange(e.target.value)}
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-full border cursor-pointer outline-none transition-all pr-7 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378350f%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[right_8px_center] bg-no-repeat ${getStatusColor(project.status)}`}
                    >
                      <option value="Draft" className="bg-white text-slate-800 font-bold">Draft Status</option>
                      <option value="Designing" className="bg-white text-slate-800 font-bold">Designing Status</option>
                      <option value="Start Working" className="bg-white text-slate-800 font-bold">Start Working Status</option>
                      <option value="On Hold" className="bg-white text-slate-800 font-bold">On Hold Status</option>
                      <option value="Completed" className="bg-white text-slate-800 font-bold">Completed Status</option>
                    </select>
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-800 mt-2">{displayClient.name}</h2>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Project: <span className="text-slate-800 font-extrabold">{project ? project.name : 'N/A'}</span>
              </p>
            </div>

            {/* Budget Metric */}
            {/* Budget Metric */}
            <div className="p-4 bg-stone-900 text-white rounded-2xl shadow-md min-w-[220px] border border-stone-800">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest block">Project Budget</span>
              <div className="flex items-baseline gap-1 mt-1">
                <IndianRupee className="w-5 h-5 text-amber-500" />
                <span className="text-2xl font-black">{project ? project.budget.toLocaleString('en-IN') : '0'}</span>
              </div>
            </div>
          </div>

          {/* Content: Contacts Grid */}
          <div className="mt-6">
            <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-4">Contact & Site Info</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 text-xs bg-white/50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="text-slate-700 font-bold">{displayClient.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs bg-white/50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="text-slate-700 font-bold block truncate">{displayClient.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs bg-white/50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Site Address</span>
                  <span className="text-slate-700 font-bold leading-normal block">{project ? project.site_address : displayClient.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revision History Card (below the client details card) */}
        <div className="glass-panel border border-amber-200/60 rounded-3xl p-6 md:p-8 shadow-card relative overflow-hidden bg-white/40 mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl -z-10" />
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-800">Proposal Revision History</h3>
              <p className="text-xs text-slate-400 mt-1">Track estimates, download PDFs, and select the final revision for execution.</p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100/50 shrink-0 self-start sm:self-center">
              {quotes.length} Revision{quotes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingQuotes ? (
            <div className="flex flex-col items-center justify-center py-12">
              <SpaceLoader fullPage={false} size="md" text="Fetching revision history..." />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">No estimates generated yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Estimates created inside the quotation builder will show up here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((q) => {
                const isApproved = q.status.toLowerCase() === 'approved';
                return (
                  <div 
                    key={q.id}
                    className={`border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 shadow-sm hover:shadow ${
                      isApproved 
                        ? 'border-emerald-200 bg-emerald-50/15 shadow-emerald-50/20' 
                        : 'border-slate-100 hover:border-amber-200 bg-white/70 hover:bg-amber-50/10'
                    }`}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-bold text-[10px] font-mono px-2.5 py-0.5 rounded-lg border uppercase ${
                          isApproved 
                            ? 'bg-emerald-500 text-white border-emerald-500' 
                            : 'bg-slate-100 text-slate-700 border-slate-200/50'
                        }`}>
                          EST-{q.id.substring(0, 8)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusColor(q.status)}`}>
                          {isApproved ? 'Final Approved' : q.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{q.created_at}</span>
                      </div>
                      <h5 className="font-extrabold text-slate-800 text-sm truncate">{q.project_name}</h5>
                    </div>

                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Estimate Total</span>
                        <span className={`font-black text-sm ${isApproved ? 'text-emerald-700' : 'text-slate-800'}`}>
                          ₹{q.grand_total.toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <button 
                          onClick={(e) => handleDownloadPDF(e, q.id, q.project_name)}
                          disabled={downloadingId === q.id}
                          title="Download Proposal PDF"
                          className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-50 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm flex items-center justify-center"
                        >
                          {downloadingId === q.id ? (
                            <SpaceLoader fullPage={false} size="sm" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <a 
                          href={`/quotation-builder?edit=${q.id}`}
                          className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                          Edit
                        </a>
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-4 py-2 rounded-xl">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Selected Final
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMakeFinal(q.id)}
                            className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow group border border-stone-800"
                          >
                            <Check className="w-3.5 h-3.5 text-amber-500 group-hover:text-white transition-colors" />
                            Make Final
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Financial Tracking & Payments Card */}
        <div className="glass-panel border border-amber-200/60 rounded-3xl p-6 md:p-8 shadow-card relative overflow-hidden bg-white/40 mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl -z-10" />
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-800">Billing & Payment Tracking</h3>
              <p className="text-xs text-slate-400 mt-1">Record payments and manage collection history for this client.</p>
            </div>
            
            {project && (
              <button
                onClick={() => setShowAddPaymentForm(!showAddPaymentForm)}
                className="text-xs bg-stone-900 hover:bg-stone-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-center border border-stone-800"
              >
                {showAddPaymentForm ? 'Cancel Recording' : 'Record Received Payment'}
              </button>
            )}
          </div>

          {project ? (() => {
            const approvedQuote = quotes.find(q => q.status.toLowerCase() === 'approved');
            const totalProjectCost = approvedQuote ? approvedQuote.grand_total : 0;
            const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingBalance = Math.max(0, totalProjectCost - totalReceived);
            const collectionPercentage = totalProjectCost > 0 ? Math.min(100, Math.round((totalReceived / totalProjectCost) * 100)) : 0;

            return (
              <div className="space-y-6">
                
                {/* FINANCIAL SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Project Cost */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Contract Value</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <IndianRupee className="w-4 h-4 text-slate-400" />
                      <span className="text-xl font-extrabold text-slate-800">
                        {totalProjectCost > 0 ? totalProjectCost.toLocaleString('en-IN') : 'No final quote selected'}
                      </span>
                    </div>
                    {totalProjectCost === 0 && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1.5 block">
                        ⚠️ Please mark a revision as "Final" below to set contract budget.
                      </span>
                    )}
                  </div>

                  {/* Total Collected */}
                  <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-5">
                    <span className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider block">Total Collected</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                      <span className="text-xl font-extrabold text-emerald-700">
                        {totalReceived.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold mt-1.5 block">
                      {collectionPercentage}% of contract collected
                    </span>
                  </div>

                  {/* Pending Balance */}
                  <div className={`border rounded-2xl p-5 ${remainingBalance > 0 ? 'bg-amber-50/15 border-amber-100' : 'bg-slate-50/70 border-slate-100'}`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider block ${remainingBalance > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      Outstanding Balance
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <IndianRupee className={`w-4 h-4 ${remainingBalance > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className={`text-xl font-extrabold ${remainingBalance > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                        {remainingBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1.5 block">
                      {remainingBalance > 0 ? 'Awaiting payment stage milestone' : 'All payment stages collected'}
                    </span>
                  </div>
                </div>

                {/* COLLECTION PROGRESS BAR */}
                {totalProjectCost > 0 && (
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${collectionPercentage}%` }}
                    />
                  </div>
                )}

                {/* RECORD TRANSACTION FORM */}
                {showAddPaymentForm && (
                  <form onSubmit={handleAddPayment} className="border border-amber-100 bg-amber-50/10 p-5 rounded-2xl space-y-4 animate-fade-in bg-white shadow">
                    <h4 className="text-xs uppercase font-extrabold text-amber-700 tracking-wider">Record Received Payment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (₹) *</label>
                        <input 
                          type="number" 
                          required
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(sanitizeNumericString(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="e.g. 150000"
                          className="w-full text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 p-2.5 rounded-xl outline-none"
                        />
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method *</label>
                        <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 p-2.5 rounded-xl outline-none bg-white"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Wire Transfer">Wire Transfer</option>
                        </select>
                      </div>

                      {/* Payment Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Date</label>
                        <input 
                          type="date" 
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 p-2.5 rounded-xl outline-none"
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reference / Transaction ID */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Transaction Ref / ID (Optional)</label>
                        <input 
                          type="text" 
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. TXN9876543210 or wire ref"
                          className="w-full text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 p-2.5 rounded-xl outline-none"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notes / Remarks (Optional)</label>
                        <input 
                          type="text" 
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="e.g. Booking Advance 40% payment"
                          className="w-full text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPaymentForm(false)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="text-xs bg-stone-900 hover:bg-stone-800 text-white font-extrabold px-4 py-2 rounded-xl transition-colors shadow-sm"
                      >
                        Record Payment
                      </button>
                    </div>
                  </form>
                )}

                {/* PAYMENT TRANSACTION HISTORY TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="pb-3 pl-2">Date</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Reference / ID</th>
                        <th className="pb-3">Notes</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 pr-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payments.map((p) => (
                        <tr key={p.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors duration-150">
                          <td className="py-3.5 pl-2 font-medium text-slate-500">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              p.payment_method === 'Cash' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="py-3.5 font-semibold text-slate-700">
                            {p.transaction_id || '-'}
                          </td>
                          <td className="py-3.5 text-slate-400 font-medium">
                            {p.notes || '-'}
                          </td>
                          <td className="py-3.5 text-right font-bold text-slate-800">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 pr-2 text-right">
                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg border border-rose-100/50 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })() : (
            <p className="text-slate-400 text-xs font-semibold text-center py-6">
              No active project found for this client. Please create a project to track payments.
            </p>
          )}
        </div>
        {/* Footer */}
        <footer className="mt-12 border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-bold">
          <div className="flex justify-center items-center gap-2">
            <span>Powered by</span>
            <img src="/spacio_logo.png" alt="Spacio Logo" className="h-4 object-contain inline-block opacity-65 hover:opacity-100 transition-opacity" />
            <span className="text-slate-500">Spacio CRM</span>
          </div>
        </footer>
      </main>

      {/* PROFILE DETAILS MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 overflow-y-auto py-10">
          {/* Overlay */}
          <div 
            onClick={() => { if (!profileSaving) setShowProfileModal(false); }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
          />
          
          {/* Modal Content */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 w-full max-w-2xl relative z-10 animate-scale-up my-auto">
            <button 
              onClick={() => { if (!profileSaving) setShowProfileModal(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-955 tracking-tight">My Profile Settings</h3>
              <p className="text-xs text-slate-500 font-medium">Customize your company branding, contact details, and dynamic PDF terms.</p>
            </div>

            {profileError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-bold">
                ⚠️ {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-bold">
                ✨ {profileSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company / Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Decoflare"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="e.g. contact@decoflare.in"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="e.g. +91 99000 12345"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reset Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Leave blank to keep same"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Logo</label>
                <div className="flex gap-3 items-center">
                  {profileLogo ? (
                    <img 
                      src={profileLogo} 
                      alt="Logo Preview" 
                      className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-slate-50"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-extrabold uppercase">Logo</div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input 
                      type="text" 
                      value={profileLogo}
                      onChange={(e) => setProfileLogo(e.target.value)}
                      placeholder="Paste logo URL here..."
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[10px] cursor-pointer shadow-sm transition-all">
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="hidden" 
                        />
                      </label>
                      {profileLogo && (
                        <button
                          type="button"
                          onClick={() => setProfileLogo("")}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">General Terms & Conditions (Default on final PDF)</label>
                <textarea 
                  rows={6}
                  value={profileTerms}
                  onChange={(e) => setProfileTerms(e.target.value)}
                  placeholder="Enter standard project payment terms, validity, and completion rules..."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("decocrm_auth_token");
                    localStorage.removeItem("decocrm_user");
                    router.push("/login");
                  }}
                  className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all"
                  disabled={profileSaving}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/10 hover:shadow-lg transition-all"
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <>
                      <SpaceLoader fullPage={false} size="sm" />
                      <span>Saving Details...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
