import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApplicationRecord, UserProfile, UserRole, StatsOverview, AuditLogEntry, GeneratedDocument } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  currentUser: UserProfile | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
  applications: ApplicationRecord[];
  stats: StatsOverview | null;
  auditLogs: AuditLogEntry[];
  isLoading: boolean;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  loginUser: (user: UserProfile) => void;
  loginAdmin: () => void;
  updateCurrentUserProfile: (user: UserProfile) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
  createApplication: (data: any) => Promise<ApplicationRecord>;
  updateApplication: (id: string, data: any) => Promise<ApplicationRecord>;
  deleteApplication: (id: string) => Promise<void>;
  users: UserProfile[];
  deleteUser: (id: string) => Promise<void>;
  previewDoc: GeneratedDocument | null;
  setPreviewDoc: (doc: GeneratedDocument | null) => void;
  editingApplication: ApplicationRecord | null;
  setEditingApplication: (app: ApplicationRecord | null) => void;
  isNewAppModalOpen: boolean;
  setIsNewAppModalOpen: (open: boolean) => void;
  // Google Sheets integration state & helpers
  googleToken: string | null;
  isGoogleConnected: boolean;
  connectGoogle: () => void;
  disconnectGoogle: () => void;
  pullFromGoogleSheets: () => Promise<void>;
  pushRecordToGoogleSheets: (appId: string) => Promise<void>;
  spreadsheetUrl: string;
  driveFolderUrl: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GOOGLE_CLIENT_ID = '343211370533-q75qrjgahflu3t789p70fj27abdvtv6f.apps.googleusercontent.com';
const GOOGLE_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY/edit?usp=sharing';
const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing';

export const formatUserProfileId = (user: UserProfile): UserProfile => {
  if (!user) return user;
  let id = user.id;

  if (id && /^usr-\d{4}$/.test(id)) {
    return user;
  }

  const digits = (id || user.icNumber || '').replace(/\D/g, '');
  if (digits) {
    const num = parseInt(digits.slice(-4), 10);
    const validNum = isNaN(num) || num === 0 ? 1 : num;
    id = `usr-${String(validNum).padStart(4, '0')}`;
  } else {
    id = 'usr-0001';
  }

  return {
    ...user,
    id
  };
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('irepro_user');
    return saved ? formatUserProfileId(JSON.parse(saved)) : null;
  });

  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('irepro_role');
    return (saved as UserRole) || null;
  });

  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return localStorage.getItem('irepro_google_token') || null;
  });

  const [activeView, setActiveView] = useState<string>('landing');
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [editingApplication, setEditingApplication] = useState<ApplicationRecord | null>(null);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState<boolean>(false);

  const isAdmin = userRole === 'ADMIN';
  const isGoogleConnected = Boolean(googleToken);

  const deleteUser = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memadam pengguna.');
      }
      setUsers((prev) => prev.filter((u) => u.id !== id && u.icNumber !== id));
      showToast('Pengguna berjaya dipadam!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const connectGoogle = () => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (resp: any) => {
          if (resp.access_token) {
            setGoogleToken(resp.access_token);
            localStorage.setItem('irepro_google_token', resp.access_token);
            showToast('Akaun Google berjaya disambungkan! Rakaman automatik ke Google Sheets aktif.', 'success');
          } else if (resp.error) {
            showToast(`Sambungan Google dibatalkan: ${resp.error}`, 'error');
          }
        },
      });
      tokenClient.requestAccessToken();
    } else {
      showToast('Modul Google API sedang dimuatkan. Sila cuba lagi sebentar lagi.', 'info');
    }
  };

  const disconnectGoogle = () => {
    setGoogleToken(null);
    localStorage.removeItem('irepro_google_token');
    showToast('Sambungan akaun Google telah diputuskan.', 'info');
  };

  const loginUser = (user: UserProfile) => {
    const formattedUser = formatUserProfileId(user);
    setCurrentUser(formattedUser);
    setUserRole('USER');
    localStorage.setItem('irepro_user', JSON.stringify(formattedUser));
    localStorage.setItem('irepro_role', 'USER');
    setActiveView('user_dashboard');
    showToast(`Selamat kembali, ${formattedUser.name}!`);
  };

  const loginAdmin = () => {
    setUserRole('ADMIN');
    setCurrentUser(null);
    localStorage.setItem('irepro_role', 'ADMIN');
    localStorage.removeItem('irepro_user');
    setActiveView('admin_dashboard');
    showToast('Log masuk Pentadbir berjaya.');
  };

  const updateCurrentUserProfile = (user: UserProfile) => {
    const formattedUser = formatUserProfileId(user);
    setCurrentUser(formattedUser);
    localStorage.setItem('irepro_user', JSON.stringify(formattedUser));
  };

  const logout = () => {
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem('irepro_user');
    localStorage.removeItem('irepro_role');
    setActiveView('landing');
    showToast('Anda telah log keluar.');
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      // Fetch Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch Applications based on role
      const params = new URLSearchParams();
      if (userRole === 'USER' && currentUser?.icNumber) {
        params.append('icNumber', currentUser.icNumber);
      }
      params.append('t', Date.now().toString());

      const appsRes = await fetch(`/api/applications?${params.toString()}`);
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        // Normalize: ensure year is always a number and createdAt is set
        const normalized = (appsData.applications || []).map((a: any) => ({
          ...a,
          year: a.createdAt ? new Date(a.createdAt).getFullYear() : Number(a.year),
        }));
        console.log('[iREPRO] Applications loaded:', normalized.length, '| Sample years:', normalized.slice(0,5).map((a: any) => `${a.applicationId}:${a.year}`));
        setApplications(normalized);
      }

      // Fetch Audit Logs & Users if admin
      if (userRole === 'ADMIN') {
        const [logsRes, usersRes] = await Promise.all([
          fetch('/api/audit-logs'),
          fetch('/api/users')
        ]);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setAuditLogs(logsData);
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users || []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pullFromGoogleSheets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/sheets/pull', { method: 'POST' });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || `Ralat pelayan (${res.status})`);
      }
      if (res.ok) {
        showToast(data.message || 'Data Google Sheets berjaya ditarik!', 'success');
        await refreshData();
      } else {
        showToast(data.error || 'Gagal menarik data dari Google Sheets', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ralat sambungan ke pelayan Google Sheets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const pushRecordToGoogleSheets = async (appId: string) => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (googleToken) {
        headers['Authorization'] = `Bearer ${googleToken}`;
      }

      const res = await fetch('/api/sheets/push-record', {
        method: 'POST',
        headers,
        body: JSON.stringify({ applicationId: appId }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || `Ralat pelayan (${res.status})`);
      }
      if (res.ok) {
        showToast(`Rekod diselaraskan ke sheet "${data.targetSheet}"!`, 'success');
      } else {
        showToast(data.error || 'Gagal menyelaraskan rekod ke Google Sheets', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ralat semasa menghantar ke Google Sheets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [userRole, currentUser?.icNumber]);

  // Sync from Google Sheets on app startup and reload data
  useEffect(() => {
    const silentPullOnMount = async () => {
      try {
        await fetch('/api/sheets/pull', { method: 'POST' });
        await refreshData();
      } catch (e) {
        console.error('[iREPRO App] Initial silent sheet pull failed:', e);
      }
    };
    silentPullOnMount();
  }, []);

  const createApplication = async (data: any): Promise<ApplicationRecord> => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (googleToken) {
        headers['Authorization'] = `Bearer ${googleToken}`;
      }

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      let result: any = {};
      try {
        result = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || `Ralat pelayan (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(result.error || `Gagal menyimpan permohonan (${res.status})`);
      }

      await refreshData();
      showToast(`Permohonan berjaya direkodkan ke Google Sheets (${result.targetSheet || 'Pangkalan Data'})!`, 'success');
      return result.application;
    } finally {
      setIsLoading(false);
    }
  };

  const updateApplication = async (id: string, data: any): Promise<ApplicationRecord> => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      let result: any = {};
      try {
        result = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || `Ralat pelayan (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(result.error || `Gagal mengemaskini permohonan (${res.status})`);
      }

      await refreshData();
      showToast('Data berjaya dikemaskini!', 'success');
      return result.application;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApplication = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });

      let result: any = {};
      try {
        result = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || `Ralat pelayan (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(result.error || `Gagal memadam permohonan (${res.status})`);
      }

      await refreshData();
      showToast('Rekod berjaya dipadam!', 'success');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userRole,
        isAdmin,
        activeView,
        setActiveView,
        applications,
        stats,
        auditLogs,
        isLoading,
        toasts,
        showToast,
        loginUser,
        loginAdmin,
        updateCurrentUserProfile,
        logout,
        refreshData,
        createApplication,
        updateApplication,
        deleteApplication,
        users,
        deleteUser,
        previewDoc,
        setPreviewDoc,
        editingApplication,
        setEditingApplication,
        isNewAppModalOpen,
        setIsNewAppModalOpen,
        googleToken,
        isGoogleConnected,
        connectGoogle,
        disconnectGoogle,
        pullFromGoogleSheets,
        pushRecordToGoogleSheets,
        spreadsheetUrl: GOOGLE_SPREADSHEET_URL,
        driveFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
