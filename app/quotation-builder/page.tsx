"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  PlusCircle, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  CheckCircle,
  Layers,
  FileText,
  User,
  LogOut,
  MapPin,
  Loader2,
  Briefcase,
  ArrowLeft,
  Search,
  X,
  Lock,
  Upload,
  Phone,
  Mail,
  Users
} from 'lucide-react';
import SpaceLoader from '../components/SpaceLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("decocrm_auth_token");
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// --- Types ---
interface CatalogItem {
  id: string;
  category_id: string;
  category_name?: string;
  subcategory: string;
  name: string;
  pricing_type: string;
  brand: string;
  base_rate: number;
  labor_cost: number;
  material?: string;
  dimensions?: string;
}

interface Room {
  id: string;
  name: string;
}

interface SelectedItem {
  uid: string;
  room_id: string;
  category_id: string;
  item_id: string;
  qty: number;
  margin_percent: number;
  gst_percent: number;
  name: string;
  brand: string;
  pricing_type: string;
  base_rate: number;
  labor_cost: number;
  final_price: number;
  total_amount: number;
  remark?: string;
  length?: number;
  breadth?: number;
  height?: number;
}

interface ProjectOption {
  id: string;
  name: string;
  client_id?: string;
  client_name: string;
  site_address: string;
  budget: number;
}

interface LocalClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface LocalProject {
  id: string;
  client_id: string;
  name: string;
  site_address: string;
  budget: number;
  status: string;
}

interface LocalQuote {
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  version: number;
  grand_total: number;
  status: string;
  created_at: string;
}

interface LocalDashboardData {
  clients: LocalClient[];
  projects: LocalProject[];
  quotes: LocalQuote[];
}

const LOCAL_DASHBOARD_DATA_KEY = "decocrm_local_dashboard_data";

const readLocalDashboardData = (): LocalDashboardData => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { clients: [], projects: [], quotes: [] };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DASHBOARD_DATA_KEY);
    if (!raw) return { clients: [], projects: [], quotes: [] };
    const parsed = JSON.parse(raw);
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    };
  } catch {
    return { clients: [], projects: [], quotes: [] };
  }
};

const upsertById = <T extends { id: string }>(items: T[], item: T) => [
  item,
  ...items.filter((existing) => existing.id !== item.id),
];

const formatNumericValue = (val: any) => {
  if (val === undefined || val === null || val === "") return "";
  const num = Number(val);
  if (isNaN(num) || num === 0) return "";
  return num;
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

export default function QuotationBuilder() {
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
      router.push("/login?redirect=/quotation-builder");
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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null);
  const [savedStateKey, setSavedStateKey] = useState<string>("");
  const [quotationVersion, setQuotationVersion] = useState<number | null>(null);
  const [quotationDate, setQuotationDate] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    clientName?: boolean;
    clientPhone?: boolean;
    projectName?: boolean;
  }>({});
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToastMsg = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ message, type });
  };

  const validateStep1 = (): boolean => {
    const errors: { clientName?: boolean; clientPhone?: boolean; projectName?: boolean } = {};
    let isValid = true;
    
    if (!clientName.trim()) {
      errors.clientName = true;
      isValid = false;
    }
    if (!clientPhone.trim()) {
      errors.clientPhone = true;
      isValid = false;
    }
    if (!projectName.trim()) {
      errors.projectName = true;
      isValid = false;
    }

    setValidationErrors(errors);

    if (!isValid) {
      const missingFields = [];
      if (errors.clientName) missingFields.push("Client Name");
      if (errors.clientPhone) missingFields.push("Phone");
      if (errors.projectName) missingFields.push("Project Name");
      
      const errorMsg = `Required field(s) missing: ${missingFields.join(", ")}. Please fill them to proceed.`;
      setValidationError(errorMsg);
      showToastMsg(errorMsg, 'warning');
    } else {
      setValidationError("");
    }

    return isValid;
  };
  
  // STEP 1: Project & Client details
  const [selectedProjectId, setSelectedProjectId] = useState<string>("new");
  const [selectedClientId, setSelectedClientId] = useState<string>("new");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [projectBudget, setProjectBudget] = useState(0);

  const [existingProjects, setExistingProjects] = useState<ProjectOption[]>([]);
  const [existingClients, setExistingClients] = useState<LocalClient[]>([]);

  const handleNewProjectSelect = () => {
    setSelectedProjectId("new");
    setSelectedClientId("new");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setProjectName("");
    setSiteAddress("");
    setProjectBudget(0);
    setRooms([]);
    setSelectedItems([]);
    setSavedQuotationId(null);
    setQuotationVersion(null);
    setQuotationDate(null);
    setValidationError("");
    setValidationErrors({});
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    
    // Reset project selection if the currently selected project doesn't belong to this client
    if (clientId !== "new") {
      const selectedProj = existingProjects.find(p => p.id === selectedProjectId);
      if (selectedProj && selectedProj.client_id !== clientId) {
        setSelectedProjectId("new");
        setProjectName("");
        setSiteAddress("");
        setProjectBudget(0);
        setRooms([]);
        setSelectedItems([]);
      }
    }
    
    if (clientId === "new") {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
    } else {
      const found = existingClients.find(c => c.id === clientId);
      if (found) {
        setClientName(found.name);
        setClientPhone(found.phone);
        setClientEmail(found.email);
        setValidationErrors(prev => ({ ...prev, clientName: false, clientPhone: false }));
      }
    }
  };

  // STEP 2: Rooms
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const roomSearchRef = useRef<HTMLDivElement>(null);
  const hasLoadedUrlQuote = useRef(false);

  const predefinedRoomTypes = [
    "Living Room", "Master Bedroom", "Bedroom 2", "Bedroom 3", "Kids Room",
    "Modular Kitchen", "Kitchen", "Dining Room", "Drawing Room", "Study Room",
    "Pooja Room", "Guest Room", "Bathroom", "Master Bathroom", "Balcony",
    "Foyer", "Lobby", "Store Room", "Utility Room", "Servant Room",
    "Home Office", "Entertainment Room", "Walk-in Closet", "Terrace", "Corridor"
  ];

  // Close room dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roomSearchRef.current && !roomSearchRef.current.contains(event.target as Node)) {
        setShowRoomDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // STEP 3: Items
  const [activeRoomId, setActiveRoomId] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [applyGlobalGst, setApplyGlobalGst] = useState(true);
  const [globalGstPercent, setGlobalGstPercent] = useState(18);
  const [discount, setDiscount] = useState(15000);
  const [terms, setTerms] = useState("");

  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [mobileSubView, setMobileSubView] = useState<'items' | 'catalog'>('items');


  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [savingCatalogItem, setSavingCatalogItem] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState({
    subcategory: "",
    name: "",
    pricing_type: "piece",
    brand: "",
    base_rate: "",
    labor_cost: "",
    material: "",
    dimensions: ""
  });

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const getEstimationStateKey = () => {
    return JSON.stringify({
      clientName,
      clientPhone: clientPhone || "",
      clientEmail: clientEmail || "",
      projectName,
      siteAddress: siteAddress || "",
      projectBudget: Number(projectBudget || 0),
      rooms: rooms.map(r => ({ id: r.id, name: r.name })),
      selectedItems: selectedItems.map(item => ({
        room_id: item.room_id,
        category_id: item.category_id,
        item_id: item.item_id,
        qty: Number(item.qty),
        margin_percent: Number(item.margin_percent),
        gst_percent: Number(item.gst_percent),
        remark: item.remark || "",
        length: Number(item.length !== undefined ? item.length : 1),
        breadth: Number(item.breadth !== undefined ? item.breadth : 1),
        height: Number(item.height !== undefined ? item.height : 1)
      })),
      discount: Number(discount || 0),
      terms: terms || "",
      applyGlobalGst,
      globalGstPercent: Number(globalGstPercent || 0)
    });
  };

  const updateSavedStateKey = (roomsVal = rooms, itemsVal = selectedItems, applyGstVal = applyGlobalGst, gstPercentVal = globalGstPercent) => {
    const key = JSON.stringify({
      clientName,
      clientPhone: clientPhone || "",
      clientEmail: clientEmail || "",
      projectName,
      siteAddress: siteAddress || "",
      projectBudget: Number(projectBudget || 0),
      rooms: roomsVal.map(r => ({ id: r.id, name: r.name })),
      selectedItems: itemsVal.map(item => ({
        room_id: item.room_id,
        category_id: item.category_id,
        item_id: item.item_id,
        qty: Number(item.qty),
        margin_percent: Number(item.margin_percent),
        gst_percent: Number(item.gst_percent),
        remark: item.remark || "",
        length: Number(item.length !== undefined ? item.length : 1),
        breadth: Number(item.breadth !== undefined ? item.breadth : 1),
        height: Number(item.height !== undefined ? item.height : 1)
      })),
      discount: Number(discount || 0),
      terms: terms || "",
      applyGlobalGst: applyGstVal,
      globalGstPercent: Number(gstPercentVal || 0)
    });
    setSavedStateKey(key);
  };

  const isSaveDisabled = savedQuotationId ? (savedStateKey === getEstimationStateKey()) : false;

  // Load catalog, categories, clients and projects from API
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch categories first
        const catRes = await fetch(`${API_BASE_URL}/catalog/categories`, { headers: getAuthHeaders() });
        let fetchedCategories = null;
        if (catRes.ok) {
          const categoriesData = await catRes.json();
          if (categoriesData && categoriesData.length > 0) {
            setCategories(categoriesData);
            fetchedCategories = categoriesData;
          }
        }

        // Fetch items
        const itemsRes = await fetch(`${API_BASE_URL}/catalog/items`, { headers: getAuthHeaders() });
        let itemsData = null;
        if (itemsRes.ok) {
          itemsData = await itemsRes.json();
          setCatalog(itemsData);
          
          // Auto-select first fetched category or "Furniture" if available
          if (fetchedCategories && fetchedCategories.length > 0) {
            const furnitureCat = fetchedCategories.find((c: any) => c.name === "Furniture");
            if (furnitureCat) {
              setActiveCategoryId(furnitureCat.id);
            } else {
              setActiveCategoryId(fetchedCategories[0].id);
            }
          }
        }

        // Fetch clients and projects
        const pRes = await fetch(`${API_BASE_URL}/projects`, { headers: getAuthHeaders() });
        const cRes = await fetch(`${API_BASE_URL}/clients`, { headers: getAuthHeaders() });
        if (pRes.ok && cRes.ok) {
          const pData = await pRes.json();
          const cData = await cRes.json();
          
          setExistingClients(cData);

          const mapped = pData.map((p: any) => ({
            id: p.id,
            name: p.name,
            client_id: p.client_id,
            client_name: cData.find((c: any) => c.id === p.client_id)?.name || "Unknown Client",
            site_address: p.site_address,
            budget: p.budget
          }));
          
          if (mapped.length > 0) {
            setExistingProjects(mapped);
          }
        }
      } catch (err) {
        console.log("API offline. Using static catalog and fallbacks.", err);
        const localData = readLocalDashboardData();
        setExistingClients(localData.clients || []);
        const mapped = (localData.projects || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          client_id: p.client_id,
          client_name: (localData.clients || []).find((c: any) => c.id === p.client_id)?.name || "Unknown Client",
          site_address: p.site_address,
          budget: p.budget
        }));
        setExistingProjects(mapped);
      }
    };
    fetchAllData();
  }, []);

  // Load URL query parameters (e.g. ?edit=xxx) and load quotation
  useEffect(() => {
    const loadQuotationFromUrl = async () => {
      if (hasLoadedUrlQuote.current) return;
      hasLoadedUrlQuote.current = true;
      if (typeof window === "undefined") return;
      const query = new URLSearchParams(window.location.search);
      const editId = query.get('edit');
      
      if (!editId) {
        // Start as new quotation by default
        handleNewProjectSelect();
        return;
      }
      
      setLoading(true);
      try {
        if (editId.startsWith("local_quote_")) {
          const localData = readLocalDashboardData();
          const foundQuote = localData.quotes.find(q => q.id === editId);
          if (foundQuote) {
            setSavedQuotationId(foundQuote.id);
            setQuotationVersion(foundQuote.version);
            setQuotationDate(new Date(foundQuote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
            setDiscount(15000);
            setTerms("");
            
            let localClientName = "";
            let localClientPhone = "";
            let localClientEmail = "";
            let localProjectName = "";
            let localSiteAddress = "";
            let localProjectBudget = 0;

            const foundProj = localData.projects.find(p => p.id === foundQuote.project_id);
            if (foundProj) {
              setSelectedProjectId(foundProj.id);
              setProjectName(foundProj.name);
              setSiteAddress(foundProj.site_address);
              setProjectBudget(foundProj.budget);
              
              localProjectName = foundProj.name;
              localSiteAddress = foundProj.site_address;
              localProjectBudget = foundProj.budget;

              const foundClient = localData.clients.find(c => c.id === foundProj.client_id);
              if (foundClient) {
                setClientName(foundClient.name);
                setClientPhone(foundClient.phone);
                setClientEmail(foundClient.email);
                
                localClientName = foundClient.name;
                localClientPhone = foundClient.phone;
                localClientEmail = foundClient.email;
              }
            }
            
            const initialKey = JSON.stringify({
              clientName: localClientName,
              clientPhone: localClientPhone,
              clientEmail: localClientEmail,
              projectName: localProjectName,
              siteAddress: localSiteAddress,
              projectBudget: Number(localProjectBudget),
              rooms: [],
              selectedItems: [],
              discount: 15000,
              terms: ""
            });
            setSavedStateKey(initialKey);
          }
          setLoading(false);
          return;
        }

        // Fetch from API
        let loadedClientName = "";
        let loadedClientPhone = "";
        let loadedClientEmail = "";
        let loadedProjectName = "";
        let loadedSiteAddress = "";
        let loadedProjectBudget = 0;
        let loadedRooms: any[] = [];
        let loadedItems: any[] = [];

        const qRes = await fetch(`${API_BASE_URL}/quotations/${editId}`, { headers: getAuthHeaders() });
        if (qRes.ok) {
          const qData = await qRes.json();
          setSavedQuotationId(qData.id);
          setQuotationVersion(qData.version);
          setQuotationDate(new Date(qData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
          setDiscount(qData.discount_amount);
          setTerms(qData.terms_conditions || "");
          
          // Fetch project details
          const projRes = await fetch(`${API_BASE_URL}/projects/${qData.project_id}`, { headers: getAuthHeaders() });
          if (projRes.ok) {
            const projData = await projRes.json();
            setSelectedProjectId(projData.id);
            setProjectName(projData.name);
            setSiteAddress(projData.site_address);
            setProjectBudget(projData.budget);
            
            loadedProjectName = projData.name;
            loadedSiteAddress = projData.site_address;
            loadedProjectBudget = projData.budget;
            
            // Fetch client details
            const clientRes = await fetch(`${API_BASE_URL}/clients/${projData.client_id}`, { headers: getAuthHeaders() });
            if (clientRes.ok) {
              const clientData = await clientRes.json();
              setClientName(clientData.name);
              setClientPhone(clientData.phone);
              setClientEmail(clientData.email);
              
              loadedClientName = clientData.name;
              loadedClientPhone = clientData.phone;
              loadedClientEmail = clientData.email;
            }
          }
          
          // Set rooms
          const roomsRes = await fetch(`${API_BASE_URL}/projects/${qData.project_id}/rooms`, { headers: getAuthHeaders() });
          if (roomsRes.ok) {
            const roomsData = await roomsRes.json();
            const mappedRooms = roomsData.map((r: any) => ({ id: r.id, name: r.room_name }));
            setRooms(mappedRooms);
            loadedRooms = mappedRooms;
            if (mappedRooms.length > 0) {
              setActiveRoomId(mappedRooms[0].id);
            }
          }
          
          // Set items
          if (qData.items && qData.items.length > 0) {
            // Find items to extract details
            let fetchedCatalog: CatalogItem[] = [];
            const itemsRes = await fetch(`${API_BASE_URL}/catalog/items`, { headers: getAuthHeaders() });
            if (itemsRes.ok) {
              fetchedCatalog = await itemsRes.json();
            }

            const mappedItems = qData.items.map((item: any) => {
              const catalogMatch = fetchedCatalog.find(c => c.id === item.item_id);
              return {
                uid: `sel_edit_${item.id}`,
                room_id: item.room_id,
                category_id: item.category_id,
                item_id: item.item_id,
                qty: item.qty,
                margin_percent: item.snapshot_margin,
                gst_percent: item.snapshot_gst_percent,
                name: item.item_name || "Unknown Item",
                brand: item.item_brand || "Generic",
                pricing_type: item.pricing_type || catalogMatch?.pricing_type || "piece",
                base_rate: item.snapshot_rate,
                labor_cost: item.snapshot_labor_cost,
                length: item.length !== undefined && item.length !== null ? item.length : 1,
                breadth: item.breadth !== undefined && item.breadth !== null ? item.breadth : 1,
                height: item.height !== undefined && item.height !== null ? item.height : 1,
                final_price: item.final_price,
                total_amount: item.total_amount,
                remark: item.remark || ""
              };
            });
            setSelectedItems(mappedItems);
            loadedItems = mappedItems;
            
            // Auto-detect global GST state from loaded items by subtracting item-wise GST sum from total GST
            const itemGstSum = mappedItems.reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0) * ((Number(item.gst_percent) || 0) / 100), 0);
            const globalGstSum = (qData.gst_amount || 0) - itemGstSum;
            const hasGlobalGst = globalGstSum > 0.5;
            const loadedGstPercent = hasGlobalGst ? Math.round((globalGstSum / (qData.subtotal || 1)) * 100) : 18;
            
            setApplyGlobalGst(hasGlobalGst);
            setGlobalGstPercent(loadedGstPercent);
          }

          const itemGstSum = loadedItems.reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0) * ((Number(item.gst_percent) || 0) / 100), 0);
          const globalGstSum = (qData.gst_amount || 0) - itemGstSum;
          const hasGlobalGst = globalGstSum > 0.5;
          const loadedGstPercent = hasGlobalGst ? Math.round((globalGstSum / (qData.subtotal || 1)) * 100) : 18;

          const initialKey = JSON.stringify({
            clientName: loadedClientName,
            clientPhone: loadedClientPhone || "",
            clientEmail: loadedClientEmail || "",
            projectName: loadedProjectName,
            siteAddress: loadedSiteAddress || "",
            projectBudget: Number(loadedProjectBudget),
            rooms: loadedRooms.map(r => ({ id: r.id, name: r.name })),
            selectedItems: loadedItems.map(item => ({
              room_id: item.room_id,
              category_id: item.category_id,
              item_id: item.item_id,
              qty: Number(item.qty),
              margin_percent: Number(item.margin_percent),
              gst_percent: Number(item.gst_percent),
              remark: item.remark || "",
              length: Number(item.length !== undefined && item.length !== null ? item.length : 1),
              breadth: Number(item.breadth !== undefined && item.breadth !== null ? item.breadth : 1),
              height: Number(item.height !== undefined && item.height !== null ? item.height : 1)
            })),
            discount: Number(qData.discount_amount),
            terms: qData.terms_conditions || "",
            applyGlobalGst: hasGlobalGst,
            globalGstPercent: Number(loadedGstPercent || 0)
          });
          setSavedStateKey(initialKey);
        }
      } catch (err) {
        console.error("Failed to load quotation for editing", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (catalog.length > 0 && !hasLoadedUrlQuote.current) {
      loadQuotationFromUrl();
    }
  }, [catalog]);

  const handleProjectSelect = async (id: string) => {
    setSelectedProjectId(id);
    setValidationError("");
    setValidationErrors({});
    const found = existingProjects.find(p => p.id === id);
    if (found) {
      setClientName(found.client_name);
      setProjectName(found.name);
      setSiteAddress(found.site_address);
      setProjectBudget(found.budget);
      
      // Clear existing items when switching project
      setSelectedItems([]);
      
      // Attempt to load client details and rooms if backend is active
      try {
        const pRes = await fetch(`${API_BASE_URL}/projects`, { headers: getAuthHeaders() });
        if (pRes.ok) {
          const pData = await pRes.json();
          const projObj = pData.find((p: any) => p.id === id);
          if (projObj) {
            const cRes = await fetch(`${API_BASE_URL}/clients/${projObj.client_id}`, { headers: getAuthHeaders() });
            if (cRes.ok) {
              const cData = await cRes.json();
              setClientPhone(cData.phone);
              setClientEmail(cData.email);
              setSelectedClientId(cData.id);
            }
          }
        }

        // Fetch rooms for the selected project
        const roomsRes = await fetch(`${API_BASE_URL}/projects/${id}/rooms`, { headers: getAuthHeaders() });
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          if (roomsData && roomsData.length > 0) {
            const mappedRooms = roomsData.map((r: any) => ({ id: r.id, name: r.room_name }));
            setRooms(mappedRooms);
            setActiveRoomId(mappedRooms[0].id);
          } else {
            setRooms([]);
            setActiveRoomId("");
          }
        }
      } catch (err) {
        console.log("Failed to fetch client/rooms details dynamically from API:", err);
        // Fallback to local storage loading
        const localData = readLocalDashboardData();
        const foundProj = localData.projects.find(p => p.id === id);
        if (foundProj) {
          const foundClient = localData.clients.find(c => c.id === foundProj.client_id);
          if (foundClient) {
            setClientPhone(foundClient.phone);
            setClientEmail(foundClient.email);
            setSelectedClientId(foundClient.id);
          }
        }
      }
    }
  };

  const handleAddRoomFromList = async (roomName: string) => {
    if (!roomName.trim()) return;
    // Prevent adding duplicates
    if (rooms.some(r => r.name.toLowerCase() === roomName.trim().toLowerCase())) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ project_id: selectedProjectId, room_name: roomName.trim() })
      });
      if (res.ok) {
        const newRoom = await res.json();
        setRooms([...rooms, { id: newRoom.id, name: newRoom.room_name }]);
        setActiveRoomId(newRoom.id);
      } else {
        // Fallback to local-only
        const newId = `room_${Date.now()}`;
        setRooms([...rooms, { id: newId, name: roomName.trim() }]);
        setActiveRoomId(newId);
      }
    } catch {
      const newId = `room_${Date.now()}`;
      setRooms([...rooms, { id: newId, name: roomName.trim() }]);
      setActiveRoomId(newId);
    }
    setRoomSearchQuery("");
    setShowRoomDropdown(false);
  };

  const calculateTotals = () => {
    let total_excl_gst = 0;
    let total_item_gst = 0;
    let subtotal = 0;
    selectedItems.forEach(item => {
      const base_cost = (Number(item.base_rate) || 0) + (Number(item.labor_cost) || 0);
      const price_after_margin = base_cost * (1 + (Number(item.margin_percent) || 0) / 100);
      const final_unit_price = price_after_margin * (1 + (Number(item.gst_percent) || 0) / 100);
      
      let multiplier = 1;
      if (item.pricing_type === 'sq_ft') {
        const l_val = item.length !== undefined && item.length > 0 ? item.length : 0;
        const h_val = item.height !== undefined && item.height > 0 ? item.height : 0;
        const b_val = item.breadth !== undefined && item.breadth > 0 ? item.breadth : 0;
        const second_dim = h_val > 0 ? h_val : (b_val > 0 ? b_val : 1);
        multiplier = l_val > 0 ? (l_val * second_dim) : 0;
      } else if (item.pricing_type === 'running_ft') {
        multiplier = item.length !== undefined && item.length > 0 ? item.length : 0;
      }
      
      const item_excl_gst = price_after_margin * item.qty * multiplier;
      const item_total = final_unit_price * item.qty * multiplier;
      
      total_excl_gst += item_excl_gst;
      total_item_gst += (item_total - item_excl_gst);
      subtotal += item_total;
    });

    let global_gst_amount = 0;
    if (applyGlobalGst) {
      global_gst_amount = subtotal * (globalGstPercent / 100);
    }

    return {
      total_excl_gst: Math.round(total_excl_gst),
      total_item_gst: Math.round(total_item_gst),
      subtotal: Math.round(subtotal),
      gst_amount: Math.round(global_gst_amount),
      grand_total: Math.round(Math.max(0, subtotal + global_gst_amount - discount))
    };
  };

  const totals = calculateTotals();

  const saveQuotationToLocalDashboard = (): string | undefined => {
    if (typeof window === "undefined" || !window.localStorage) return;

    const now = new Date().toISOString();
    const safeTime = Date.now();
    const localData = readLocalDashboardData();
    const isNewProject = selectedProjectId === "new";
    const projectOption = existingProjects.find((p) => p.id === selectedProjectId);

    const clientId = selectedClientId !== "new" ? selectedClientId : (isNewProject ? `local_client_${safeTime}` : `local_client_${selectedProjectId}`);
    const projectId = isNewProject ? `local_project_${safeTime}` : selectedProjectId;
    const resolvedClientName = clientName.trim() || projectOption?.client_name || "";
    const resolvedProjectName = projectName.trim() || projectOption?.name || "";
    const resolvedSiteAddress = siteAddress.trim() || projectOption?.site_address || "";
    const resolvedBudget = Number(projectBudget) || projectOption?.budget || totals.grand_total || 0;

    const nextClient: LocalClient = {
      id: clientId,
      name: resolvedClientName,
      phone: clientPhone.trim() || "",
      email: clientEmail.trim() || "",
      address: resolvedSiteAddress,
    };

    const nextProject: LocalProject = {
      id: projectId,
      client_id: clientId,
      name: resolvedProjectName,
      site_address: resolvedSiteAddress,
      budget: resolvedBudget,
      status: "Draft",
    };

    const existingProjectQuotes = localData.quotes.filter((quote) => quote.project_id === projectId);
    const nextQuote: LocalQuote = {
      id: `local_quote_${safeTime}`,
      project_id: projectId,
      project_name: resolvedProjectName,
      client_name: resolvedClientName,
      version: existingProjectQuotes.length + 1,
      grand_total: totals.grand_total,
      status: "draft",
      created_at: now,
    };

    window.localStorage.setItem(
      LOCAL_DASHBOARD_DATA_KEY,
      JSON.stringify({
        clients: upsertById(localData.clients, nextClient),
        projects: upsertById(localData.projects, nextProject),
        quotes: upsertById(localData.quotes, nextQuote),
      })
    );
    setSavedQuotationId(nextQuote.id);
    setQuotationVersion(nextQuote.version);
    setQuotationDate(new Date(nextQuote.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    updateSavedStateKey(rooms, selectedItems);
    return nextQuote.id;
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ project_id: selectedProjectId, room_name: newRoomName.trim() })
      });
      if (res.ok) {
        const newRoom = await res.json();
        setRooms([...rooms, { id: newRoom.id, name: newRoom.room_name }]);
        setActiveRoomId(newRoom.id);
      } else {
        const newId = `room_${Date.now()}`;
        setRooms([...rooms, { id: newId, name: newRoomName }]);
        setActiveRoomId(newId);
      }
    } catch {
      const newId = `room_${Date.now()}`;
      setRooms([...rooms, { id: newId, name: newRoomName }]);
      setActiveRoomId(newId);
    }
    setNewRoomName("");
  };

  const handleDeleteRoom = (roomId: string) => {
    if (rooms.length <= 1) return;
    const remaining = rooms.filter(r => r.id !== roomId);
    setRooms(remaining);
    setSelectedItems(selectedItems.filter(item => item.room_id !== roomId));
    if (activeRoomId === roomId && remaining.length > 0) {
      setActiveRoomId(remaining[0].id);
    }
  };

  const handleAddCatalogItem = (catalogItem: CatalogItem) => {
    if (!activeRoomId) return;

    const base_cost = catalogItem.base_rate + catalogItem.labor_cost;
    const margin = 15;
    const gst = 18;
    const price_after_margin = base_cost * (1 + margin / 100);
    const final_unit_price = price_after_margin * (1 + gst / 100);

    const length = 1;
    const breadth = 1;
    const height = 1;
    const qty = 1;

    let initialTotal = final_unit_price * qty;
    if (catalogItem.pricing_type === 'sq_ft') {
      const second_dim = height > 0 ? height : (breadth > 0 ? breadth : 1);
      const area = length * second_dim;
      initialTotal = final_unit_price * qty * area;
    } else if (catalogItem.pricing_type === 'running_ft') {
      initialTotal = final_unit_price * qty * length;
    }

    const newItem: SelectedItem = {
      uid: `sel_${Date.now()}`,
      room_id: activeRoomId,
      category_id: catalogItem.category_id,
      item_id: catalogItem.id,
      qty: qty,
      margin_percent: margin,
      gst_percent: gst,
      name: catalogItem.name,
      brand: catalogItem.brand,
      pricing_type: catalogItem.pricing_type,
      base_rate: catalogItem.base_rate,
      labor_cost: catalogItem.labor_cost,
      length: length,
      breadth: breadth,
      height: height,
      final_price: Math.round(final_unit_price * 100) / 100,
      total_amount: Math.round(initialTotal * 100) / 100,
      remark: ""
    };
    setSelectedItems([...selectedItems, newItem]);
    setMobileSubView('items');
  };

  const handleCreateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategoryId || !newCatalogItem.name.trim()) return;

    setSavingCatalogItem(true);

    const itemPayload = {
      category_id: activeCategoryId,
      subcategory: newCatalogItem.subcategory.trim() || "Custom",
      name: newCatalogItem.name.trim(),
      pricing_type: newCatalogItem.pricing_type,
      brand: newCatalogItem.brand.trim() || "Custom",
      base_rate: Number(newCatalogItem.base_rate) || 0,
      labor_cost: Number(newCatalogItem.labor_cost) || 0,
      material: newCatalogItem.material.trim() || null,
      dimensions: newCatalogItem.dimensions.trim() || null
    };

    try {
      const res = await fetch(`${API_BASE_URL}/catalog/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(itemPayload)
      });

      if (!res.ok) {
        throw new Error("Failed to save catalog item");
      }

      const savedItem = await res.json();
      setCatalog((prev) => [...prev, savedItem]);
      handleAddCatalogItem(savedItem);
    } catch (error) {
      console.log("Saving catalog item locally for this session.", error);
      const localItem: CatalogItem = {
        id: `local_item_${Date.now()}`,
        category_id: activeCategoryId,
        subcategory: itemPayload.subcategory,
        name: itemPayload.name,
        pricing_type: itemPayload.pricing_type,
        brand: itemPayload.brand,
        base_rate: itemPayload.base_rate,
        labor_cost: itemPayload.labor_cost,
        material: itemPayload.material || undefined
      };
      setCatalog((prev) => [...prev, localItem]);
      handleAddCatalogItem(localItem);
    } finally {
      setSavingCatalogItem(false);
      setShowNewItemForm(false);
      setNewCatalogItem({
        subcategory: "",
        name: "",
        pricing_type: "piece",
        brand: "",
        base_rate: "",
        labor_cost: "",
        material: "",
        dimensions: ""
      });
    }
  };

  const handleDeleteItem = (uid: string) => {
    setSelectedItems(selectedItems.filter(item => item.uid !== uid));
  };

  const handleUpdateItemValue = (
    uid: string, 
    field: 'qty' | 'margin_percent' | 'gst_percent' | 'base_rate' | 'labor_cost' | 'length' | 'breadth' | 'height', 
    val: number
  ) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.uid === uid) {
        const updated = { ...item, [field]: val };
        const base_cost = updated.base_rate + updated.labor_cost;
        const price_after_margin = base_cost * (1 + updated.margin_percent / 100);
        
        const final_unit_price = price_after_margin * (1 + updated.gst_percent / 100);
        updated.final_price = Math.round(final_unit_price * 100) / 100;
        
        let multiplier = 1;
        if (updated.pricing_type === 'sq_ft') {
          const l_val = updated.length !== undefined && updated.length > 0 ? updated.length : 0;
          const h_val = updated.height !== undefined && updated.height > 0 ? updated.height : 0;
          const b_val = updated.breadth !== undefined && updated.breadth > 0 ? updated.breadth : 0;
          
          const second_dim = h_val > 0 ? h_val : (b_val > 0 ? b_val : 1);
          const area = l_val > 0 ? (l_val * second_dim) : 0;
          updated.total_amount = Math.round(final_unit_price * updated.qty * area * 100) / 100;
        } else if (updated.pricing_type === 'running_ft') {
          const l_val = updated.length !== undefined && updated.length > 0 ? updated.length : 0;
          updated.total_amount = Math.round(final_unit_price * updated.qty * l_val * 100) / 100;
        } else {
          updated.total_amount = Math.round(final_unit_price * updated.qty * 100) / 100;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleUpdateItemPricingType = (uid: string, pricingType: string) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.uid === uid) {
        const updated = { ...item, pricing_type: pricingType };
        const base_cost = updated.base_rate + updated.labor_cost;
        const price_after_margin = base_cost * (1 + updated.margin_percent / 100);
        
        const final_unit_price = price_after_margin * (1 + updated.gst_percent / 100);
        updated.final_price = Math.round(final_unit_price * 100) / 100;
        
        if (updated.pricing_type === 'sq_ft') {
          const l_val = updated.length !== undefined && updated.length > 0 ? updated.length : 1;
          const h_val = updated.height !== undefined && updated.height > 0 ? updated.height : 1;
          const b_val = updated.breadth !== undefined && updated.breadth > 0 ? updated.breadth : 1;
          
          const second_dim = h_val > 0 ? h_val : (b_val > 0 ? b_val : 1);
          const area = l_val * second_dim;
          updated.total_amount = Math.round(final_unit_price * updated.qty * area * 100) / 100;
        } else if (updated.pricing_type === 'running_ft') {
          const l_val = updated.length !== undefined && updated.length > 0 ? updated.length : 1;
          updated.total_amount = Math.round(final_unit_price * updated.qty * l_val * 100) / 100;
        } else {
          updated.total_amount = Math.round(final_unit_price * updated.qty * 100) / 100;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleUpdateItemRemark = (uid: string, remark: string) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.uid === uid) {
        return { ...item, remark };
      }
      return item;
    }));
  };

  const handleUpdateGlobalGstPercent = (percent: number) => {
    setGlobalGstPercent(percent);
  };

  const handleSaveQuotation = async (): Promise<string | null> => {
    if (!validateStep1()) return null;
    setLoading(true);
    setSuccessMsg("");
    
    try {
      let finalProjectId = selectedProjectId;
      let roomMapping: { [key: string]: string } = {};

      // 1. If it's a new project or local-only project draft, create client and project in the DB first
      const isLocalProject = selectedProjectId === "new" || selectedProjectId.startsWith("local_project_");
      
      if (isLocalProject) {
        // A. Create Client
        let finalClientId = selectedClientId;
        if (selectedClientId === "new" || selectedClientId.startsWith("local_client_")) {
          const clientPayload = {
            name: clientName || "",
            phone: clientPhone || "",
            email: clientEmail || "",
            address: siteAddress || ""
          };
          const clientRes = await fetch(`${API_BASE_URL}/clients`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(clientPayload)
          });
          if (!clientRes.ok) throw new Error("Failed to create client in database.");
          const newClient = await clientRes.json();
          finalClientId = newClient.id;
          setSelectedClientId(newClient.id);
        }

        // B. Create Project
        const projectPayload = {
          client_id: finalClientId,
          name: projectName || "",
          site_address: siteAddress || "",
          budget: Number(projectBudget) || 0,
          status: "Draft"
        };
        const projectRes = await fetch(`${API_BASE_URL}/projects`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(projectPayload)
        });
        if (!projectRes.ok) throw new Error("Failed to create project in database.");
        const newProject = await projectRes.json();
        finalProjectId = newProject.id;
      }

      // C. Create any rooms that are temporary/local-only, or map existing database rooms
      for (const room of rooms) {
        if (room.id.startsWith("room_")) {
          const roomPayload = {
            project_id: finalProjectId,
            room_name: room.name
          };
          const roomRes = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(roomPayload)
          });
          if (roomRes.ok) {
            const newRoom = await roomRes.json();
            roomMapping[room.id] = newRoom.id;
          } else {
            roomMapping[room.id] = room.id;
          }
        } else {
          roomMapping[room.id] = room.id;
        }
      }

      // 2. Prepare quotation payload with mapped room IDs and valid project ID
      const payload = {
        project_id: finalProjectId,
        discount_amount: discount,
        terms_conditions: terms,
        apply_global_gst: applyGlobalGst,
        global_gst_percent: globalGstPercent,
        items: selectedItems.map(item => ({
          room_id: roomMapping[item.room_id] || item.room_id,
          category_id: item.category_id,
          item_id: item.item_id,
          qty: item.qty,
          margin_percent: item.margin_percent,
          gst_percent: item.gst_percent,
          remark: item.remark || "",
          length: item.length !== undefined ? item.length : 1,
          breadth: item.breadth !== undefined ? item.breadth : 1,
          height: item.height !== undefined ? item.height : 1,
          pricing_type: item.pricing_type,
          base_rate: Number(item.base_rate),
          labor_cost: Number(item.labor_cost)
        }))
      };

      // 3. Save Quotation
      const response = await fetch(`${API_BASE_URL}/quotations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedQuotationId(data.id);
        setQuotationVersion(data.version);
        setQuotationDate(new Date(data.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
        setSuccessMsg(`Quotation Revision V${data.version} Saved Successfully!`);
        
        // Sync local room IDs and item room IDs with the database UUIDs
        const updatedRooms = rooms.map(r => ({
          id: roomMapping[r.id] || r.id,
          name: r.name
        }));
        setRooms(updatedRooms);
        
        if (activeRoomId && roomMapping[activeRoomId]) {
          setActiveRoomId(roomMapping[activeRoomId]);
        }

        const updatedItems = selectedItems.map(item => ({
          ...item,
          room_id: roomMapping[item.room_id] || item.room_id
        }));
        setSelectedItems(updatedItems);
        updateSavedStateKey(updatedRooms, updatedItems);

        // If we created a new/local project, refresh projects list to show it in the list
        if (isLocalProject) {
          const pRes = await fetch(`${API_BASE_URL}/projects`, { headers: getAuthHeaders() });
          const cRes = await fetch(`${API_BASE_URL}/clients`, { headers: getAuthHeaders() });
          if (pRes.ok && cRes.ok) {
            const pData = await pRes.json();
            const cData = await cRes.json();
            const mapped = pData.map((p: any) => ({
              id: p.id,
              name: p.name,
              client_name: cData.find((c: any) => c.id === p.client_id)?.name || "Unknown Client",
              site_address: p.site_address,
              budget: p.budget
            }));
            setExistingProjects(mapped);
          }
          setSelectedProjectId(finalProjectId);
        }
        return data.id;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Save failed:", errorData);
        const localId = saveQuotationToLocalDashboard();
        setSuccessMsg("Quotation saved locally and added to dashboard.");
        return localId || null;
      }
    } catch (error) {
      console.error("Save error:", error);
      const localId = saveQuotationToLocalDashboard();
      setSuccessMsg("Quotation saved locally and added to dashboard.");
      return localId || null;
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  const filteredCatalog = catalog.filter(item => {
    const matchesCategory = item.category_id === activeCategoryId;
    if (!matchesCategory) return false;
    if (!catalogSearchQuery.trim()) return true;
    const query = catalogSearchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(query)) ||
      (item.brand && item.brand.toLowerCase().includes(query))
    );
  });
  const activeRoomItems = selectedItems.filter(item => item.room_id === activeRoomId);
  const goToStep = (nextStep: number) => {
    setStep(Math.min(4, Math.max(1, nextStep)) as 1 | 2 | 3 | 4);
  };

  const stepLabels = [
    { num: 1, label: "Project", icon: <Briefcase className="w-3.5 h-3.5" /> },
    { num: 2, label: "Rooms", icon: <Layers className="w-3.5 h-3.5" /> },
    { num: 3, label: "Items", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { num: 4, label: "Quotation", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  if (isAuthenticated === null) {
    return <SpaceLoader loading={true} text="Verifying session..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <SpaceLoader loading={loading && rooms.length === 0} text="Loading quotation details..." />
      
      {/* NAV BAR */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/60 px-4 py-4 md:px-10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {user?.company_logo ? (
              <img 
                src={user.company_logo} 
                alt="Logo" 
                className="w-8 h-8 object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[13px] flex items-center justify-center shadow-sm uppercase shrink-0">
                {(user?.name || "D")[0]}
              </div>
            )}
            <div className="border-l border-slate-200 pl-3">
              <span className="text-base font-black text-slate-900 tracking-tight leading-none block">{user?.name || "Decoflare"}</span>
              <span className="text-[9px] text-amber-700 font-bold uppercase tracking-wider mt-0.5 block">Quotation Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/dashboard" 
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-stone-900 px-2.5 py-1.5 sm:px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 shadow-sm transition-all group focus:outline-none"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back<span className="hidden sm:inline"> to Dashboard</span></span>
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

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8">

        {/* COMPACT STICKY CONTROL BAR WITH INTEGRATED TIMELINE */}
        <div className="mb-8 max-w-2xl mx-auto bg-white/80 backdrop-blur-md border border-slate-200/60 p-2.5 rounded-full shadow-sm flex items-center justify-between gap-4 animate-fade-in">
          {/* Back Button Container */}
          <div className="w-24 shrink-0 flex justify-start">
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
              className={`w-full flex items-center justify-center gap-1 px-3 h-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-amber-800 hover:border-amber-200 hover:bg-slate-50/50 shadow-sm transition-all group ${
                step > 1 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              title="Go back a step"
              aria-label="Go back a step"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-bold text-[11px]">Back</span>
            </button>
          </div>

          {/* Small Timeline */}
          <div className="flex-1 relative px-3.5">
            {/* Background line */}
            <div className="absolute left-7 right-7 top-3.5 h-0.5 bg-slate-200/80 z-0" />
            {/* Active line */}
            <div 
              className="absolute left-7 top-3.5 h-0.5 bg-gradient-to-r from-amber-600 to-amber-500 z-0 transition-all duration-500 ease-out"
              style={{ width: step === 1 ? '0px' : `calc((100% - 3.5rem) * ${(step - 1) / 3})` }}
            />

            <div className="flex justify-between items-center relative z-10">
              {stepLabels.map((s) => {
                let isAccessible = false;
                if (s.num === 1) {
                  isAccessible = true;
                } else if (s.num === 2) {
                  isAccessible = clientName.trim() !== "" && clientPhone.trim() !== "" && projectName.trim() !== "";
                } else if (s.num === 3) {
                  isAccessible = clientName.trim() !== "" && clientPhone.trim() !== "" && projectName.trim() !== "" && rooms.length > 0;
                } else if (s.num === 4) {
                  isAccessible = clientName.trim() !== "" && clientPhone.trim() !== "" && projectName.trim() !== "" && rooms.length > 0 && selectedItems.length > 0;
                }

                return (
                  <div 
                    key={s.num}
                    onClick={() => {
                      if (s.num > 1) {
                        if (!validateStep1()) return;
                        if (s.num === 3 && rooms.length === 0) {
                          showToastMsg("Please allocate at least one room to proceed to items mapping.", "warning");
                          return;
                        }
                        if (s.num === 4 && (rooms.length === 0 || selectedItems.length === 0)) {
                          showToastMsg("Please add items to your quotation to review the estimate.", "warning");
                          return;
                        }
                      }
                      setStep(s.num as 1 | 2 | 3 | 4);
                    }}
                    className={`flex flex-col items-center cursor-pointer transition-opacity ${
                      isAccessible ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all duration-300 ${
                      s.num <= step 
                        ? 'bg-gradient-to-br from-stone-950 to-stone-900 border-stone-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-400'
                    } ${s.num === step ? 'ring-2 ring-amber-500/20' : ''}`}>
                      {s.icon}
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider mt-1 transition-colors hidden sm:block ${
                      s.num <= step ? 'text-amber-700 font-black' : 'text-slate-400'
                    }`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Button Container */}
          <div className="w-24 shrink-0 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  if (validateStep1()) setStep(2);
                } else if (step === 2) {
                  if (validateStep1()) setStep(3);
                } else if (step === 3) {
                  if (validateStep1()) setStep(4);
                }
              }}
              disabled={
                (step === 2 && rooms.length === 0) ||
                (step === 3 && selectedItems.length === 0)
              }
              className={`w-full flex items-center justify-center gap-1 px-3 h-8 rounded-full bg-gradient-to-r from-stone-950 to-stone-900 hover:from-stone-900 hover:to-stone-800 text-white font-bold text-[11px] shadow-sm hover:shadow transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none ${
                step < 4 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              title={step === 3 ? "Review estimate" : "Go to next step"}
              aria-label={step === 3 ? "Review estimate" : "Go to next step"}
            >
              <span>{step === 3 ? "Review" : "Next"}</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ==================== STEP 1: PROJECT ==================== */}
        {step === 1 && (
          <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-card border border-slate-200/50 animate-fade-in">
            <div className="mb-6">
              <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">Step 1 of 4</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Project Registry</h2>
              <p className="text-slate-500 text-sm mt-1">Provide project details to build your quotation.</p>
            </div>

            {/* Project & Client Registry Selection Panel */}
            {(existingProjects.length > 0 || existingClients.length > 0) && (
              <div className="mb-8 p-5 bg-gradient-to-br from-amber-50/20 via-white to-stone-50/30 rounded-2xl border border-amber-100/50 shadow-sm flex flex-col gap-4 animate-fade-in">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    Load Existing Client or Project
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose an existing client to pre-fill contacts, or select a project to load previous estimate configurations.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Dropdown Selector */}
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Client List</span>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer shadow-sm"
                    >
                      <option value="new">✨ Create New Client</option>
                      {existingClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project Dropdown Selector */}
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Project List</span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          handleNewProjectSelect();
                        } else {
                          handleProjectSelect(e.target.value);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer shadow-sm"
                    >
                      <option value="new">✨ Create New Project</option>
                      {existingProjects
                        .filter(p => selectedClientId === "new" || p.client_id === selectedClientId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            📁 {p.name} ({p.client_name})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Details</h3>
                
                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1.5 flex items-center gap-1">
                    Client Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        setSelectedClientId("new");
                        if (e.target.value.trim()) {
                          setValidationErrors(prev => ({ ...prev, clientName: false }));
                        }
                      }}
                      placeholder="e.g. Rajesh Kumar"
                      className={`w-full bg-white border rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:ring-2 transition-all outline-none ${
                        validationErrors.clientName 
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/20' 
                          : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1.5 flex items-center gap-1">
                    Phone <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      setSelectedClientId("new");
                      if (e.target.value.trim()) {
                        setValidationErrors(prev => ({ ...prev, clientPhone: false }));
                      }
                    }}
                    placeholder="+91 98765..."
                    className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:ring-2 transition-all outline-none ${
                      validationErrors.clientPhone 
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/20' 
                        : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1.5">
                    Email <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="email" 
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      setSelectedClientId("new");
                    }}
                    placeholder="e.g. rajesh@gmail.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Parameters</h3>
                
                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1.5 flex items-center gap-1">
                    Project Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      if (e.target.value.trim()) {
                        setValidationErrors(prev => ({ ...prev, projectName: false }));
                      }
                    }}
                    placeholder="e.g. 3BHK Modern Apartment"
                    className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:ring-2 transition-all outline-none ${
                      validationErrors.projectName 
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/20' 
                        : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1.5">
                    Site Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="e.g. Sector 15, Gurgaon"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1.5">
                    Project Budget (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="number" 
                    value={formatNumericValue(projectBudget)}
                    onChange={(e) => setProjectBudget(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="e.g. 500000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Inline Navigation */}
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-bold mt-6 animate-fade-in flex items-center gap-2">
                <span>⚠️ {validationError}</span>
              </div>
            )}

          </div>
        )}
        {/* ==================== STEP 2: ROOMS ==================== */}
        {step === 2 && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
              <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">Step 2 of 4</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Room Allocation</h2>
              <p className="text-slate-500 text-sm mt-1">Define rooms or zones inside the project layout.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

              {/* ===== MAIN AREA: ROOM CARDS ===== */}
              <div className="xl:col-span-8 order-2 xl:order-1">
                <div className="border border-slate-100 rounded-2xl bg-white/50 p-6 min-h-[400px]">
                  {rooms.length === 0 ? (
                    <div className="text-center py-20 animate-fade-in">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Layers className="w-8 h-8 text-amber-400 animate-pulse" />
                      </div>
                      <h4 className="font-bold text-slate-500 text-sm">No rooms added to this quotation yet</h4>
                      <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                        Use the search input in the right sidebar to add spaces (Living Room, Kitchen, Bedrooms, etc.).
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 animate-fade-in">
                      {rooms.map((room) => {
                        const itemsCount = selectedItems.filter(item => item.room_id === room.id).length;
                        return (
                          <div 
                            key={room.id} 
                            onClick={() => {
                              if (validateStep1()) {
                                setActiveRoomId(room.id);
                                setStep(3); // Clicking card goes to Catalog mapping for this room
                              }
                            }}
                            className="border border-slate-100 hover:border-amber-200 rounded-2xl p-5 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer transition-all duration-350 group relative"
                          >
                            <div className="p-3 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white rounded-xl text-amber-700 w-fit mb-3 transition-colors duration-300">
                              <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="font-extrabold text-slate-800 text-[15px] tracking-tight">{room.name}</h3>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                              {itemsCount} item{itemsCount !== 1 ? 's' : ''} configured
                            </p>

                            <div className="mt-5 flex justify-between items-center border-t border-slate-50 pt-3">
                              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider group-hover:underline">Manage Items</span>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDeleteRoom(room.id); 
                                }}
                                className="text-slate-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}


                </div>
              </div>

              {/* ===== RIGHT SIDEBAR: ROOM ADD ===== */}
              <div className="xl:col-span-4 order-1 xl:order-2">
                <div className="glass-panel border border-slate-200/60 rounded-2xl p-5 xl:sticky xl:top-24">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-3">
                    <PlusCircle className="w-4 h-4 text-amber-600" />
                    Add Spaces
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Type a custom room name or search the list below to add spaces to this quotation.
                  </p>

                  {/* Room search/add input */}
                  <div className="relative mb-4" ref={roomSearchRef}>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Search or add room..."
                        value={roomSearchQuery}
                        onChange={(e) => {
                          setRoomSearchQuery(e.target.value);
                          setShowRoomDropdown(true);
                        }}
                        onFocus={() => setShowRoomDropdown(true)}
                        className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs w-full focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                      />
                    </div>

                    {showRoomDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
                        <div className="max-h-64 overflow-y-auto p-2">
                          {predefinedRoomTypes
                            .filter(rt => 
                              rt.toLowerCase().includes(roomSearchQuery.toLowerCase()) &&
                              !rooms.some(r => r.name.toLowerCase() === rt.toLowerCase())
                            )
                            .map((rt) => (
                              <button
                                key={rt}
                                onClick={() => handleAddRoomFromList(rt)}
                                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50/40 hover:text-amber-800 flex items-center justify-between group transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                                  {rt}
                                </span>
                                <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
                              </button>
                            ))
                          }
                          {roomSearchQuery.trim() && !predefinedRoomTypes.some(rt => rt.toLowerCase() === roomSearchQuery.trim().toLowerCase()) && (
                            <button
                              onClick={() => handleAddRoomFromList(roomSearchQuery)}
                              className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50/50 hover:bg-amber-100/60 flex items-center justify-between transition-colors mt-1 border border-amber-100"
                            >
                              <span className="flex items-center gap-2">
                                <PlusCircle className="w-4 h-4 text-amber-600" />
                                Add "{roomSearchQuery.trim()}"
                              </span>
                            </button>
                          )}
                          {predefinedRoomTypes.filter(rt => 
                            rt.toLowerCase().includes(roomSearchQuery.toLowerCase()) &&
                            !rooms.some(r => r.name.toLowerCase() === rt.toLowerCase())
                          ).length === 0 && !roomSearchQuery.trim() && (
                            <div className="px-4 py-6 text-center text-slate-400 text-xs">
                              All predefined rooms have been added.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Room chips */}
                  {rooms.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Configured Rooms</span>
                      <div className="flex flex-wrap gap-1.5">
                        {rooms.map((room) => (
                          <div 
                            key={room.id}
                            className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600"
                          >
                            <span>{room.name}</span>
                            <button 
                              onClick={() => handleDeleteRoom(room.id)}
                              className="hover:bg-rose-50 text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors ml-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== STEP 3: ITEMS ==================== */}
        {step === 3 && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
              <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">Step 3 of 4</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Catalog Item Mapping</h2>
              <p className="text-slate-500 text-sm mt-1">Select a room tab on the left, then browse the Master Catalog in the sidebar to add and customize items.</p>
            </div>

            {/* Mobile View Toggle */}
            <div className="flex xl:hidden mb-5 p-1 bg-slate-100/80 rounded-xl w-full border border-slate-200/40">
              <button 
                type="button"
                onClick={() => setMobileSubView('items')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  mobileSubView === 'items' 
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/10' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Configured Items ({activeRoomItems.length})
              </button>
              <button 
                type="button"
                onClick={() => setMobileSubView('catalog')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  mobileSubView === 'catalog' 
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/10' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Browse Master Catalog
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">

              {/* ===== MAIN AREA: SELECTED ITEMS ===== */}
              <div className={`xl:col-span-7 xl:order-1 ${mobileSubView === 'items' ? 'block' : 'hidden xl:block'}`}>

                {/* Room tabs */}
                {rooms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4 p-1.5 bg-slate-100/60 rounded-xl w-fit">
                    {rooms.map((room) => {
                      const count = selectedItems.filter(i => i.room_id === room.id).length;
                      return (
                        <button 
                          key={room.id}
                          onClick={() => setActiveRoomId(room.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeRoomId === room.id 
                              ? 'bg-white text-amber-700 shadow-sm' 
                              : 'text-slate-500 hover:bg-white/50'
                          }`}
                        >
                          {room.name}
                          {count > 0 && (
                            <span className={`text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center ${
                              activeRoomId === room.id 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-200 text-slate-500'
                            }`}>{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="border border-slate-100 rounded-2xl bg-white/50 p-5 min-h-[400px]">
                  {/* Section header */}
                  {rooms.length > 0 && activeRoomId ? (
                    <>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-600" />
                          <h3 className="font-bold text-slate-700 text-sm">{rooms.find(r => r.id === activeRoomId)?.name}</h3>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-400 font-medium">{activeRoomItems.length} item{activeRoomItems.length !== 1 ? 's' : ''} added</span>
                        </div>
                        {activeRoomItems.length > 0 && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50/40 px-3 py-1 rounded-full">
                            Room Total: ₹{activeRoomItems.reduce((sum, i) => sum + i.total_amount, 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {activeRoomItems.length === 0 ? (
                        <div className="text-center py-16 animate-fade-in">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-slate-200" />
                          </div>
                          <h4 className="font-bold text-slate-500 text-sm">No items in this room yet</h4>
                          <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                            Browse the <span className="font-bold text-amber-700">Master Catalog</span> in the sidebar. 
                            Pick a category and click any item to add it here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 animate-fade-in">
                          {activeRoomItems.map((item, idx) => (
                            <div key={item.uid} className="border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                              {/* Top row: Name + Total + Delete */}
                              <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-stone-900 to-stone-800 text-white px-2.5 py-0.5 rounded-full">
                                      {categories.find(c => c.id === item.category_id)?.name}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">{item.brand}</span>
                                    <select
                                      value={item.pricing_type}
                                      onChange={(e) => handleUpdateItemPricingType(item.uid, e.target.value)}
                                      className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                                        item.pricing_type === 'sq_ft' 
                                          ? 'bg-amber-100 text-amber-800 border-amber-200 focus:ring-1 focus:ring-amber-300' 
                                          : item.pricing_type === 'running_ft'
                                            ? 'bg-blue-100 text-blue-800 border-blue-200 focus:ring-1 focus:ring-blue-300'
                                            : 'bg-slate-100 text-slate-600 border-slate-200/60 focus:ring-1 focus:ring-slate-300'
                                      }`}
                                    >
                                      <option value="piece">Piece</option>
                                      <option value="sq_ft">Sq Ft</option>
                                      <option value="running_ft">Running Ft</option>
                                    </select>
                                  </div>
                                  <h4 className="font-extrabold text-slate-800 text-[15px] mt-1.5 tracking-tight">{item.name}</h4>
                                </div>
                                <div className="flex items-start gap-3 shrink-0">
                                  <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total</span>
                                    <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                                      ₹{item.total_amount.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteItem(item.uid)}
                                    className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                                    title="Remove item"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Bottom row: All editable fields in a clean grid */}
                              <div className="px-5 pb-4 pt-2 bg-slate-50/60 border-t border-slate-100/80 space-y-3">
                                {item.pricing_type === 'sq_ft' && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/60 mb-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Length (L) ft</label>
                                      <input 
                                        type="number" 
                                        value={formatNumericValue(item.length)} 
                                        onChange={(e) => handleUpdateItemValue(item.uid, 'length', parseFloat(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full bg-white border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Breadth (B) ft</label>
                                      <input 
                                        type="number" 
                                        value={formatNumericValue(item.breadth)} 
                                        onChange={(e) => handleUpdateItemValue(item.uid, 'breadth', parseFloat(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full bg-white border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Height (H) ft</label>
                                      <input 
                                        type="number" 
                                        value={formatNumericValue(item.height)} 
                                        onChange={(e) => handleUpdateItemValue(item.uid, 'height', parseFloat(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full bg-white border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                      />
                                    </div>
                                    <div className="flex flex-col justify-center items-center bg-amber-100/30 border border-amber-200/80 rounded-lg p-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Area (Sq Ft)</span>
                                      <span className="font-extrabold text-sm text-amber-900 mt-0.5">
                                        {((item.length || 0) * ((item.height || 0) || (item.breadth || 0) || 1)).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {item.pricing_type === 'running_ft' && (
                                  <div className="grid grid-cols-2 gap-3 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100/60 mb-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">Length (L) ft</label>
                                      <input 
                                        type="number" 
                                        value={formatNumericValue(item.length)} 
                                        onChange={(e) => handleUpdateItemValue(item.uid, 'length', parseFloat(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full bg-white border border-blue-200/80 rounded-lg px-2.5 py-1.5 text-sm text-center font-bold focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                      />
                                    </div>
                                    <div className="flex flex-col justify-center items-center bg-blue-100/30 border border-blue-200/80 rounded-lg p-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Length (Ft)</span>
                                      <span className="font-extrabold text-sm text-blue-900 mt-0.5">
                                        {(item.length || 0).toFixed(2)} ft
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                  {/* Base Rate */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Base ₹</label>
                                    <input 
                                      type="number" 
                                      value={formatNumericValue(item.base_rate)} 
                                      onChange={(e) => handleUpdateItemValue(item.uid, 'base_rate', parseFloat(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                    />
                                  </div>
                                  {/* Labor */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Labor ₹</label>
                                    <input 
                                      type="number" 
                                      value={formatNumericValue(item.labor_cost)} 
                                      onChange={(e) => handleUpdateItemValue(item.uid, 'labor_cost', parseFloat(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                    />
                                  </div>
                                  {/* Qty */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qty</label>
                                    <input 
                                      type="number" 
                                      value={formatNumericValue(item.qty)} 
                                      onChange={(e) => handleUpdateItemValue(item.uid, 'qty', parseFloat(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                    />
                                  </div>
                                  {/* Margin */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Margin %</label>
                                    <input 
                                      type="number" 
                                      value={formatNumericValue(item.margin_percent)} 
                                      onChange={(e) => handleUpdateItemValue(item.uid, 'margin_percent', parseFloat(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                    />
                                  </div>
                                  {/* GST % */}
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">GST %</label>
                                    <select
                                      value={item.gst_percent}
                                      onChange={(e) => handleUpdateItemValue(item.uid, 'gst_percent', parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-center font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all cursor-pointer text-slate-700"
                                    >
                                      <option value="0">0%</option>
                                      <option value="5">5%</option>
                                      <option value="12">12%</option>
                                      <option value="18">18%</option>
                                      <option value="28">28%</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Remark field */}
                                <div className="pt-2 border-t border-slate-200/50">
                                  <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Remark:</span>
                                    <input 
                                      type="text" 
                                      value={item.remark || ""} 
                                      onChange={(e) => handleUpdateItemRemark(item.uid, e.target.value)}
                                      placeholder="Add item specifications, material remarks, etc..."
                                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder-slate-300"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Layers className="w-8 h-8 text-amber-400/80" />
                      </div>
                      <h4 className="font-bold text-slate-500 text-sm">No active room selected</h4>
                      <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                        Please choose a room tab above, or go back to Step 2 to configure your rooms list first.
                      </p>
                    </div>
                  )}


                </div>
              </div>

              {/* ===== RIGHT SIDEBAR: MASTER CATALOG ===== */}
              <div className={`xl:col-span-3 xl:order-2 ${mobileSubView === 'catalog' ? 'block' : 'hidden xl:block'}`}>
                <div className="glass-panel border border-amber-200/40 rounded-2xl p-4 flex flex-col xl:sticky xl:top-24 xl:max-h-[calc(100vh-160px)] max-h-none">

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">Master Catalog</h3>
                      {activeRoomId && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Click item to add to <span className="font-bold text-amber-700">{rooms.find(r => r.id === activeRoomId)?.name}</span></p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewItemForm((value) => !value)}
                      title="Add missing catalog item"
                      className="p-2 bg-amber-50/40 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {showNewItemForm && (
                    <form onSubmit={handleCreateCatalogItem} className="mb-3 rounded-xl border border-amber-100/60 bg-amber-50/20 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newCatalogItem.name}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, name: e.target.value })}
                          placeholder="Item name"
                          className="col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        />
                        <input
                          type="text"
                          value={newCatalogItem.subcategory}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, subcategory: e.target.value })}
                          placeholder="Subcategory"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        />
                        <input
                          type="text"
                          value={newCatalogItem.brand}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, brand: e.target.value })}
                          placeholder="Brand"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        />
                        <select
                          value={newCatalogItem.pricing_type}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, pricing_type: e.target.value })}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        >
                          <option value="piece">Piece</option>
                          <option value="sq_ft">Sq ft</option>
                          <option value="running_ft">Running ft</option>
                        </select>
                        <input
                          type="number"
                          value={newCatalogItem.base_rate}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, base_rate: sanitizeNumericString(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          placeholder="Base rate"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        />
                        <input
                          type="number"
                          value={newCatalogItem.labor_cost}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, labor_cost: sanitizeNumericString(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          placeholder="Labor"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        />
                        <input
                          type="text"
                          value={newCatalogItem.material}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, material: e.target.value })}
                          placeholder="Material"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-400 focus:ring-amber-100 outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewItemForm(false)}
                          className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingCatalogItem || !newCatalogItem.name.trim()}
                          className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold"
                        >
                          {savingCatalogItem ? "Saving..." : "Save & Add"}
                        </button>
                      </div>
                    </form>
                  )}
                  
                  {/* Category filters */}
                  <div className="flex flex-wrap gap-1.5 pb-3 mb-3 border-b border-slate-100">
                    {categories.map((c) => {
                      const catCount = catalog.filter(i => i.category_id === c.id).length;
                      return (
                        <button 
                          key={c.id}
                          onClick={() => {
                            setActiveCategoryId(c.id);
                            setCatalogSearchQuery("");
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            activeCategoryId === c.id 
                              ? 'bg-gradient-to-r from-stone-950 to-stone-900 text-white shadow-md' 
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                          }`}
                        >
                          {c.name}
                          <span className={`text-[9px] font-extrabold rounded-full min-w-[16px] h-[16px] flex items-center justify-center ${
                            activeCategoryId === c.id 
                              ? 'bg-white/25 text-white' 
                              : 'bg-slate-200/80 text-slate-500'
                          }`}>{catCount}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Bar for selected category */}
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      placeholder="Search items in this category..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all outline-none"
                    />
                    {catalogSearchQuery && (
                      <button
                        onClick={() => setCatalogSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCatalog.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleAddCatalogItem(item)}
                        className={`border border-slate-100 hover:border-amber-300 bg-white hover:bg-amber-50/40/40 p-3 rounded-xl flex justify-between items-center group transition-all duration-200 shadow-sm hover:shadow-md ${
                          !activeRoomId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                              {item.subcategory}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">{item.brand}</span>
                          </div>
                          <h4 className="font-bold text-slate-700 text-xs mt-1 group-hover:text-amber-800 transition-colors">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-semibold">₹{item.base_rate.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-slate-400">/{item.pricing_type}</span>
                            <span className="text-[9px] text-slate-300">•</span>
                            <span className="text-[9px] text-slate-400">Labor ₹{item.labor_cost.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div className="text-slate-300 group-hover:text-white transition-all shrink-0 p-1.5 bg-slate-50 rounded-lg group-hover:bg-amber-600 group-hover:shadow-md">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                    {filteredCatalog.length === 0 && (
                      <div className="text-center py-8">
                        <ShoppingBag className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-xs font-medium">No items in this category yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== STEP 4: QUOTATION ==================== */}
        {step === 4 && (
          <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-card border border-slate-200/50 animate-fade-in">
            <div className="mb-6">
              <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">Step 4 of 4</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Quotation Summary</h2>
              <p className="text-slate-500 text-sm mt-1">Finalize discounts, terms, and generate your PDF proposal.</p>
            </div>

            {/* Success notification */}
            {successMsg && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 animate-fade-in shadow-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-sm">{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              
              {/* Left: Details */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Meta preview */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Proposal Details</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div>
                      <span className="text-slate-400 font-medium">Client:</span>
                      <span className="text-slate-800 font-bold ml-1">{clientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Project:</span>
                      <span className="text-slate-800 font-bold ml-1">{projectName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Quote No:</span>
                      <span className="text-slate-800 font-bold ml-1">
                        {savedQuotationId 
                          ? (savedQuotationId.startsWith('local_') ? `LQ-${savedQuotationId.slice(-6).toUpperCase()}` : `QT-${savedQuotationId.slice(0, 8).toUpperCase()}`) 
                          : 'Draft'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Version:</span>
                      <span className="text-slate-800 font-bold ml-1">
                        {quotationVersion !== null ? `V${quotationVersion}` : 'V1 (Draft)'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Date:</span>
                      <span className="text-slate-800 font-bold ml-1">
                        {quotationDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {clientEmail && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium">Email:</span>
                        <span className="text-slate-800 font-bold ml-1">{clientEmail}</span>
                      </div>
                    )}
                    {projectBudget > 0 && (
                      <div>
                        <span className="text-slate-400 font-medium">Budget:</span>
                        <span className="text-slate-800 font-bold ml-1">₹{projectBudget.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {siteAddress && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium">Site Address:</span>
                        <span className="text-slate-800 font-bold ml-1">{siteAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item summary per room */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Items by Room</h3>
                  {rooms.map((room) => {
                    const roomItems = selectedItems.filter(i => i.room_id === room.id);
                    if (roomItems.length === 0) return null;
                    return (
                      <div key={room.id} className="border border-slate-100 rounded-xl p-4 bg-white">
                        <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-600" />
                          {room.name}
                          <span className="text-xs text-slate-400 font-normal">({roomItems.length} items)</span>
                        </h4>
                        <div className="space-y-2">
                          {roomItems.map(item => (
                            <div key={item.uid} className="py-1 border-b border-slate-50 last:border-0">
                              <div className="flex justify-between items-center text-xs text-slate-600">
                                <span>
                                  {item.name}
                                  {item.pricing_type === 'sq_ft' ? (
                                    <>
                                      <span className="text-amber-800 font-bold bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded text-[10px] ml-1.5 inline-flex items-center">
                                        {Number(((item.length || 1) * (item.height || item.breadth || 1)).toFixed(2))} sq_ft
                                      </span>
                                      <span className="text-slate-400"> × {item.qty} piece{item.qty !== 1 ? 's' : ''}</span>
                                    </>
                                  ) : item.pricing_type === 'running_ft' ? (
                                    <>
                                      <span className="text-blue-800 font-bold bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded text-[10px] ml-1.5 inline-flex items-center">
                                        {Number((item.length || 1).toFixed(2))} ft
                                      </span>
                                      <span className="text-slate-400"> × {item.qty} piece{item.qty !== 1 ? 's' : ''}</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400"> × {item.qty} piece{item.qty !== 1 ? 's' : ''}</span>
                                  )}
                                </span>
                                <span className="font-bold text-slate-800">₹{item.total_amount.toLocaleString('en-IN')}</span>
                              </div>
                              {item.remark && (
                                <p className="text-[10px] text-amber-700 font-semibold italic mt-0.5">Remark: {item.remark}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Terms & Adjustments Card */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Terms & Adjustments</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left side: Financial settings (Discount & GST) */}
                    <div className="lg:col-span-5 space-y-5">
                      {/* Discount Input */}
                      <div>
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Discount (₹)</label>
                        <div className="relative rounded-xl shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-extrabold text-sm">₹</span>
                          </div>
                          <input 
                            type="number" 
                            value={formatNumericValue(discount)}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-4 py-2.5 text-sm font-extrabold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all duration-200"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Applied directly to the final total amount.</p>
                      </div>

                      {/* GST Options */}
                      <div className="bg-slate-50/40 border border-slate-100 p-4 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">Add Global GST / Taxes?</span>
                            <span className="text-[10px] text-slate-400 font-medium">Apply tax rate to quotation subtotal</span>
                          </div>
                          
                          {/* Premium Custom Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={applyGlobalGst}
                              onChange={(e) => setApplyGlobalGst(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                          </label>
                        </div>

                        {/* GST Rate input with slide-down animation */}
                        <div className={`transition-all duration-300 overflow-hidden ${applyGlobalGst ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">GST Rate (%)</label>
                          <div className="relative rounded-xl shadow-sm">
                            <input 
                              type="number" 
                              value={formatNumericValue(globalGstPercent)}
                              onChange={(e) => handleUpdateGlobalGstPercent(parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              placeholder="e.g. 18"
                              className="w-full bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                              <span className="text-slate-400 font-bold text-sm">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Terms & Conditions and Presets */}
                    <div className="lg:col-span-7 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Terms & Conditions</label>
                          <span className="text-[10px] text-slate-400 font-medium">Will be printed at PDF bottom</span>
                        </div>
                        <textarea 
                          rows={4}
                          value={terms}
                          placeholder="Enter project payment stages, delivery timelines, validity, etc..."
                          onChange={(e) => setTerms(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200/80 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 placeholder-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all duration-200 resize-none"
                        />
                      </div>

                      {/* Payment Terms Templates */}
                      <div className="mt-3.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Quick Payment Templates</span>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            type="button"
                            onClick={() => setTerms("1. Payment Terms: 40% Booking Advance, 40% on Material Delivery, 20% on Completion.\n2. Validity: Prices are valid for 30 days from proposal date.")}
                            className="text-[10px] bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            40-40-20 Terms
                          </button>
                          <button 
                            type="button"
                            onClick={() => setTerms("1. Payment Terms: 50% Booking Advance, 50% on Delivery.\n2. Validity: Prices are valid for 15 days.")}
                            className="text-[10px] bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            50-50 Terms
                          </button>
                          <button 
                            type="button"
                            onClick={() => setTerms("1. Payment Terms: 100% Booking Advance.\n2. Validity: Prices are valid for 15 days.")}
                            className="text-[10px] bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            100% Advance
                          </button>
                          <button 
                            type="button"
                            onClick={() => setTerms("")}
                            className="text-[10px] bg-slate-50 hover:bg-rose-50 hover:text-rose-800 border border-slate-200 hover:border-rose-200 text-slate-500 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            Clear Terms
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Grand Summary + Add Spaces */}
              <div className="space-y-6">
                
                {/* Grand Summary */}
                <div className="bg-gradient-to-br from-amber-50/20 to-stone-50/20 border border-amber-100/60 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Grand Summary
                    </h3>
                    
                    <div className="mt-6 space-y-3 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Total Item Price:</span>
                        <span className="font-semibold text-slate-800">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Additional GST:</span>
                        <span className="font-semibold text-slate-800">₹{totals.gst_amount.toLocaleString('en-IN')}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-medium">
                          <span>Discount:</span>
                          <span>-₹{discount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="border-t border-amber-200/40 pt-4 flex justify-between items-end">
                        <span className="text-slate-500 font-bold">Grand Total:</span>
                        <span className="text-2xl font-extrabold text-amber-800 tracking-tight leading-none">
                          ₹{totals.grand_total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <button 
                      onClick={handleSaveQuotation}
                      disabled={loading || isSaveDisabled}
                      className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white border border-stone-950 font-bold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    >
                      {loading ? <SpaceLoader fullPage={false} size="sm" /> : <Save className="w-4 h-4" />}
                      {isSaveDisabled ? "Already Saved (No Changes)" : "Save Quotation"}
                    </button>

                     <button 
                      onClick={async () => {
                        let targetQuoteId = savedQuotationId;
                        
                        // If there are unsaved changes, auto-save first!
                        if (!isSaveDisabled) {
                          showToastMsg("Saving your changes first...", "success");
                          const newId = await handleSaveQuotation();
                          if (newId) {
                            targetQuoteId = newId;
                          } else {
                            showToastMsg("Failed to save changes. Download cancelled.", "error");
                            return;
                          }
                        }
                        
                        if (targetQuoteId) {
                          try {
                            setPdfLoading(true);
                            showToastMsg("Generating PDF proposal...", "success");
                            const response = await fetch(`${API_BASE_URL}/quotations/${targetQuoteId}/pdf`, {
                              headers: getAuthHeaders()
                            });
                            if (!response.ok) throw new Error("Failed to download PDF");
                            
                            // Extract filename from headers if available
                            const contentDisposition = response.headers.get('Content-Disposition');
                            let filename = `Proposal_Revision_${quotationVersion || 'V'}.pdf`;
                            if (contentDisposition) {
                              const match = contentDisposition.match(/filename="?([^"]+)"?/);
                              if (match && match[1]) {
                                filename = match[1];
                              }
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', filename);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            showToastMsg("PDF downloaded successfully!", "success");
                          } catch (error) {
                            console.error(error);
                            showToastMsg("Error generating PDF. Please check backend connection.", "error");
                          } finally {
                            setPdfLoading(false);
                          }
                        } else {
                          showToastMsg("Please save the quotation first before downloading the PDF.", "warning");
                        }
                      }}
                      disabled={pdfLoading || (!savedQuotationId && isSaveDisabled)}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-sm shadow-md transition-all focus:outline-none ${
                        (savedQuotationId || !isSaveDisabled) && !pdfLoading
                          ? 'bg-gradient-to-r from-stone-950 to-stone-900 hover:from-stone-900 hover:to-stone-800 text-white hover:shadow-lg focus:ring-2 focus:ring-amber-500/40' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {pdfLoading ? "Generating PDF..." : "Download PDF"}
                    </button>
                  </div>
                </div>
              </div>

            </div>


          </div>
        )}
        {/* Footer */}
        <footer className="mt-12 border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-bold">
          <div className="flex justify-center items-center gap-2">
            <span>Powered by</span>
            <img src="/spaceio_logo.png" alt="SpaceIO Logo" className="h-4 object-contain inline-block opacity-65 hover:opacity-100 transition-opacity" />
            <span className="text-slate-500">SpaceIO CRM</span>
          </div>
        </footer>
      </main>

      {/* CUSTOM FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-in-right">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/25 shadow-lg' 
              : toast.type === 'warning'
              ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/25 shadow-lg'
              : 'bg-rose-600 border-rose-500 text-white shadow-rose-500/25 shadow-lg'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-100" />}
            {toast.type === 'warning' && <Sparkles className="w-5 h-5 shrink-0 text-amber-100" />}
            {toast.type === 'error' && <X className="w-5 h-5 shrink-0 text-rose-100" />}
            
            <div className="flex-1 min-w-[200px] max-w-sm">
              <p className="text-xs font-bold tracking-tight">{toast.message}</p>
            </div>
            
            <button 
              onClick={() => setToast(null)}
              className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
