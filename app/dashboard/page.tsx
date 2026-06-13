"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, 
  FileText, 
  Clock, 
  IndianRupee, 
  AlertTriangle, 
  TrendingUp, 
  Download, 
  ArrowRight,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  LogOut,
  X,
  Lock,
  Upload,
  Save,
  Users
} from 'lucide-react';
import SpaceLoader from '../components/SpaceLoader';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

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
  created_at?: string;
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

export default function Dashboard() {
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
      router.push("/login?redirect=/dashboard");
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
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [stats, setStats] = useState({
    activeProjects: 0,
    recentQuotes: 0,
    pendingQuotes: 0,
    revenue: 0,
    collected: 0,
    pendingPayments: 0,
    delayedProjects: 0
  });
  const [hasLoaded, setHasLoaded] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllClients, setShowAllClients] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [rightChartTab, setRightChartTab] = useState<'stages' | 'budgets'>('stages');
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
    // Load local storage data immediately on mount to show cached stats first!
    try {
      const localData = readLocalDashboardData();
      if (localData.projects.length > 0 || localData.quotes.length > 0) {
        setClients(localData.clients);
        setProjects(localData.projects);
        setRecentQuotes(localData.quotes);
        updateStatsFromData(localData.projects, localData.quotes, localData.payments || []);
        setHasLoaded(true);
      }
    } catch (e) {
      console.error("Failed to load initial local data", e);
    }
  }, []);

  const updateStatsFromData = (projectsData: Project[], quotesData: Quote[], paymentsData: any[]) => {
    const activeProjCount = projectsData.filter((p: any) => p.status !== 'Completed').length;
    const pendingQuotesCount = quotesData.filter((q: any) => q.status === 'sent' || q.status === 'pending' || q.status === 'draft').length;
    const approvedQuotes = quotesData.filter((q: any) => q.status === 'approved');
    const totalRevenue = approvedQuotes.reduce((sum, q) => sum + q.grand_total, 0);
    const delayedProjCount = projectsData.filter((p: any) => p.status === 'On Hold').length || 0;

    const totalCollected = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = Math.max(0, totalRevenue - totalCollected);

    setStats({
      activeProjects: activeProjCount,
      recentQuotes: quotesData.length,
      pendingQuotes: pendingQuotesCount,
      revenue: totalRevenue,
      collected: totalCollected,
      pendingPayments: pendingPayments,
      delayedProjects: delayedProjCount
    });
  };

  const fetchDashboardData = useCallback(async () => {
      setLoading(true);
      try {
        const localData = readLocalDashboardData();
        const clientsRes = await fetch(`${API_BASE_URL}/clients`, { 
          cache: 'no-store',
          headers: getAuthHeaders()
        });
        const projectsRes = await fetch(`${API_BASE_URL}/projects`, { 
          cache: 'no-store',
          headers: getAuthHeaders()
        });
        
        if (clientsRes.status === 401 || clientsRes.status === 403 || projectsRes.status === 401 || projectsRes.status === 403) {
          localStorage.removeItem("decocrm_auth_token");
          localStorage.removeItem("decocrm_user");
          router.push("/login?redirect=/dashboard");
          return;
        }
        
        let allPayments: any[] = [];
        try {
          const payRes = await fetch(`${API_BASE_URL}/payments`, { 
            cache: 'no-store',
            headers: getAuthHeaders()
          });
          if (payRes.ok) {
            allPayments = mergeById(localData.payments || [], await payRes.json());
          } else {
            allPayments = localData.payments || [];
          }
        } catch {
          allPayments = localData.payments || [];
        }

        if (clientsRes.ok && projectsRes.ok) {
          const clientsData = mergeById(localData.clients, await clientsRes.json());
          const projectsData = mergeById(localData.projects, await projectsRes.json());
          
          setClients(clientsData);
          setProjects(projectsData);
          
          // Fetch quotations for all projects
          const allQuotes: Quote[] = [...localData.quotes];
          for (const proj of projectsData) {
            try {
              if (proj.id.startsWith("local_project_")) continue;
              const qRes = await fetch(`${API_BASE_URL}/projects/${proj.id}/quotations`, { 
                cache: 'no-store',
                headers: getAuthHeaders()
              });
              if (qRes.ok) {
                const qData = await qRes.json();
                qData.forEach((q: any) => {
                  allQuotes.push({
                    id: q.id,
                    project_id: q.project_id,
                    project_name: q.project_name || proj.name,
                    client_name: q.client_name || (clientsData.find((c: any) => c.id === proj.client_id)?.name) || "Unknown",
                    version: q.version,
                    grand_total: q.grand_total,
                    status: q.status,
                    created_at: q.created_at.split('T')[0]
                  });
                });
              }
            } catch (e) {
              console.error("Failed to fetch quotations for project:", proj.id, e);
            }
          }
          
          allQuotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setRecentQuotes(allQuotes);
          
          updateStatsFromData(projectsData, allQuotes, allPayments);
          setHasLoaded(true);
        } else {
          setClients(localData.clients);
          setProjects(localData.projects);
          setRecentQuotes(localData.quotes);
          updateStatsFromData(localData.projects, localData.quotes, localData.payments || []);
          setHasLoaded(true);
        }
      } catch (err) {
        console.log("Backend offline. Rendering saved local data.", err);
        const localData = readLocalDashboardData();
        setClients(localData.clients);
        setProjects(localData.projects);
        setRecentQuotes(localData.quotes);
        updateStatsFromData(localData.projects, localData.quotes, localData.payments || []);
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handlePageShow = () => {
      fetchDashboardData();
    };

    const handleFocus = () => {
      fetchDashboardData();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'execution':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'sent':
      case 'design phase':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'draft':
      case 'planning':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getProgressWidth = (status: string) => {
    switch (status) {
      case 'Start Working':
      case 'Execution': return '65%';
      case 'Designing':
      case 'Design Phase': return '30%';
      case 'Draft':
      case 'Planning': return '10%';
      case 'Completed': return '100%';
      default: return '0%';
    }
  };

  // Deduplicate and sort clients (recent first)
  const getProcessedClients = () => {
    const uniqueClients: Client[] = [];
    const seen = new Set<string>();
    
    for (const c of clients) {
      const key = `${c.name.trim().toLowerCase()}_${c.phone.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueClients.push(c);
      }
    }

    uniqueClients.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

    return uniqueClients;
  };

  const processedClients = getProcessedClients();
  const totalClientPages = Math.ceil(processedClients.length / 10);
  const displayedClients = showAllClients 
    ? processedClients.slice((clientPage - 1) * 10, clientPage * 10) 
    : processedClients.slice(0, 5);
  const displayedQuotes = showAllQuotes ? recentQuotes : recentQuotes.slice(0, 5);
  const displayedProjects = showAllProjects ? projects : projects.slice(0, 5);

  const getMonthlyData = () => {
    const months: { name: string; key: string; total: number; approved: number; draft: number }[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const label = `${monthName} ${d.getFullYear()}`;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ name: label, key, total: 0, approved: 0, draft: 0 });
    }

    recentQuotes.forEach(q => {
      if (!q.created_at) return;
      const qYearMonth = q.created_at.substring(0, 7);
      const monthObj = months.find(m => m.key === qYearMonth);
      if (monthObj) {
        monthObj.total += q.grand_total;
        if (q.status.toLowerCase() === 'approved') {
          monthObj.approved += q.grand_total;
        } else if (q.status.toLowerCase() === 'draft') {
          monthObj.draft += q.grand_total;
        }
      }
    });

    return months;
  };

  const getProjectStatusData = () => {
    const statusCounts: Record<string, number> = {
      'Draft': 0,
      'Designing': 0,
      'Start Working': 0,
      'Completed': 0,
      'On Hold': 0
    };
    
    projects.forEach(p => {
      const status = p.status || 'Draft';
      let normalized = 'Draft';
      if (status.toLowerCase().includes('design')) normalized = 'Designing';
      else if (status.toLowerCase().includes('exec') || status.toLowerCase().includes('work')) normalized = 'Start Working';
      else if (status.toLowerCase().includes('comp')) normalized = 'Completed';
      else if (status.toLowerCase().includes('hold')) normalized = 'On Hold';
      
      if (normalized in statusCounts) {
        statusCounts[normalized]++;
      }
    });

    return Object.keys(statusCounts).map(name => ({
      name,
      value: statusCounts[name]
    })).filter(d => d.value > 0);
  };

  const getClientBudgetData = () => {
    const data = projects.map(p => {
      const client = clients.find(c => c.id === p.client_id);
      return {
        name: client ? client.name : p.name,
        budget: p.budget
      };
    });
    
    data.sort((a, b) => b.budget - a.budget);
    return data.slice(0, 5);
  };

  const rawData = getMonthlyData();
  const hasQuotationData = rawData.some(d => d.total > 0);
  const monthlyData = hasQuotationData ? rawData : [
    { name: 'Jan 2026', total: 450000, approved: 300000, draft: 150000 },
    { name: 'Feb 2026', total: 600000, approved: 450000, draft: 150000 },
    { name: 'Mar 2026', total: 800000, approved: 500000, draft: 300000 },
    { name: 'Apr 2026', total: 950000, approved: 685000, draft: 265000 },
    { name: 'May 2026', total: 1100000, approved: 850000, draft: 250000 },
    { name: 'Jun 2026', total: 1350000, approved: 1050000, draft: 300000 }
  ];

  const rawStatusData = getProjectStatusData();
  const hasStatusData = rawStatusData.length > 0;
  const statusData = hasStatusData ? rawStatusData : [
    { name: 'Draft', value: 3 },
    { name: 'Designing', value: 4 },
    { name: 'Start Working', value: 2 },
    { name: 'Completed', value: 5 },
    { name: 'On Hold', value: 1 }
  ];

  const rawBudgetData = getClientBudgetData();
  const hasBudgetData = rawBudgetData.length > 0;
  const budgetData = hasBudgetData ? rawBudgetData : [
    { name: 'Rajesh Kumar', budget: 450000 },
    { name: 'Amit Patel', budget: 350000 },
    { name: 'Priya Sharma', budget: 280000 },
    { name: 'Sneha Reddy', budget: 200000 },
    { name: 'Vikram Singh', budget: 150000 }
  ];

  const STATUS_COLORS: Record<string, string> = {
    'Draft': '#F59E0B',
    'Planning': '#F59E0B',
    'Designing': '#3B82F6',
    'Design Phase': '#3B82F6',
    'Start Working': '#10B981',
    'Execution': '#10B981',
    'Completed': '#8B5CF6',
    'On Hold': '#F43F5E'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 rounded-xl shadow-xl text-xs font-semibold">
          <p className="text-slate-500 mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="text-slate-900 font-extrabold">₹{entry.value.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 rounded-xl shadow-xl text-xs font-semibold">
          <p className="text-slate-900 font-bold mb-1">{data.name}</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span className="text-slate-500">Budget:</span>
            <span className="text-slate-900 font-extrabold">₹{data.budget.toLocaleString('en-IN')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 rounded-xl shadow-xl text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="text-slate-500">{data.name}:</span>
            <span className="text-slate-900 font-extrabold">{data.value} {data.value === 1 ? 'project' : 'projects'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isAuthenticated === null) {
    return <SpaceLoader loading={true} text="Verifying session..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <SpaceLoader loading={!hasLoaded} text="Loading dashboard data..." />
      
      {/* TOP NAV BAR */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/60 px-6 py-4 md:px-10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {user?.company_logo ? (
              <img 
                src={user.company_logo} 
                alt="Logo" 
                className="w-9 h-9 object-contain rounded-lg shadow"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[15px] flex items-center justify-center shadow-md uppercase shrink-0">
                {(user?.name || "D")[0]}
              </div>
            )}
            <div className="border-l border-slate-200 pl-3">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{user?.name || "Decoflare"}</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">CRM ENGINE</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <a 
              href="/quotation-builder" 
              className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Quotation
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

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">

        {/* GREETING */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back 👋</h2>
          <p className="text-slate-500 mt-1 text-sm">Here&apos;s what&apos;s happening with your interior design projects today.</p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          
          {/* Active Projects */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200/60 bg-gradient-to-br from-white via-white to-amber-50/15 shadow-sm hover:shadow-[0_8px_30px_rgba(217,119,6,0.08)] hover:border-amber-300/80 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Active Projects</span>
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-700">
                <Briefcase className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="mt-4">
              {!hasLoaded ? (
                <div className="h-9 w-16 bg-slate-200 animate-pulse rounded-lg mb-1.5" />
              ) : (
                <span className="text-3xl font-extrabold text-slate-800">{stats.activeProjects}</span>
              )}
              <div className="text-xs text-amber-700 flex items-center gap-1 mt-2.5 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active design & build pipeline</span>
              </div>
            </div>
          </div>

          {/* Quotations */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200/60 bg-gradient-to-br from-white via-white to-blue-50/15 shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.08)] hover:border-blue-300/80 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Quotations</span>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {!hasLoaded ? (
                <div className="h-9 w-16 bg-slate-200 animate-pulse rounded-lg mb-1.5" />
              ) : (
                <span className="text-3xl font-extrabold text-slate-800">{stats.recentQuotes}</span>
              )}
              <div className="text-xs text-blue-600 flex items-center gap-1 mt-2.5 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Total proposal revisions</span>
              </div>
            </div>
          </div>

          {/* Pending Approval */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200/60 bg-gradient-to-br from-white via-white to-amber-50/15 shadow-sm hover:shadow-[0_8px_30px_rgb(245,158,11,0.08)] hover:border-amber-300/80 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Pending</span>
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {!hasLoaded ? (
                <div className="h-9 w-16 bg-slate-200 animate-pulse rounded-lg mb-1.5" />
              ) : (
                <span className="text-3xl font-extrabold text-slate-800">{stats.pendingQuotes}</span>
              )}
              <div className="text-xs text-amber-600 flex items-center gap-1 mt-2.5 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Awaiting client signature</span>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200/60 bg-gradient-to-br from-white via-white to-emerald-50/15 shadow-sm hover:shadow-[0_8px_30px_rgb(16,185,129,0.08)] hover:border-emerald-300/80 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Revenue Pipeline</span>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {!hasLoaded ? (
                <div className="space-y-2 mb-1">
                  <div className="h-9 w-32 bg-slate-200 animate-pulse rounded-lg" />
                  <div className="h-3 w-28 bg-slate-100 animate-pulse rounded" />
                  <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-slate-800">
                    ₹{stats.revenue.toLocaleString('en-IN')}
                  </span>
                  <div className="text-[10px] text-slate-500 flex flex-col gap-0.5 mt-2.5 font-semibold">
                    <div className="text-emerald-600 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Collected: ₹{stats.collected.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-slate-400 pl-5">
                      Pending: ₹{stats.pendingPayments.toLocaleString('en-IN')}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Site Alerts */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200/60 bg-gradient-to-br from-white via-white to-rose-50/15 shadow-sm hover:shadow-[0_8px_30px_rgb(244,63,94,0.08)] hover:border-rose-300/80 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Site Alerts</span>
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              {!hasLoaded ? (
                <div className="h-9 w-16 bg-slate-200 animate-pulse rounded-lg mb-1.5" />
              ) : (
                <span className="text-3xl font-extrabold text-slate-800">{stats.delayedProjects}</span>
              )}
              <div className="text-xs text-rose-500 flex items-center gap-1 mt-2.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Milestones delayed or on hold</span>
              </div>
            </div>
          </div>

        </div>

        {/* DATA ANALYTICS & INSIGHTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 animate-fade-in" style={{ animationDelay: '0.12s' }}>
          
          {/* Revenue & Pipeline Charts Card */}
          <div className="glass-panel rounded-2xl p-6 shadow-card border border-slate-200/50 lg:col-span-2 bg-white flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-800">Estimation & Revenue Growth</h3>
                  {!hasQuotationData && (
                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-full">
                      Demo Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Monthly pipeline values showing total estimations vs approved revenue.</p>
              </div>
            </div>

            <div className="w-full h-[280px] relative">
              {!mounted ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <SpaceLoader fullPage={false} size="md" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val.toLocaleString('en-IN')}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" name="Total Estimate" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="approved" name="Approved Revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 15 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stage Mix & Leaderboard Card */}
          <div className="glass-panel rounded-2xl p-6 shadow-card border border-slate-200/50 bg-white flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-800">
                    {rightChartTab === 'stages' ? 'Project Stages' : 'Budget Leaderboard'}
                  </h3>
                  {((rightChartTab === 'stages' && !hasStatusData) || (rightChartTab === 'budgets' && !hasBudgetData)) && (
                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-full">
                      Demo Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {rightChartTab === 'stages' ? 'Stages composition of all projects.' : 'Top clients by approved project budget.'}
                </p>
              </div>
              
              <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setRightChartTab('stages')}
                  className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${
                    rightChartTab === 'stages'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Stages
                </button>
                <button
                  onClick={() => setRightChartTab('budgets')}
                  className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${
                    rightChartTab === 'budgets'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Budgets
                </button>
              </div>
            </div>

            <div className="w-full flex-grow flex flex-col items-center justify-center min-h-[240px] relative">
              {!mounted ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <SpaceLoader fullPage={false} size="md" />
                </div>
              ) : (
                rightChartTab === 'stages' ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-full h-[180px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94A3B8'} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3 max-w-xs">
                      {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] || '#94A3B8' }} />
                          <span>{entry.name} ({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[240px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                        <XAxis 
                          type="number" 
                          stroke="#94A3B8" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val.toLocaleString('en-IN')}`}
                        />
                        <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} width={80} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="budget" fill="#8B5CF6" radius={[0, 8, 8, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* CLIENTS DIRECTORY */}
        <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Client Directory</h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage and view client profiles, budgets and revision history.</p>
            </div>
            {processedClients.length > 5 && (
              <button 
                onClick={() => {
                  setShowAllClients(!showAllClients);
                  setClientPage(1);
                }}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 hover:gap-2 transition-all"
              >
                {showAllClients ? "Show Less" : "View All"}
                <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllClients ? '-rotate-90' : ''}`} />
              </button>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6 shadow-card border border-slate-200/50 bg-white">
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 pl-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                    <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                    <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Budget</th>
                    <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Details</th>
                    <th className="pb-3 px-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedClients.map((client, idx) => {
                    const clientProj = projects.find(p => p.client_id === client.id);
                    const initials = client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    const colors = [
                      'bg-amber-100 text-amber-800',
                      'bg-emerald-100 text-emerald-700',
                      'bg-pink-100 text-pink-700',
                      'bg-amber-100 text-amber-700'
                    ];
                    const avatarStyle = colors[idx % colors.length];
                    
                    return (
                      <tr key={client.id} className="text-sm text-slate-600 hover:bg-amber-50/20 transition-colors duration-150">
                        <td className="py-4 pl-4 pr-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${avatarStyle} flex items-center justify-center font-extrabold text-xs shrink-0`}>
                              {initials}
                            </div>
                            <span className="truncate max-w-[140px]" title={client.name}>{client.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-semibold">
                          <span className="truncate block max-w-[180px]" title={clientProj ? clientProj.name : ''}>
                            {clientProj ? clientProj.name : 'No active project'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800">
                          ₹{clientProj ? clientProj.budget.toLocaleString('en-IN') : '0'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1.5">
                            {client.email ? (
                              <a 
                                href={`mailto:${client.email}`} 
                                className="text-xs text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[180px]" title={client.email}>{client.email}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-300 italic">No email</span>
                            )}
                            {client.phone ? (
                              <a 
                                href={`tel:${client.phone}`} 
                                className="text-xs text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{client.phone}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-300 italic">No phone</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {clientProj && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(clientProj.status)}`}>
                              {clientProj.status}
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <a 
                            href={`/clients/${client.id}`}
                            className="text-xs bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow"
                          >
                            Open Profile
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedClients.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-medium text-xs">
                        No clients registered yet.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <SpaceLoader fullPage={false} size="md" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {showAllClients && totalClientPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 font-bold">
                <div>
                  Showing {(clientPage - 1) * 10 + 1} to {Math.min(clientPage * 10, processedClients.length)} of {processedClients.length} clients
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={clientPage === 1}
                    onClick={() => setClientPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:active:scale-100"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalClientPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setClientPage(pageNum)}
                      className={`px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-[0.98] ${
                        clientPage === pageNum 
                          ? 'bg-amber-500 text-white border border-amber-500 font-extrabold' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    disabled={clientPage === totalClientPages}
                    onClick={() => setClientPage(prev => Math.min(totalClientPages, prev + 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:active:scale-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          
          {/* RECENT QUOTATIONS TABLE */}
          <div className="glass-panel rounded-2xl p-6 shadow-card lg:col-span-2 border border-slate-200/50">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Recent Quotations</h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage, edit and download your proposals.</p>
              </div>
              <button 
                onClick={() => setShowAllQuotes(!showAllQuotes)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 hover:gap-2 transition-all"
              >
                {showAllQuotes ? "Show Less" : "View All"}
                <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllQuotes ? '-rotate-90' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 pl-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Proposal</th>
                    <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                    <th className="pb-3 px-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimation ID</th>
                    <th className="pb-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="pb-3 px-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedQuotes.map((q) => (
                    <tr key={q.id} className="text-sm text-slate-600 hover:bg-amber-50/20 transition-colors duration-150">
                      <td className="py-4 pl-4 pr-4 font-semibold text-slate-800">
                        {q.project_name}
                      </td>
                      <td className="py-4 px-4 text-slate-500">{q.client_name}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase">
                          EST-{q.id.substring(0, 8)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">
                        ₹{q.grand_total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(q.status)}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={(e) => handleDownloadPDF(e, q.id, q.project_name)}
                            disabled={downloadingId === q.id}
                            title="Download Proposal PDF"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center border border-slate-200 bg-white"
                          >
                            {downloadingId === q.id ? (
                              <SpaceLoader fullPage={false} size="sm" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <a 
                            href={`/quotation-builder?edit=${q.id}`}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-200 bg-white"
                          >
                            Edit
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentQuotes.length > 5 && (
              <div className="flex justify-center mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowAllQuotes(!showAllQuotes)}
                  className="text-xs bg-amber-50 hover:bg-amber-100/80 text-amber-800 font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:gap-2"
                >
                  {showAllQuotes ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View More ({recentQuotes.length - 5} more)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE PROJECTS SIDEBAR */}
          <div className="glass-panel rounded-2xl p-6 shadow-card border border-slate-200/50">
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-800">Execution Roadmap</h3>
              <p className="text-xs text-slate-400 mt-0.5">Track site progress & milestones.</p>
            </div>

            <div className="flex flex-col gap-4">
              {displayedProjects.map((proj) => (
                <div key={proj.id} className="border border-slate-100 rounded-xl p-4 bg-white/60 hover:shadow-card transition-all duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-sm">{proj.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(proj.status)}`}>
                      {proj.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400">Client: {clients.find(c => c.id === proj.client_id)?.name || 'Loading...'}</p>
                  
                  <div className="mt-3 flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-500">Budget:</span>
                    <span className="font-bold text-slate-800">₹{proj.budget.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-600 to-amber-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: getProgressWidth(proj.status) }}
                    />
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-slate-400 text-xs font-medium text-center py-4">No active projects found.</p>
              )}
            </div>
            {projects.length > 5 && (
              <div className="flex justify-center mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="text-xs bg-amber-50 hover:bg-amber-100/80 text-amber-800 font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:gap-2"
                >
                  {showAllProjects ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View More ({projects.length - 5} more)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
        {/* Footer */}
        <footer className="mt-12 border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-bold">
          <div className="flex justify-center items-center gap-2">
            <span>Powered by</span>
            <img src="/spacio_logo.png" alt="SpaceIO Logo" className="h-4 object-contain inline-block opacity-65 hover:opacity-100 transition-opacity" />
            <span className="text-slate-500">SpaceIO CRM</span>
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
