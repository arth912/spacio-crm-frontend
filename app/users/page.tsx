"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserCheck, 
  Trash2, 
  ChevronLeft, 
  Loader2, 
  Search, 
  ShieldAlert,
  Mail,
  Briefcase,
  Calendar,
  AlertCircle,
  Check,
  X,
  Upload
} from 'lucide-react';
import SpaceLoader from '../components/SpaceLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("decocrm_auth_token");
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_approved: boolean;
  phone?: string;
  created_at: string;
  access_start?: string;
  access_end?: string;
  company_logo?: string;
  general_terms?: string;
}

interface SubscriptionPayment {
  id: string;
  user_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  plan: string;
  amount: number;
  access_start: string;
  access_end: string;
  created_at: string;
}

export default function UsersManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editedUsers, setEditedUsers] = useState<Record<string, { role: string; access_start: string; access_end: string }>>({});

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editAccessStart, setEditAccessStart] = useState("");
  const [editAccessEnd, setEditAccessEnd] = useState("");
  const [editCompanyLogo, setEditCompanyLogo] = useState("");
  const [editGeneralTerms, setEditGeneralTerms] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPayment[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      setEditName(selectedUser.name || "");
      setEditEmail(selectedUser.email || "");
      setEditPhone(selectedUser.phone || "");
      setEditRole(selectedUser.role || "Designer");
      setEditAccessStart(selectedUser.access_start ? selectedUser.access_start.substring(0, 10) : "");
      setEditAccessEnd(selectedUser.access_end ? selectedUser.access_end.substring(0, 10) : "");
      setEditCompanyLogo(selectedUser.company_logo || "");
      setEditGeneralTerms(selectedUser.general_terms || "");
      setModalError("");
      setModalSuccess("");

      const fetchSubscriptions = async () => {
        setSubsLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/users/${selectedUser.id}/subscriptions`, {
            headers: getAuthHeaders()
          });
          if (!res.ok) throw new Error("Failed to load subscription history.");
          const data = await res.json();
          setSubscriptions(data);
        } catch (err: any) {
          console.error("Error loading subscription history:", err);
        } finally {
          setSubsLoading(false);
        }
      };
      fetchSubscriptions();
    } else {
      setSubscriptions([]);
    }
  }, [selectedUser]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditCompanyLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleModalSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");
    
    try {
      const requestBody = {
        role: editRole,
        access_start: editAccessStart ? `${editAccessStart}T00:00:00` : null,
        access_end: editAccessEnd ? `${editAccessEnd}T23:59:59` : null,
        name: editName,
        email: editEmail,
        phone: editPhone,
        company_logo: editCompanyLogo || null,
        general_terms: editGeneralTerms || null
      };

      const res = await fetch(`${API_BASE_URL}/users/${selectedUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update user profile.");
      }
      
      const updatedUser = await res.json();
      
      // Update local storage if the user edited their own profile
      if (currentAdmin && selectedUser.id === currentAdmin.id) {
        localStorage.setItem("decocrm_user", JSON.stringify(updatedUser));
        setCurrentAdmin(updatedUser);
      }
      
      setModalSuccess("User profile updated successfully!");
      fetchUsers();
      
      // Auto-close modal after success message is shown
      setTimeout(() => {
        setSelectedUser(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleFieldChange = (userId: string, field: 'role' | 'access_start' | 'access_end', value: string) => {
    setEditedUsers(prev => {
      const originalUser = users.find(usr => usr.id === userId);
      if (!originalUser) return prev;
      
      const currentEdit = prev[userId] || {
        role: originalUser.role,
        access_start: originalUser.access_start ? originalUser.access_start.substring(0, 10) : "",
        access_end: originalUser.access_end ? originalUser.access_end.substring(0, 10) : ""
      };
      
      const newEdit = { ...currentEdit, [field]: value };
      
      const origRole = originalUser.role;
      const origStart = originalUser.access_start ? originalUser.access_start.substring(0, 10) : "";
      const origEnd = originalUser.access_end ? originalUser.access_end.substring(0, 10) : "";
      
      if (newEdit.role === origRole && newEdit.access_start === origStart && newEdit.access_end === origEnd) {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      }
      
      return { ...prev, [userId]: newEdit };
    });
  };

  const handleCancelEdit = (userId: string) => {
    setEditedUsers(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  const handleSave = async (userId: string) => {
    const edit = editedUsers[userId];
    if (!edit) return;
    
    setActionLoadingId(userId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const requestBody = {
        role: edit.role,
        access_start: edit.access_start ? `${edit.access_start}T00:00:00` : null,
        access_end: edit.access_end ? `${edit.access_end}T23:59:59` : null
      };

      const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update user access settings.");
      }
      setSuccessMsg(`User access settings updated successfully!`);
      
      setEditedUsers(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Load and verify admin access
  useEffect(() => {
    const token = localStorage.getItem("decocrm_auth_token");
    const rawUser = localStorage.getItem("decocrm_user");
    
    if (!token || !rawUser) {
      router.push("/login?redirect=/users");
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser);
      if (parsedUser.role !== 'Admin') {
        router.push("/dashboard");
        return;
      }
      setCurrentAdmin(parsedUser);
      fetchUsers();
    } catch (e) {
      console.error(e);
      router.push("/login");
    }
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("decocrm_auth_token");
        localStorage.removeItem("decocrm_user");
        router.push("/login?redirect=/users");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load user directories.");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to retrieve users list.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoadingId(userId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/approve`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to approve user.");
      }
      setSuccessMsg("User account approved successfully!");
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoadingId(userId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update user role.");
      }
      setSuccessMsg(`User role updated to ${newRole}!`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user account? This cannot be undone.")) {
      return;
    }
    setActionLoadingId(userId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete user account.");
      }
      setSuccessMsg("User account deleted successfully.");
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.phone && user.phone.includes(searchQuery))
  );

  const pendingUsers = filteredUsers.filter(u => !u.is_approved);
  const activeUsers = filteredUsers.filter(u => u.is_approved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 py-8 px-4 sm:px-6 lg:px-8">
      <SpaceLoader loading={loading} text="Loading users directory..." />
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <a 
                href="/dashboard"
                className="flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/60 shadow-sm transition-all group"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              </a>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                  <Users className="w-6 h-6 text-amber-600" />
                  Users & Access control
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Review applicant requests, manage employee roles, and control site access.</p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
            />
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Users</p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{users.length}</h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingUsers.length > 0 ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pending Approvals</p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{users.filter(u => !u.is_approved).length}</h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Approved</p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{users.filter(u => u.is_approved).length}</h3>
            </div>
          </div>
        </div>

        <div className="space-y-8">
            
            {/* PENDING APPROVALS SECTION */}
            {pendingUsers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 border-l-4 border-amber-500 pl-3">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Pending Approvals</h2>
                  <span className="bg-amber-100 text-amber-800 font-black text-[10px] px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingUsers.map(u => (
                    <div 
                      key={u.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, a')) return;
                        setSelectedUser(u);
                      }}
                      className="bg-amber-50/20 hover:bg-amber-50/40 rounded-2xl border border-amber-200/40 shadow-sm p-4 flex items-start justify-between gap-4 transition-all duration-200 cursor-pointer"
                    >
                      <div className="space-y-2.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {u.company_logo ? (
                            <img 
                              src={u.company_logo} 
                              alt={u.name} 
                              className="w-8 h-8 rounded-full object-contain border border-slate-200 bg-white shrink-0" 
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-xs flex items-center justify-center shadow-inner uppercase shrink-0">
                              {u.name[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-955 truncate leading-none">{u.name}</h4>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/50 text-[9px] font-black uppercase text-amber-800 tracking-wider mt-1">{u.role}</span>
                          </div>
                        </div>
 
                        <div className="space-y-1 pl-1 text-[11px] font-medium text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] text-slate-400 font-black shrink-0">📞</span>
                              <span>{u.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Requested {new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
 
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoadingId === u.id}
                          className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-sm shadow-amber-500/10 transition-all shrink-0"
                        >
                          {actionLoadingId === u.id ? (
                            <SpaceLoader fullPage={false} size="sm" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                          <span>Approve</span>
                        </button>
                        
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoadingId === u.id}
                          className="flex items-center justify-center gap-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVE APPROVED USERS */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-500 pl-3">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Active Users</h2>
                <span className="bg-blue-50 text-blue-800 font-black text-[10px] px-2 py-0.5 rounded-full">{activeUsers.length}</span>
              </div>

              {activeUsers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center text-slate-400 text-xs font-semibold">
                  No active users match your criteria.
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4">User Details</th>
                          <th className="py-3.5 px-4">Role</th>
                          <th className="py-3.5 px-4">Access Start</th>
                          <th className="py-3.5 px-4">Access End</th>
                          <th className="py-3.5 px-4">Joined Date</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {activeUsers.map(u => (
                          <tr 
                            key={u.id} 
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('select, input, button, a')) return;
                              setSelectedUser(u);
                            }}
                            className="hover:bg-slate-50/45 hover:shadow-sm transition-all cursor-pointer border-b border-slate-100"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {u.company_logo ? (
                                  <img 
                                    src={u.company_logo} 
                                    alt={u.name} 
                                    className="w-7 h-7 rounded-full object-contain border border-slate-200 bg-white shrink-0" 
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[10px] flex items-center justify-center shadow-inner uppercase shrink-0">
                                    {u.name[0]}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 leading-none">{u.name} {currentAdmin && u.id === currentAdmin.id && <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200/40 px-1 py-0.5 rounded ml-1">You</span>}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {currentAdmin && u.id === currentAdmin.id ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-black text-[9px] uppercase tracking-wider">{u.role}</span>
                              ) : (
                                <select
                                  value={editedUsers[u.id]?.role ?? u.role}
                                  onChange={(e) => handleFieldChange(u.id, 'role', e.target.value)}
                                  disabled={actionLoadingId === u.id}
                                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all outline-none"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Designer">Designer</option>
                                  <option value="Sales">Sales</option>
                                </select>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {currentAdmin && u.id === currentAdmin.id ? (
                                <span className="text-slate-400 text-[11px] font-bold italic">Lifetime</span>
                              ) : (
                                <input
                                  type="date"
                                  value={editedUsers[u.id]?.access_start ?? (u.access_start ? u.access_start.substring(0, 10) : "")}
                                  onChange={(e) => handleFieldChange(u.id, 'access_start', e.target.value)}
                                  disabled={actionLoadingId === u.id}
                                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all outline-none"
                                />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {currentAdmin && u.id === currentAdmin.id ? (
                                <span className="text-slate-400 text-[11px] font-bold italic">Lifetime</span>
                              ) : (
                                <input
                                  type="date"
                                  value={editedUsers[u.id]?.access_end ?? (u.access_end ? u.access_end.substring(0, 10) : "")}
                                  onChange={(e) => handleFieldChange(u.id, 'access_end', e.target.value)}
                                  disabled={actionLoadingId === u.id}
                                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all outline-none"
                                />
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {editedUsers[u.id] ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSave(u.id)}
                                    disabled={actionLoadingId === u.id}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                    title="Save changes"
                                  >
                                    {actionLoadingId === u.id ? (
                                      <SpaceLoader fullPage={false} size="sm" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleCancelEdit(u.id)}
                                    disabled={actionLoadingId === u.id}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                    title="Cancel changes"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                currentAdmin && u.id !== currentAdmin.id && (
                                  <button
                                    onClick={() => handleDelete(u.id)}
                                    disabled={actionLoadingId === u.id}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    title="Delete user account"
                                  >
                                    {actionLoadingId === u.id ? (
                                      <SpaceLoader fullPage={false} size="sm" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
      </div>

      {/* DETAILED USER EDITOR MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Overlay with smooth backdrop blur */}
          <div 
            onClick={() => { if (!modalLoading) setSelectedUser(null); }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
          />
          
          {/* Modal Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 w-full max-w-2xl relative z-10 animate-scale-up my-auto max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { if (!modalLoading) setSelectedUser(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                Edit User Settings
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Modify profile information, system role, custom branding, and default proposal terms.</p>
            </div>

            {modalError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleModalSave} className="space-y-5">
              
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px]">👤</span>
                    <input 
                      type="text" 
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="User's name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="e.g. user@spaceio.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px]">📞</span>
                    <input 
                      type="text" 
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* System Role */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Role</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px]">🛡️</span>
                    {currentAdmin && selectedUser.id === currentAdmin.id ? (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-500 flex items-center justify-between">
                        <span>{editRole}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Admin (Locked)</span>
                      </div>
                    ) : (
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Designer">Designer</option>
                        <option value="Sales">Sales</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Access Start Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Access Start Date</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {currentAdmin && selectedUser.id === currentAdmin.id ? (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-500 italic">
                        Lifetime Access
                      </div>
                    ) : (
                      <input 
                        type="date"
                        value={editAccessStart}
                        onChange={(e) => setEditAccessStart(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Access End Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Access End Date</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {currentAdmin && selectedUser.id === currentAdmin.id ? (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-500 italic">
                        Lifetime Access
                      </div>
                    ) : (
                      <input 
                        type="date"
                        value={editAccessEnd}
                        onChange={(e) => setEditAccessEnd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Warnings / Notices for Admin Lockout prevention */}
              {currentAdmin && selectedUser.id === currentAdmin.id && (
                <div className="bg-amber-50 border border-amber-200/50 text-amber-800 rounded-xl p-3 text-[11px] font-semibold flex items-start gap-2">
                  <span className="shrink-0">ℹ️</span>
                  <span>You are editing your own administrator profile. Changes to your own role and access validity dates are disabled to prevent lockout.</span>
                </div>
              )}

              {/* Company Logo Uploader */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company / Studio Logo</label>
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex gap-4 items-center">
                  {editCompanyLogo ? (
                    <img 
                      src={editCompanyLogo} 
                      alt="Logo Preview" 
                      className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-[9px] text-slate-400 font-extrabold uppercase leading-none">
                      <span>No</span>
                      <span className="mt-0.5">Logo</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input 
                      type="text" 
                      value={editCompanyLogo}
                      onChange={(e) => setEditCompanyLogo(e.target.value)}
                      placeholder="Paste image URL (HTTPS) here..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:border-amber-400 transition-all outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3 py-1 rounded-lg text-[10px] cursor-pointer shadow-sm transition-all">
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="hidden" 
                        />
                      </label>
                      {editCompanyLogo && (
                        <button
                          type="button"
                          onClick={() => setEditCompanyLogo("")}
                          className="text-[10px] font-black text-rose-600 hover:text-rose-800 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* General Terms & Conditions */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Default General Terms & Conditions (For PDF proposals)</label>
                <textarea 
                  rows={4}
                  value={editGeneralTerms}
                  onChange={(e) => setEditGeneralTerms(e.target.value)}
                  placeholder="Enter dynamic terms to display by default on proposal footer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-amber-400 transition-all outline-none resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-6 py-2 rounded-xl text-xs shadow-sm shadow-amber-500/10 transition-all flex items-center gap-2"
                  disabled={modalLoading}
                >
                  {modalLoading && <SpaceLoader fullPage={false} size="sm" />}
                  <span>Save Changes</span>
                </button>
              </div>

            </form>

            {/* SUBSCRIPTION HISTORY SECTION */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 mb-3">
                <span>💳</span>
                Subscription Payment History
              </h4>
              
              {subsLoading ? (
                <div className="flex items-center justify-center py-6 text-slate-400 text-xs font-semibold gap-2">
                  <SpaceLoader fullPage={false} size="sm" text="Loading payment history..." />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  No subscription payment records found for this user.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Payment ID</th>
                          <th className="py-2.5 px-3">Plan</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Access Period</th>
                          <th className="py-2.5 px-3">Paid On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                        {subscriptions.map((sub, index) => {
                          const paidOn = new Date(sub.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          
                          const accessStart = new Date(sub.access_start).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          });
                          
                          const accessEnd = new Date(sub.access_end).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });

                          const isLatest = index === 0;

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">
                                {sub.razorpay_payment_id ? (
                                  <span title={sub.razorpay_payment_id}>
                                    {sub.razorpay_payment_id.substring(0, 12)}...
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  {sub.plan === "yearly" ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold text-[9px] uppercase tracking-wider">
                                      Yearly
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-800 font-extrabold text-[9px] uppercase tracking-wider">
                                      Monthly
                                    </span>
                                  )}
                                  {isLatest && (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/50 text-amber-800 font-black text-[9px] uppercase tracking-wider">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-900 font-bold">
                                ₹{sub.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {accessStart} – {accessEnd}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 font-medium">
                                {paidOn}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
