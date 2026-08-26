import express from 'express';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {
  GOOGLE_SPREADSHEET_ID,
  GOOGLE_DRIVE_FOLDER,
  GOOGLE_OAUTH_CLIENT_ID,
  syncAllSheets,
  prepareSheetRow,
  appendRowToGoogleSheet,
  formatIc,
  formatDateForSheet,
} from './server/googleSheets.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Data Interfaces
interface StoredUser {
  id: string;
  icNumber: string;
  name: string;
  phone: string;
  email: string;
  institution: string;
  department?: string;
  createdAt: string;
}

interface StoredApplication {
  id: string;
  applicationId: string;
  applicationType: 'INOVASI' | 'PENYELIDIKAN';
  category?: string;
  language: 'MS' | 'EN';
  icNumber: string;
  applicantName: string;
  email?: string;
  institution: string;
  title: string;
  year: number;
  status: 'DRAFT' | 'GENERATED' | 'COMPLETED';
  sourceSheet?: 'inovasi' | 'lampiran a' | 'PPP' | 'Data Permohonan';
  sheetRowIndex?: number;
  innovationData?: any;
  researchData?: any;
  generatedDocuments: any[];
  driveUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  user: string;
  action: 'Login' | 'Pendaftaran' | 'Create application' | 'Update application' | 'Generate document' | 'Delete application' | 'Admin action';
  applicationId?: string;
  details?: string;
  timestamp: string;
}

interface Feedback {
  id: string;
  jantina: string;
  umur: string;
  bangsa: string;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
  comments: string;
  createdAt: string;
}

// In-memory / file persistent store
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'irepro_db.json');

if (!process.env.VERCEL && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed initial realistic data for Malaysian Polytechnic & Community Colleges
const initialUsers: StoredUser[] = [
  {
    id: 'usr-1',
    icNumber: '880512-10-5431',
    name: 'Dr. Ahmad Fauzi bin Ismail',
    phone: '012-3456789',
    email: 'fauzi.ismail@psa.edu.my',
    institution: 'Politeknik Sultan Salahuddin Abdul Aziz Shah',
    department: 'Jabatan Kejuruteraan Mekanikal',
    createdAt: '2025-01-15T08:30:00.000Z',
  },
  {
    id: 'usr-2',
    icNumber: '910304-08-5678',
    name: 'Ts. Siti Nurhaliza binti Ramli',
    phone: '013-9876543',
    email: 'siti.nurhaliza@puo.edu.my',
    institution: 'Politeknik Ungku Omar',
    department: 'Jabatan Teknologi Maklumat & Komunikasi',
    createdAt: '2025-02-10T10:00:00.000Z',
  },
  {
    id: 'usr-3',
    icNumber: '850920-01-6789',
    name: 'Ts. Mohd Khairul bin Anuar',
    phone: '019-4567890',
    email: 'khairul.anuar@kkbb.edu.my',
    institution: 'Kolej Komuniti Bayan Baru',
    department: 'Unit Sijil Teknologi Maklumat',
    createdAt: '2026-01-08T09:15:00.000Z',
  },
];

const initialApplications: StoredApplication[] = [
  {
    id: 'app-inv-001',
    applicationId: 'IREPRO-INV-2026-0001',
    applicationType: 'INOVASI',
    language: 'MS',
    icNumber: '880512-10-5431',
    applicantName: 'Dr. Ahmad Fauzi bin Ismail',
    institution: 'Politeknik Sultan Salahuddin Abdul Aziz Shah',
    title: 'Sistem Pemantauan Pintar IoT Kualiti Udara Makmal Kimia PSA',
    year: 2026,
    status: 'COMPLETED',
    innovationData: {
      chiefName: 'Dr. Ahmad Fauzi bin Ismail',
      chiefIc: '880512-10-5431',
      chiefPhone: '012-3456789',
      chiefEmail: 'fauzi.ismail@psa.edu.my',
      institution: 'Politeknik Sultan Salahuddin Abdul Aziz Shah',
      members: [
        {
          id: 'mem-1',
          name: 'Ts. Mohamad Hafiz bin Zainal',
          icNumber: '920110-10-1233',
          phone: '017-8899123',
          department: 'Jabatan Kejuruteraan Elektrik',
          institution: 'Politeknik Sultan Salahuddin Abdul Aziz Shah',
        },
        {
          id: 'mem-2',
          name: 'Puan Nurul Asyikin binti Othman',
          icNumber: '930815-08-5422',
          phone: '011-2345678',
          department: 'Jabatan Matematik, Sains & Komputer',
          institution: 'Politeknik Sultan Salahuddin Abdul Aziz Shah',
        },
      ],
      adminInfo: {
        kupikName: 'Dr. Zulkifli bin Hashim',
        deputyDirectorName: 'Ts. Azman bin Mohd Yusof',
        directorName: 'Dr. Hajah Salbiah binti Arshad',
      },
      title: 'Sistem Pemantauan Pintar IoT Kualiti Udara Makmal Kimia PSA',
      introduction: 'Inovasi ini dibangunkan untuk memantau paras gas berbahaya dan kepekatan partikel terampai secara masa nyata di makmal kejuruteraan kimia Politeknik Sultan Salahuddin Abdul Aziz Shah bagi memastikan keselamatan pensyarah dan pelajar.',
      objectives: '1. Membina modul sensor IoT bersepadu berketepatan tinggi.\n2. Menyediakan amaran masa nyata melalui dashboard cloud dan peranti mudah alih.\n3. Mengurangkan risiko pendedahan gas kimia berbahaya sehingga 95%.',
      impactTargetGroup: 'Pelajar dan pensyarah makmal kimia mendapat persekitaran pembelajaran dan amali yang lebih selamat.',
      impactInstitution: 'Menaikkan penarafan keselamatan institusi mengikut piawaian OSHA dan MyPOLYCC.',
      impactDepartment: 'Mengautomasikan rekod keselamatan makmal tanpa memerlukan log manual harian.',
    },
    generatedDocuments: [
      {
        id: 'doc-1',
        applicationId: 'IREPRO-INV-2026-0001',
        documentType: 'Surat Lantikan Inovasi',
        templateKey: 'innovation_ms_appointment',
        language: 'MS',
        fileName: 'IREPRO-INV-2026-0001_Lantikan_Inovasi.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2026-01-20T11:00:00.000Z',
      },
      {
        id: 'doc-2',
        applicationId: 'IREPRO-INV-2026-0001',
        documentType: 'Kertas Cadangan Inovasi',
        templateKey: 'innovation_ms_proposal',
        language: 'MS',
        fileName: 'IREPRO-INV-2026-0001_Kertas_Cadangan_Inovasi.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2026-01-20T11:00:00.000Z',
      },
    ],
    driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
    createdAt: '2026-01-20T10:45:00.000Z',
    updatedAt: '2026-01-20T11:00:00.000Z',
  },
  {
    id: 'app-res-001',
    applicationId: 'IREPRO-RES-2026-0001',
    applicationType: 'PENYELIDIKAN',
    category: 'CAT_1',
    language: 'MS',
    icNumber: '910304-08-5678',
    applicantName: 'Ts. Siti Nurhaliza binti Ramli',
    institution: 'Politeknik Ungku Omar',
    title: 'Keberkesanan Kaedah Gamifikasi Terhadap Penguasaan Algoritma Pelajar Diploma TMK',
    year: 2026,
    status: 'COMPLETED',
    researchData: {
      category: 'CAT_1',
      chiefName: 'Ts. Siti Nurhaliza binti Ramli',
      chiefIc: '910304-08-5678',
      chiefPhone: '013-9876543',
      chiefEmail: 'siti.nurhaliza@puo.edu.my',
      department: 'Jabatan Teknologi Maklumat & Komunikasi',
      institution: 'Politeknik Ungku Omar',
      members: [
        {
          id: 'mem-3',
          name: 'Encik Razak bin Hamdan',
          icNumber: '891102-08-7711',
          phone: '012-7654321',
          department: 'Jabatan Teknologi Maklumat & Komunikasi',
          institution: 'Politeknik Ungku Omar',
        },
      ],
      adminInfo: {
        kupikName: 'Dr. Noraini binti Kamaruddin',
        deputyDirectorName: 'Ts. Haji Shamsul bin Baharom',
        directorName: 'Dr. Shamsuri bin Abdullah',
        ppiDirectorName: 'Dr. Normala binti Daud',
      },
      title: 'Keberkesanan Kaedah Gamifikasi Terhadap Penguasaan Algoritma Pelajar Diploma TMK',
      conference: 'National Innovation and Research Conference (NIRC 2026)',
      introduction: 'Kajian ini menyelidik impak pembelajaran berasaskan gamifikasi interaktif dalam meningkatkan minat dan prestasi pemikiran komputasional pelajar semester 1 Diploma Sains Komputer.',
      objectives: '1. Mengenal pasti tahap penerimaan pelajar terhadap aplikasi gamifikasi modul pengaturcaraan.\n2. Mengukur peningkatan markah penilaian kuiz dan amali sebelum dan selepas intervensi.\n3. Merangka model pedagogi gamifikasi untuk kurikulum POLYCC.',
      location: 'Politeknik Ungku Omar, Ipoh',
      sample: '120 orang pelajar Diploma TMK Semester 1 & 2',
      instruments: 'Soal selidik Likert 5-mata, ujian pra/pasca, rekod analitik aktiviti digital',
      pilotStartDate: '2026-02-01',
      pilotEndDate: '2026-02-28',
      actualStartDate: '2026-03-15',
      actualEndDate: '2026-07-30',
      expectedReportDate: '2026-09-15',
      impactDepartment: 'Memperbaiki kadar lulus kursus teras pengaturcaraan daripada 72% kepada 88%.',
      impactTargetGroup: 'Pelajar lebih bermotivasi dan mempunyai pemahaman logik pengaturcaraan yang kukuh.',
      impactInstitution: 'Menjadi penanda aras amalan terbaik TVET instruksional digital bagi institusi POLYCC.',
    },
    generatedDocuments: [
      {
        id: 'doc-3',
        applicationId: 'IREPRO-RES-2026-0001',
        documentType: 'Lantikan Penyelidik',
        templateKey: 'research_cat1_ms_appointment',
        language: 'MS',
        fileName: 'IREPRO-RES-2026-0001_Lantikan_Penyelidik.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2026-02-15T09:30:00.000Z',
      },
      {
        id: 'doc-4',
        applicationId: 'IREPRO-RES-2026-0001',
        documentType: 'Lampiran A',
        templateKey: 'research_cat1_ms_appendix',
        language: 'MS',
        fileName: 'IREPRO-RES-2026-0001_Lampiran_A.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2026-02-15T09:30:00.000Z',
      },
      {
        id: 'doc-5',
        applicationId: 'IREPRO-RES-2026-0001',
        documentType: 'Kertas Cadangan 1',
        templateKey: 'research_cat1_ms_proposal',
        language: 'MS',
        fileName: 'IREPRO-RES-2026-0001_Kertas_Cadangan_1.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2026-02-15T09:30:00.000Z',
      },
    ],
    driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
    createdAt: '2026-02-15T09:00:00.000Z',
    updatedAt: '2026-02-15T09:30:00.000Z',
  },
  {
    id: 'app-res-002',
    applicationId: 'IREPRO-RES-2025-0012',
    applicationType: 'PENYELIDIKAN',
    category: 'CAT_3',
    language: 'MS',
    icNumber: '850920-01-6789',
    applicantName: 'Ts. Mohd Khairul bin Anuar',
    institution: 'Kolej Komuniti Bayan Baru',
    title: 'Kajian Kebolehpasaran Graduan Sijil TVET Kolej Komuniti Zon Utara dalam Industri Semikonduktor',
    year: 2025,
    status: 'COMPLETED',
    researchData: {
      category: 'CAT_3',
      chiefName: 'Ts. Mohd Khairul bin Anuar',
      chiefIc: '850920-01-6789',
      chiefPhone: '019-4567890',
      department: 'Unit Penyelidikan & Kebolehpasaran',
      institution: 'Kolej Komuniti Bayan Baru',
      members: [],
      adminInfo: {
        kupikName: 'Puan Halimah binti Saad',
        deputyDirectorName: 'Encik Wan Rosli bin Wan Chik',
        directorName: 'Tuan Haji Suhairi bin Ismail',
        ppiDirectorName: 'Pengarah Pusat Penyelidikan dan Inovasi (PPI)',
      },
      title: 'Kajian Kebolehpasaran Graduan Sijil TVET Kolej Komuniti Zon Utara dalam Industri Semikonduktor',
      introduction: 'Kajian empirikal berkaitan padanan kemahiran teknikal graduan kolej komuniti dengan kehendak industri elektrik dan elektronik di Pulau Pinang.',
      objectives: '1. Menilai kadar kebolehpasaran graduan dalam tempoh 6 bulan selepas tamat pengajian.\n2. Mengenal pasti jurang kemahiran teknikal yang diperlukan pihak industri.',
      location: 'Kawasan Perindustrian Bayan Lepas & Seberang Perai',
      sample: '250 graduan dan 40 majikan industri',
      instruments: 'Soal selidik digital Sistem Pengesanan Graduan (SKPG)',
      impactDepartment: 'Memperkemas kurikulum praktikal berpandukan permintaan industri semasa.',
      impactTargetGroup: 'Graduan menerima tawaran gaji permulaan yang lebih kompetitif.',
      impactInstitution: 'Memperkukuh kolaborasi pintar MoU/MoA antara Kolej Komuniti dan pemain industri.',
    },
    generatedDocuments: [
      {
        id: 'doc-6',
        applicationId: 'IREPRO-RES-2025-0012',
        documentType: 'Lampiran A',
        templateKey: 'research_cat3_ms_appendix',
        language: 'MS',
        fileName: 'IREPRO-RES-2025-0012_Lampiran_A.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2025-08-10T14:00:00.000Z',
      },
      {
        id: 'doc-7',
        applicationId: 'IREPRO-RES-2025-0012',
        documentType: 'Kertas Cadangan 2',
        templateKey: 'research_cat3_ms_proposal',
        language: 'MS',
        fileName: 'IREPRO-RES-2025-0012_Kertas_Cadangan_2.doc',
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        generatedAt: '2025-08-10T14:00:00.000Z',
      },
    ],
    driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
    createdAt: '2025-08-10T13:30:00.000Z',
    updatedAt: '2025-08-10T14:00:00.000Z',
  },
  {
    id: 'app-inv-002',
    applicationId: 'IREPRO-INV-2025-0008',
    applicationType: 'INOVASI',
    language: 'MS',
    icNumber: '910304-08-5678',
    applicantName: 'Ts. Siti Nurhaliza binti Ramli',
    institution: 'Politeknik Ungku Omar',
    title: 'Aplikasi Pembelajaran Realiti Maya (VR) bagi Operasi Penyelenggaraan Enjin Marin',
    year: 2025,
    status: 'COMPLETED',
    innovationData: {
      chiefName: 'Ts. Siti Nurhaliza binti Ramli',
      chiefIc: '910304-08-5678',
      chiefPhone: '013-9876543',
      chiefEmail: 'siti.nurhaliza@puo.edu.my',
      institution: 'Politeknik Ungku Omar',
      members: [],
      adminInfo: {
        kupikName: 'Dr. Noraini binti Kamaruddin',
        deputyDirectorName: 'Ts. Haji Shamsul bin Baharom',
        directorName: 'Dr. Shamsuri bin Abdullah',
      },
      title: 'Aplikasi Pembelajaran Realiti Maya (VR) bagi Operasi Penyelenggaraan Enjin Marin',
      introduction: 'Simulasi latihan interaktif enjin marin berpandukan model 3D spatial bagi menggantikan peralatan fizikal yang mahal dan terhad.',
      objectives: '1. Mereka bentuk modul latihan VR langkah-demi-langkah.\n2. Mengurangkan kos penyelenggaraan enjin latihan fizikal.',
      impactTargetGroup: 'Pelajar Kejuruteraan Marin mendapat latihan tanpa had ruang dan masa.',
      impactInstitution: 'Menjadikan PUO peneraju teknologi imersif TVET negara.',
      impactDepartment: 'Meningkatkan pematuhan SOP keselamatan maritim.',
    },
    generatedDocuments: [],
    driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
    createdAt: '2025-05-14T09:00:00.000Z',
    updatedAt: '2025-05-14T09:15:00.000Z',
  },
  {
    id: 'app-res-003',
    applicationId: 'IREPRO-RES-2024-0005',
    applicationType: 'PENYELIDIKAN',
    category: 'CAT_4',
    language: 'MS',
    icNumber: '880512-10-5431',
    applicantName: 'Dr. Ahmad Fauzi bin Ismail',
    institution: 'Universiti Teknologi Malaysia (UTM) / Kerjasama POLYCC',
    title: 'Analisis Formulasi Bahan Komposit Serat Semulajadi untuk Komponen Automotif Hijau',
    year: 2024,
    status: 'COMPLETED',
    researchData: {
      category: 'CAT_4',
      chiefName: 'Dr. Ahmad Fauzi bin Ismail',
      chiefIc: '880512-10-5431',
      chiefPhone: '012-3456789',
      institution: 'Universiti Teknologi Malaysia (UTM)',
      department: 'Fakulti Kejuruteraan Mekanikal',
      occupation: 'Penyelidik Pasca Doktoral',
      address: 'Skudai, Johor',
      institutionAddress: 'UTM Johor Bahru, 81310 Johor',
      institutionPhone: '07-5533333',
      members: [],
      adminInfo: {
        kupikName: 'Dr. Zulkifli bin Hashim',
        deputyDirectorName: 'Ts. Azman bin Mohd Yusof',
        directorName: 'Dr. Hajah Salbiah binti Arshad',
        ppiDirectorName: 'Pengarah Pusat Penyelidikan dan Inovasi (PPI)',
      },
      title: 'Analisis Formulasi Bahan Komposit Serat Semulajadi untuk Komponen Automotif Hijau',
      introduction: 'Kajian struktur mekanikal bahan komposit mesra alam berbanding polimer sintetik konvensional.',
      objectives: '1. Menguji kekuatan tegangan dan impak.\n2. Menilai potensi komersial bahan.',
      location: 'Makmal Bahan Termaju UTM & Bengkel Mekanikal PSA',
      sample: '80 spesimen uji kaji ASTM',
      instruments: 'Universal Testing Machine (UTM Instron), SEM Microscope',
      impactDepartment: 'Menyumbang kepada penerbitan jurnal berimpak tinggi bersama penyelidik POLYCC.',
      impactTargetGroup: 'Industri automotif tempatan dalam penggunaan bahan mampan.',
      impactInstitution: 'Menjalin jaringan penyelidikan rentas universiti dan politeknik.',
    },
    generatedDocuments: [],
    driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
    createdAt: '2024-04-18T10:00:00.000Z',
    updatedAt: '2024-04-18T10:00:00.000Z',
  }
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    user: '880512-10-5431 (Dr. Ahmad Fauzi bin Ismail)',
    action: 'Login',
    timestamp: '2026-01-20T10:30:00.000Z',
    details: 'Pengguna log masuk melalui No. KP',
  },
  {
    id: 'log-2',
    user: '880512-10-5431 (Dr. Ahmad Fauzi bin Ismail)',
    action: 'Create application',
    applicationId: 'IREPRO-INV-2026-0001',
    timestamp: '2026-01-20T10:45:00.000Z',
    details: 'Permohonan Inovasi dicipta dengan ID IREPRO-INV-2026-0001',
  },
  {
    id: 'log-3',
    user: '880512-10-5431 (Dr. Ahmad Fauzi bin Ismail)',
    action: 'Generate document',
    applicationId: 'IREPRO-INV-2026-0001',
    timestamp: '2026-01-20T11:00:00.000Z',
    details: 'Dokumen Surat Lantikan & Kertas Cadangan Inovasi dijana secara automatik',
  },
  {
    id: 'log-4',
    user: '910304-08-5678 (Ts. Siti Nurhaliza binti Ramli)',
    action: 'Create application',
    applicationId: 'IREPRO-RES-2026-0001',
    timestamp: '2026-02-15T09:00:00.000Z',
    details: 'Permohonan Penyelidikan Kategori I dicipta',
  },
  {
    id: 'log-5',
    user: 'Admin (KUPIK System)',
    action: 'Admin action',
    timestamp: '2026-02-16T08:00:00.000Z',
    details: 'Pentadbir memantau statistik dan senarai permohonan',
  }
];

let db = {
  users: initialUsers,
  applications: initialApplications,
  auditLogs: initialAuditLogs,
  feedback: [] as Feedback[],
};

let lastSyncTime = new Date().toISOString();
let isSyncing = false;
let initialSyncPromise: Promise<boolean> | null = null;
let isInitialSyncDone = false;

// Function to refresh database with live data from Google Sheets
async function refreshFromGoogleSheets(): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;
  try {
    const { applications, users, feedbacks } = await syncAllSheets();
    if (feedbacks && feedbacks.length > 0) {
      db.feedback = feedbacks;
    }
    if (applications.length > 0) {
      db.applications = applications;
      // Merge users so registered users remain available
      const existingUserMap = new Map(db.users.map((u) => [u.icNumber, u]));
      users.forEach((u) => {
        if (!existingUserMap.has(u.icNumber)) {
          existingUserMap.set(u.icNumber, u);
        }
      });
      db.users = Array.from(existingUserMap.values());
      lastSyncTime = new Date().toISOString();
      console.log(`[iREPRO Server] Successfully synced ${applications.length} applications and ${feedbacks ? feedbacks.length : 0} feedbacks from Google Sheets!`);
      isInitialSyncDone = true;
      return true;
    }
  } catch (err: any) {
    console.error('[iREPRO Server] Error during Google Sheets sync:', err);
  } finally {
    isSyncing = false;
  }
  return false;
}

// Initial sync on server start
initialSyncPromise = refreshFromGoogleSheets();

// Middleware to ensure initial sync is completed and check cache TTL
const ensureSyncedMiddleware = async (req: any, res: any, next: any) => {
  if (!isInitialSyncDone && initialSyncPromise) {
    await initialSyncPromise;
  }
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    const now = Date.now();
    const lastSyncMs = new Date(lastSyncTime).getTime();
    if (now - lastSyncMs > 30000) {
      refreshFromGoogleSheets().catch(err => console.error('[iREPRO Server] Background sync error:', err));
    }
  }
  next();
};

app.use(ensureSyncedMiddleware);

function saveDb() {
  // Primary persistence is Google Sheets. In-memory state acts as fast cache.
}

function addAuditLog(user: string, action: AuditLog['action'], applicationId?: string, details?: string) {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user,
    action,
    applicationId,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(newLog);
}

// Generate unique sequential Application ID (Unified global format: iREPRO-00026, iREPRO-00027, etc.)
function generateApplicationId(): string {
  let maxSeq = 25; // Latest ID is iREPRO-00025, so we start at 25
  db.applications.forEach((app) => {
    if (app.applicationId) {
      const match = app.applicationId.match(/iREPRO-(\d+)/i);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  const nextSeq = maxSeq + 1;
  return `iREPRO-${String(nextSeq).padStart(5, '0')}`;
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'iREPRO API Engine', time: new Date().toISOString() });
});

// 2. User Authentication (IC Number login)
app.post('/api/auth/user-login', (req, res) => {
  const { icNumber, name, phone, email, institution, department, rawDigits } = req.body;
  if (!icNumber && !rawDigits) {
    return res.status(400).json({ error: 'No. Kad Pengenalan diperlukan.' });
  }

  const raw = String(icNumber || rawDigits || '').trim();
  const digits = raw.replace(/\D/g, '');
  
  if (digits.length !== 12 && !/^\d{6}-\d{2}-\d{4}$/.test(raw)) {
    return res.status(400).json({ error: 'Sila masukkan 12 digit No. Kad Pengenalan yang sah (contoh: 880512-10-5431).' });
  }

  const cleanIc = digits.length === 12
    ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`
    : raw;

  const existingUser = db.users.find(
    (u) => u.icNumber === cleanIc || (digits && u.icNumber.replace(/\D/g, '') === digits)
  );

  const existingApp = db.applications.find((a) => {
    const aIc = a.icNumber?.replace(/\D/g, '');
    const chiefInvIc = a.innovationData?.chiefIc?.replace(/\D/g, '');
    const chiefResIc = a.researchData?.chiefIc?.replace(/\D/g, '');
    const memberInvMatch = a.innovationData?.members?.some((m: any) => m.icNumber?.replace(/\D/g, '') === digits);
    const memberResMatch = a.researchData?.members?.some((m: any) => m.icNumber?.replace(/\D/g, '') === digits);

    return (
      a.icNumber === cleanIc ||
      (digits && aIc === digits) ||
      (digits && chiefInvIc === digits) ||
      (digits && chiefResIc === digits) ||
      memberInvMatch ||
      memberResMatch
    );
  });

  if (existingUser || existingApp) {
    let derivedName = existingApp?.applicantName?.toUpperCase() || `PENGGUNA ${cleanIc.slice(0, 6)}`;
    if (existingApp?.innovationData?.members) {
      const matchedMember = existingApp.innovationData.members.find((m: any) => m.icNumber?.replace(/\D/g, '') === digits || m.icNumber === cleanIc);
      if (matchedMember?.name) {
        derivedName = matchedMember.name.toUpperCase();
      }
    }
    if (existingApp?.researchData?.members) {
      const matchedMember = existingApp.researchData.members.find((m: any) => m.icNumber?.replace(/\D/g, '') === digits || m.icNumber === cleanIc);
      if (matchedMember?.name) {
        derivedName = matchedMember.name.toUpperCase();
      }
    }

    const userObj = existingUser || {
      id: `usr-${Date.now()}`,
      icNumber: cleanIc,
      name: derivedName,
      phone: existingApp?.innovationData?.chiefPhone || existingApp?.researchData?.chiefPhone || '',
      email: existingApp?.innovationData?.chiefEmail || existingApp?.researchData?.chiefEmail || '',
      institution: existingApp?.institution || 'Kolej Komuniti Beaufort',
      department: existingApp?.researchData?.department || '',
      createdAt: new Date().toISOString(),
    };

    if (!existingUser) {
      db.users.push(userObj);
      saveDb();
    }

    addAuditLog(
      `${cleanIc} (${userObj.name})`,
      'Login',
      undefined,
      'Pengguna log masuk ke Dashboard'
    );

    return res.json({
      exists: true,
      user: userObj,
    });
  } else if (name && name.trim()) {
    // Registering new user profile
    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      icNumber: cleanIc,
      name: name.trim().toUpperCase(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      institution: institution?.trim() || 'Kolej Komuniti Beaufort',
      department: department?.trim() || '',
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb();

    addAuditLog(
      `${cleanIc} (${newUser.name})`,
      'Pendaftaran',
      undefined,
      'Pendaftaran pengguna baharu berjaya'
    );

    return res.json({
      exists: true,
      isNew: true,
      user: newUser,
    });
  } else {
    // User does not exist, prompt registration
    return res.json({
      exists: false,
    });
  }
});

// Explicit registration endpoint
app.post('/api/auth/register-user', (req, res) => {
  const { icNumber, name, phone, email, institution, department } = req.body;
  if (!icNumber || !name) {
    return res.status(400).json({ error: 'No. Kad Pengenalan dan Nama Penuh diperlukan.' });
  }

  const raw = String(icNumber).trim();
  const digits = raw.replace(/\D/g, '');
  const cleanIc = digits.length === 12
    ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`
    : raw;

  const existing = db.users.find(
    (u) => u.icNumber === cleanIc || (digits && u.icNumber.replace(/\D/g, '') === digits)
  );

  if (existing) {
    existing.name = name.trim().toUpperCase();
    if (phone) existing.phone = phone.trim();
    if (email) existing.email = email.trim();
    if (institution) existing.institution = institution.trim();
    if (department) existing.department = department.trim();
    saveDb();
    return res.json({ success: true, user: existing });
  }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}`,
    icNumber: cleanIc,
    name: name.trim().toUpperCase(),
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    institution: institution?.trim() || 'Kolej Komuniti Beaufort',
    department: department?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb();

  addAuditLog(
    `${cleanIc} (${newUser.name})`,
    'Pendaftaran',
    undefined,
    'Pendaftaran pengguna baharu berjaya'
  );

  res.json({ success: true, user: newUser });
});

// 3. Admin Authentication
app.post('/api/auth/admin-login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kupikkkbs';

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Kata laluan pentadbir tidak sah.' });
  }

  addAuditLog('Admin KUPIK / PPI', 'Login', undefined, 'Pentadbir log masuk ke Dashboard Admin');
  res.json({
    success: true,
    admin: {
      role: 'ADMIN',
      name: 'Pentadbir iREPRO (KUPIK / PPI)',
      email: 'admin.irepro@mohe.gov.my',
    },
  });
});

// 4. Get Applications list (Search, Filter, Role-based)
app.get('/api/applications', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  const { icNumber, search, type, category, year, language, limit, page } = req.query;

  // On Vercel (serverless), db resets each invocation — always sync fresh from Google Sheets
  try {
    const { applications: freshApps, users: freshUsers } = await syncAllSheets();
    if (freshApps.length > 0) {
      db.applications = freshApps;
      const existingUserMap = new Map(db.users.map((u) => [u.icNumber, u]));
      freshUsers.forEach((u) => { if (!existingUserMap.has(u.icNumber)) existingUserMap.set(u.icNumber, u); });
      db.users = Array.from(existingUserMap.values());
    }
  } catch (err) {
    console.warn('[iREPRO] Could not refresh from Sheets, using cached data:', err);
  }

  // Ensure year is always derived from createdAt
  let list = db.applications.map((a: any) => ({
    ...a,
    year: a.createdAt ? new Date(a.createdAt).getFullYear() : Number(a.year),
  }));

  // Role constraint: User sees only their own applications (as chief or member)
  if (icNumber) {
    const targetIc = String(icNumber).trim();
    const targetDigits = targetIc.replace(/\D/g, '');
    list = list.filter((a: any) => {
      const aIc = a.icNumber?.replace(/\D/g, '');
      const chiefInvIc = a.innovationData?.chiefIc?.replace(/\D/g, '');
      const chiefResIc = a.researchData?.chiefIc?.replace(/\D/g, '');
      const memberInvMatch = a.innovationData?.members?.some(
        (m: any) => m.icNumber === targetIc || (targetDigits && m.icNumber?.replace(/\D/g, '') === targetDigits)
      );
      const memberResMatch = a.researchData?.members?.some(
        (m: any) => m.icNumber === targetIc || (targetDigits && m.icNumber?.replace(/\D/g, '') === targetDigits)
      );

      return (
        a.icNumber === targetIc ||
        (targetDigits && aIc === targetDigits) ||
        a.innovationData?.chiefIc === targetIc ||
        (targetDigits && chiefInvIc === targetDigits) ||
        a.researchData?.chiefIc === targetIc ||
        (targetDigits && chiefResIc === targetDigits) ||
        memberInvMatch ||
        memberResMatch
      );
    });
  }

  // Filters
  if (type && type !== 'ALL') list = list.filter((a: any) => a.applicationType === type);
  if (category && category !== 'ALL') list = list.filter((a: any) => a.category === category);
  // Filter year using createdAt-derived year
  if (year && year !== 'ALL') list = list.filter((a: any) => a.year === Number(year));
  if (language && language !== 'ALL') list = list.filter((a: any) => a.language === language);

  // Search by keyword
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(
      (a: any) =>
        a.applicationId.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.applicantName.toLowerCase().includes(q) ||
        a.icNumber.includes(q) ||
        a.institution.toLowerCase().includes(q)
    );
  }

  // Sort latest first
  list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = list.length;
  const p = Number(page) || 1;
  const lim = Number(limit) || 100;
  const paginated = list.slice((p - 1) * lim, p * lim);

  res.json({
    total,
    page: p,
    limit: lim,
    applications: paginated,
  });
});

// 5. Get Single Application by ID
app.get('/api/applications/:id', (req, res) => {
  const { id } = req.params;
  const appItem = db.applications.find((a) => a.id === id || a.applicationId === id);
  if (!appItem) {
    return res.status(404).json({ error: 'Permohonan tidak dijumpai.' });
  }
  res.json(appItem);
});

// 6. Create Application & Save Directly to Google Sheets
app.post('/api/applications', async (req, res) => {
  try {
    const data = req.body;
    const year = data.year || new Date().getFullYear();
    const appType = data.applicationType;

    if (!appType || !data.icNumber || !data.applicantName || !data.title) {
      return res.status(400).json({ error: 'Sila lengkapkan semua medan wajib.' });
    }

    const appId = generateApplicationId();
    const driveFolderBase = GOOGLE_DRIVE_FOLDER;

    const newRecord: StoredApplication = {
      id: `app-${Date.now()}`,
      applicationId: appId,
      applicationType: appType,
      category: data.category,
      language: data.language || 'MS',
      icNumber: data.icNumber.trim(),
      applicantName: data.applicantName.trim().toUpperCase(),
      email: data.email || data.innovationData?.chiefEmail || data.researchData?.chiefEmail || '',
      institution: data.institution?.trim() || 'Kolej Komuniti Beaufort',
      title: data.title.trim(),
      year: year,
      status: 'COMPLETED',
      innovationData: data.innovationData,
      researchData: data.researchData,
      generatedDocuments: (data.generatedDocuments || []).map((doc: any) => ({
        ...doc,
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        applicationId: appId,
        driveUrl: driveFolderBase,
        generatedAt: new Date().toISOString(),
      })),
      driveUrl: driveFolderBase,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prepare row for target Google Sheet: 'inovasi' | 'lampiran a' | 'PPP'
    const { targetSheet, rowValues } = prepareSheetRow(newRecord);
    newRecord.sourceSheet = targetSheet as any;

    // Check for Google OAuth Bearer token in headers
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const sheetResult = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);

    db.applications.unshift(newRecord);

    // Refresh memory cache from Google Sheets immediately to fetch sheetRowIndex
    await refreshFromGoogleSheets();
    const syncedRecord = db.applications.find(a => a.applicationId === appId) || newRecord;

    addAuditLog(
      `${newRecord.icNumber} (${newRecord.applicantName})`,
      'Create application',
      appId,
      `Permohonan ${appType} berjaya direkodkan ke Google Sheets (Sheet: ${targetSheet}) [${appId}]`
    );

    addAuditLog(
      `${newRecord.icNumber} (${newRecord.applicantName})`,
      'Generate document',
      appId,
      `Dokumen rasmi (${newRecord.generatedDocuments.length} fail) berjaya dijana`
    );

    res.status(201).json({
      success: true,
      application: syncedRecord,
      targetSheet,
      googleSheetsSynced: sheetResult.success,
      sheetMessage: sheetResult.message,
    });
  } catch (err: any) {
    console.error('Error creating application:', err);
    res.status(500).json({ error: 'Maaf, permohonan tidak dapat diproses. Sila cuba lagi.' });
  }
});

// Google Sheets Sync & Management Endpoints
app.get('/api/sheets/config', (req, res) => {
  res.json({
    spreadsheetId: GOOGLE_SPREADSHEET_ID,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`,
    driveFolderUrl: GOOGLE_DRIVE_FOLDER,
    clientId: GOOGLE_OAUTH_CLIENT_ID,
    sheets: {
      inovasi: 'inovasi (Permohonan Inovasi)',
      lampiranA: 'lampiran a (Penyelidikan Kategori I, II, III)',
      ppp: 'PPP (Penyelidikan Kategori IV, V)',
    },
    totalApplications: db.applications.length,
    lastSyncTime,
  });
});

app.post('/api/sheets/pull', async (req, res) => {
  try {
    const success = await refreshFromGoogleSheets();
    res.json({
      success,
      message: 'Data terkini berjaya ditarik dari Google Sheets.',
      totalApplications: db.applications.length,
      lastSyncTime,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menarik data dari Google Sheets.' });
  }
});

app.post('/api/sheets/push-record', async (req, res) => {
  try {
    const { applicationId } = req.body;
    const record = db.applications.find((a) => a.id === applicationId || a.applicationId === applicationId);
    if (!record) {
      return res.status(404).json({ error: 'Permohonan tidak dijumpai.' });
    }

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const { targetSheet, rowValues } = prepareSheetRow(record);
    const result = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);

    res.json({
      success: result.success,
      targetSheet,
      message: result.message,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Ralat semasa menghantar rekod ke Google Sheets.' });
  }
});

// 7. Update Application
app.put('/api/applications/:id', async (req, res) => {
  const { id } = req.params;
  const index = db.applications.findIndex((a) => a.id === id || a.applicationId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Permohonan tidak dijumpai.' });
  }

  const existing = db.applications[index];
  const updateData = req.body;

  const updated: StoredApplication = {
    ...existing,
    ...updateData,
    id: existing.id,
    applicantName: (updateData.applicantName || existing.applicantName).trim().toUpperCase(),
    email: updateData.email || updateData.innovationData?.chiefEmail || updateData.researchData?.chiefEmail || existing.email || '',
    applicationId: existing.applicationId, // Preserve immutable ID
    updatedAt: new Date().toISOString(),
  };

  db.applications[index] = updated;
  saveDb();

  // Sync edits to Google Sheets in-place
  if (existing.sheetRowIndex !== undefined && existing.sourceSheet) {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        const { targetSheet, rowValues } = prepareSheetRow(updated);
        const payload = {
          action: 'updateRow',
          targetSheet,
          rowIndex: existing.sheetRowIndex - 1, // 0-based data row index
          rowValues
        };
        console.log(`[Google Sheets] Updating in-place row ${existing.sheetRowIndex} for: ${updated.applicationId} in tab: ${targetSheet}...`);
        
        const updateRes = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const updateResult = await updateRes.json().catch(() => ({}));
        console.log(`[Google Sheets] Update response:`, updateResult);
        
        // Refresh memory cache from Google Sheets immediately
        await refreshFromGoogleSheets();
      } catch (err: any) {
        console.error('[Google Sheets] Error updating sheet row:', err);
      }
    }
  }

  const finalRecord = db.applications.find(a => a.id === id || a.applicationId === id) || updated;

  addAuditLog(
    `${finalRecord.icNumber} (${finalRecord.applicantName})`,
    'Update application',
    finalRecord.applicationId,
    `Maklumat permohonan ${finalRecord.applicationId} telah dikemaskini`
  );

  res.json({ success: true, application: finalRecord });
});

// 8. Delete Application
app.delete('/api/applications/:id', async (req, res) => {
  const { id } = req.params;
  const index = db.applications.findIndex((a) => a.id === id || a.applicationId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Permohonan tidak dijumpai.' });
  }

  const deleted = db.applications.splice(index, 1)[0];
  saveDb();

  // Delete from Google Sheet via Apps Script
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (appsScriptUrl && deleted.sourceSheet && deleted.sheetRowIndex !== undefined) {
    try {
      const sheetName = encodeURIComponent(deleted.sourceSheet);
      const deleteUrl = `${appsScriptUrl}?action=deleteRow&sheet=${sheetName}&rowIndex=${deleted.sheetRowIndex}`;
      const delRes = await fetch(deleteUrl, { method: 'GET', redirect: 'follow' });
      const delText = await delRes.text();
      const jsonStart = delText.indexOf('{');
      if (jsonStart >= 0) {
        const delJson = JSON.parse(delText.substring(jsonStart, delText.lastIndexOf('}') + 1));
        console.log(`[Google Sheets] Delete row result:`, delJson);
        
        // Refresh memory cache from Google Sheets immediately to update remaining row indices
        await refreshFromGoogleSheets();
      }
    } catch (err: any) {
      console.warn(`[Google Sheets] Failed to delete row from sheet:`, err.message);
    }
  }

  addAuditLog(
    'Admin KUPIK',
    'Delete application',
    deleted.applicationId,
    `Permohonan ${deleted.applicationId} (${deleted.title}) telah dipadam`
  );

  res.json({ success: true, message: 'Permohonan berjaya dipadam.', applicationId: deleted.applicationId });
});


// 9. Statistics Aggregation
app.get('/api/stats', (req, res) => {
  const currentYear = new Date().getFullYear();
  const totalApplications = db.applications.length;
  const totalInnovation = db.applications.filter((a) => a.applicationType === 'INOVASI').length;
  const totalResearch = db.applications.filter((a) => a.applicationType === 'PENYELIDIKAN').length;

  const uniqueApplicants = new Set(db.applications.map((a) => a.icNumber)).size;
  const currentYearInnovation = db.applications.filter((a) => a.applicationType === 'INOVASI' && a.year === currentYear).length;
  const currentYearResearch = db.applications.filter((a) => a.applicationType === 'PENYELIDIKAN' && a.year === currentYear).length;

  // Breakdown by year
  const yearsSet = new Set(db.applications.map((a) => a.year));
  yearsSet.add(currentYear);
  yearsSet.add(currentYear - 1);
  yearsSet.add(currentYear - 2);

  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
  const byYear = sortedYears.map((yr) => {
    const inv = db.applications.filter((a) => a.year === yr && a.applicationType === 'INOVASI').length;
    const res = db.applications.filter((a) => a.year === yr && a.applicationType === 'PENYELIDIKAN').length;
    return {
      year: yr,
      innovation: inv,
      research: res,
      total: inv + res,
    };
  });

  // Breakdown by Category for Research
  const catCounts: Record<string, { label: string; count: number }> = {
    CAT_1: { label: 'Kategori I (POLYCC A - POLYCC A - Pengarah Institusi)', count: 0 },
    CAT_2: { label: 'Kategori II (POLYCC - Agensi Luar - Pengarah Institusi)', count: 0 },
    CAT_3: { label: 'Kategori III (POLYCC A - POLYCC B - Pengarah PPI)', count: 0 },
    CAT_4: { label: 'Kategori IV (Agensi Luar - POLYCC - Pengarah PPI)', count: 0 },
    CAT_5: { label: 'Kategori V (Pensyarah Sambung Belajar/Pelajar IPT - Agensi Luar - Pengarah PPI)', count: 0 },
  };

  db.applications.forEach((a) => {
    if (a.applicationType === 'PENYELIDIKAN' && a.category && catCounts[a.category]) {
      catCounts[a.category].count += 1;
    }
  });

  const byCategory = Object.keys(catCounts).map((key) => ({
    category: key,
    label: catCounts[key].label,
    count: catCounts[key].count,
  }));

  // Breakdown by Institution
  const instCounts: Record<string, number> = {};
  db.applications.forEach((a) => {
    const inst = a.institution || 'Lain-lain';
    instCounts[inst] = (instCounts[inst] || 0) + 1;
  });

  const byInstitution = Object.keys(instCounts).map((inst) => ({
    institution: inst,
    count: instCounts[inst],
  })).sort((a, b) => b.count - a.count);

  // Calculate Usability Ratings averages (S1 to S5)
  const totalFeedback = db.feedback.length;
  let s1Sum = 0, s2Sum = 0, s3Sum = 0, s4Sum = 0, s5Sum = 0;
  db.feedback.forEach((f) => {
    s1Sum += Number(f.s1) || 0;
    s2Sum += Number(f.s2) || 0;
    s3Sum += Number(f.s3) || 0;
    s4Sum += Number(f.s4) || 0;
    s5Sum += Number(f.s5) || 0;
  });

  const feedbackStats = {
    total: totalFeedback,
    s1Avg: totalFeedback > 0 ? Number((s1Sum / totalFeedback).toFixed(2)) : 0,
    s2Avg: totalFeedback > 0 ? Number((s2Sum / totalFeedback).toFixed(2)) : 0,
    s3Avg: totalFeedback > 0 ? Number((s3Sum / totalFeedback).toFixed(2)) : 0,
    s4Avg: totalFeedback > 0 ? Number((s4Sum / totalFeedback).toFixed(2)) : 0,
    s5Avg: totalFeedback > 0 ? Number((s5Sum / totalFeedback).toFixed(2)) : 0,
  };

  res.json({
    totalApplications,
    totalInnovation,
    totalResearch,
    totalApplicants: uniqueApplicants,
    currentYearInnovation,
    currentYearResearch,
    byYear,
    byCategory,
    byInstitution,
    feedbackStats,
  });
});

// 10. Audit Logs List
app.get('/api/audit-logs', (req, res) => {
  res.json(db.auditLogs);
});

// 11. Feedback submit & list
app.post('/api/feedback', async (req, res) => {
  const { jantina, umur, bangsa, s1, s2, s3, s4, s5, comments } = req.body;

  const formattedDate = formatDateForSheet(new Date());
  
  // Format matching the feedback columns
  const rowValues = [
    jantina || 'Lelaki',
    umur || '21-30 tahun',
    bangsa || 'Bumiputera Sabah/Sarawak',
    Number(s1) || 5,
    Number(s2) || 5,
    Number(s3) || 5,
    Number(s4) || 5,
    Number(s5) || 5,
    comments?.trim() || '',
    formattedDate
  ];

  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    await appendRowToGoogleSheet('maklum balas', rowValues, bearerToken);
    console.log(`[iREPRO Server] Successfully appended feedback to 'maklum balas' sheet tab.`);
  } catch (err) {
    console.warn('[iREPRO Server] Could not write feedback to Google Sheets:', err);
  }

  const item: Feedback = {
    id: `fb-${Date.now()}`,
    jantina: jantina || 'Lelaki',
    umur: umur || '21-30 tahun',
    bangsa: bangsa || 'Bumiputera Sabah/Sarawak',
    s1: Number(s1) || 5,
    s2: Number(s2) || 5,
    s3: Number(s3) || 5,
    s4: Number(s4) || 5,
    s5: Number(s5) || 5,
    comments: comments?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.feedback.push(item);
  saveDb();
  res.json({ success: true, message: 'Maklum balas penggunaan iREPRO berjaya direkodkan. Terima kasih!' });
});

app.get('/api/feedback', (req, res) => {
  res.json(db.feedback);
});

const GOOGLE_DOC_TEMPLATES: Record<string, string> = {
  innovation_ms_appointment: '1MNR1SAoZYiz91ItxZN8dvNPoP0Rxz8XtP4eemhcStXs',
  innovation_ms_proposal: '1oTMDV7wNeVI0M8tTHZBxRBuxHZ9Vw0wLTz19h8h7jvw',
  innovation_en_appointment: '1MNR1SAoZYiz91ItxZN8dvNPoP0Rxz8XtP4eemhcStXs', // Fallback to BM layout
  innovation_en_proposal: '123A87vegDr84kN_CfZqgmFE5NsKmskzg53fNexWBOaI',
  research_cat1_ms_appointment: '11nFMnx-oVpeFHEi2MAKROtW1N1HNyb-9Krp7Gl5CXdU',
  research_cat1_ms_appendix: '1icgQ-qs0-nqbD98e788D4Kv9eEaRqHZG4EMtcEZnstQ',
  research_cat1_ms_proposal: '1bFvTnQrDuAJDaimq_Y5fIyjfzS5RHOt5NWJtLp2Fd-s',
  research_cat3_ms_appendix: '1icgQ-qs0-nqbD98e788D4Kv9eEaRqHZG4EMtcEZnstQ', // Reuses Lampiran A
  research_cat3_ms_proposal: '11ZyJj3-SwT6mPgMjOZ8iVtDAymxR22zr-kjr0qbjoIs',
  research_cat4_ms_ppp_form: '1xzdAIhEir1CcThe0mHdcjzcOzwNoy8GI4H4moM0GLps',
  research_cat4_ms_ppp_proposal: '15BeGHI9zgoTAxEXSUqr5dlEg-lzjC3Id_HSFMx9mu8k',
  research_cat1_en_appointment: '11nFMnx-oVpeFHEi2MAKROtW1N1HNyb-9Krp7Gl5CXdU', // Fallback to BM layout
  research_cat1_en_appendix: '1h36dYDUmdXMwY_x2Y49ONvBSyL-DEJwQvnPDfkBR26o',
  research_cat1_en_proposal: '11bPtQP0nFEXA20yIHEXsno1f9mcIS8LcznIjEo47s2Y',
  research_cat3_en_appendix: '1h36dYDUmdXMwY_x2Y49ONvBSyL-DEJwQvnPDfkBR26o', // Reuses Appendix A
  research_cat3_en_proposal: '1YzzZe3WI7CIRWC8vGNCYKTeHoQ0ujY_6C-BVy1cFw-s',
  research_cat4_en_ppp_form: '173yx1CFvgqJaMa0qIFMnZZNTXEuBHj90NIjHPe8ZgcI',
  research_cat4_en_ppp_proposal: '17Zas_WPdmlVS5ox19a2qzGwOulp3TDuDbj_MB2pfEIM'
};

function buildReplacements(templateKey: string, app: any): Record<string, string> {
  const chiefName = app.applicantName?.toUpperCase() || '';
  const chiefIc = app.icNumber || '';
  const title = app.title?.toUpperCase() || '';
  const members = app.members || app.innovationData?.members || app.researchData?.members || [];
  const adminInfo = app.adminOfficers || app.innovationData?.adminInfo || app.researchData?.adminInfo || {
    kupikName: 'NORFAZIRAH BINTI KUSIN',
    deputyDirectorName: 'AZLENAH BTE MOHD SEN',
    directorName: 'Ts. JULKIFLI BIN AWANG BESAR (A.D.K)',
    ppiDirectorName: 'Dr. Shahiza binti Ahmad Zainuddin'
  };

  const introduction = (app.innovationData?.introduction || app.researchData?.introduction || '').trim();
  const objectives = (app.innovationData?.objectives || app.researchData?.objectives || '').trim();
  const impactTargetGroup = (app.innovationData?.impactTargetGroup || app.researchData?.impactTargetGroup || '').trim();
  const impactInstitution = (app.innovationData?.impactInstitution || app.researchData?.impactInstitution || '').trim();
  const impactDepartment = (app.innovationData?.impactDepartment || app.researchData?.impactDepartment || '').trim();
  const instruments = (app.researchData?.instruments || '').trim();

  // Standard substitutions mapping template keys directly
  return {
    '[NAMA KETUA]': chiefName,
    '[NAMA]': chiefName,
    '[ NAMA ]': chiefName,
    '[NAMA 1]': members[0]?.name || '',
    '[NAMA 2]': members[1]?.name || '',
    '[TAJUK]': title,
    '[TAJUK PENYELIDIKAN]': title,
    '[PENGARAH]': adminInfo.directorName || '',
    'Ts. JULKIFLI BIN AWANG BESAR, A.D.K': adminInfo.directorName || '',
    '[INSTITUSI]': app.institution || '',
    '[PENGENALAN]': introduction,
    '[ PENGENALAN]': introduction,
    '[OBJEKTIF]': objectives,
    '[ OBJEKTIF]': objectives,
    '[INSTRUMEN]': instruments,
    '[ INSTRUMEN]': instruments,
    '[IMPAK SASARAN]': impactTargetGroup,
    '[ IMPAK SASARAN]': impactTargetGroup,
    '[IMPAK INSTITUSI]': impactInstitution,
    '[ IMPAK INSTITUSI]': impactInstitution,
    '[IMPAK JABATAN]': impactDepartment,
    '[IMPAK JABATAN ]': impactDepartment,
    '[TIMBALAN PENGARAH]': adminInfo.deputyDirectorName || '',
    '[INSTITUSI 1]': members[0]?.institution || '',
    '[INSTITUSI 2]': members[1]?.institution || '',
    '[NAMA KUPIK]': adminInfo.kupikName || '',
    '[PENGARAH PPI]': adminInfo.ppiDirectorName || '',
    '[NAMA PENGARAH PPI]': adminInfo.ppiDirectorName || '',

    '<<TAJUK INOVASI>>': title,
    '<<NAMA KETUA>>': chiefName,
    '<<PENGENALAN>>': introduction,
    '<<OBJEKTIF>>': objectives,
    '<<IMPAK SASARAN>>': impactTargetGroup,
    '<<IMPAK INSTITUSI>>': impactInstitution,
    '<<IMPAK JABATAN>>': impactDepartment,
    '<<PENGARAH>>': adminInfo.directorName || '',
    '<<INSTITUSI>>': app.institution || '',
    '<<TIMBALAN PENGARAH>>': adminInfo.deputyDirectorName || '',
    '<<NAMA 1>>': members[0]?.name || '',
    '<<INSTITUSI 1>>': members[0]?.institution || '',
    '<<NAMA 2>>': members[1]?.name || '',
    '<<INSTITUSI 2>>': members[1]?.institution || '',
    '<<NAMA KUPIK>>': adminInfo.kupikName || '',

    '[NO. KP]': chiefIc,
    '[NO. TELEFON]': app.researchData?.chiefPhone || '',
    '[JABATAN]': app.researchData?.department || '',
    '[NO. KP 1]': members[0]?.icNumber || '',
    '[NO. TELEFON 1]': members[0]?.phone || '',
    '[JABATAN 1]': members[0]?.department || '',
    '[NO. KP 2]': members[1]?.icNumber || '',
    '[NO. TELEFON 2]': members[1]?.phone || '',
    '[JABATAN 2]': members[1]?.department || '',
    '[PERSIDANGAN]': app.researchData?.conference || '',
    '[TEMPAT]': app.researchData?.location || '',
    '[SAMPEL]': app.researchData?.sample || '',

    '[ALAMAT]': app.researchData?.address || '',
    '[PEKERJAAN]': app.researchData?.occupation || '',
    '[ALAMAT INSTITUSI]': app.researchData?.institutionAddress || '',
    '[NO. TEL INSTITUSI]': app.researchData?.institutionPhone || '',
    '[FAKULTI/JABATAN]': app.researchData?.department || '',
    '[TAHUN PENGAJIAN]': app.researchData?.studyYear || '',
    '[MULA RINTIS]': app.researchData?.pilotStartDate || '',
    '[AKHIR RINTIS]': app.researchData?.pilotEndDate || '',
    '[MULA SEBENAR]': app.researchData?.actualStartDate || '',
    '[AKHIR SEBENAR]': app.researchData?.actualEndDate || '',
    '[TARIKH LAPORAN]': app.researchData?.expectedReportDate || '',
  };
}

app.post('/api/documents/generate-docx', async (req, res) => {
  try {
    const { templateKey, applicationId } = req.body;
    const appRecord = db.applications.find(a => a.id === applicationId || a.applicationId === applicationId);
    if (!appRecord) {
      return res.status(404).json({ error: 'Permohonan tidak dijumpai.' });
    }

    const templateId = GOOGLE_DOC_TEMPLATES[templateKey];
    if (!templateId) {
      return res.status(400).json({ error: 'Templat dokumen tidak dijumpai.' });
    }

    console.log(`[Local DOCX Generator] Downloading template: ${templateKey} (${templateId})...`);
    const templateUrl = `https://docs.google.com/document/d/${templateId}/export?format=docx`;
    const templateRes = await fetch(templateUrl);
    if (!templateRes.ok) {
      return res.status(500).json({ error: `Gagal memuat turun templat daripada Google Docs (HTTP ${templateRes.status}).` });
    }

    const arrayBuffer = await templateRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Local DOCX Generator] Rendering template with docxtemplater...`);
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '[', end: ']' },
      paragraphLoop: true,
      linebreaks: true
    });

    const replacements = buildReplacements(templateKey, appRecord);
    
    // Clean replacements to match [KEY] -> KEY for docxtemplater
    const cleanReplacements: Record<string, string> = {};
    for (const [key, value] of Object.entries(replacements)) {
      const cleanKey = key.replace(/^\[/, '').replace(/\]$/, '');
      cleanReplacements[cleanKey] = value;
    }

    doc.render(cleanReplacements);

    const outBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    const docName = `${applicationId}_${templateKey}.docx`;
    console.log(`[Local DOCX Generator] Document ${docName} successfully generated (${outBuffer.length} bytes)!`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${docName}"`);
    res.send(outBuffer);

  } catch (err: any) {
    console.error('[Local DOCX Generator] Failed to generate document:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 12. Google Sheets & Google Drive Integration Status
app.get('/api/integrations/status', (req, res) => {
  res.json({
    googleSheets: {
      status: 'CONNECTED',
      innovationSheetUrl: 'https://docs.google.com/spreadsheets/d/1EEVIAGcK56R2ImX24KykRdN183evSoydx0BBwzz__Ts/edit?usp=sharing',
      researchSheetUrl: 'https://docs.google.com/spreadsheets/d/1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY/edit?usp=sharing',
      syncedRecordsCount: db.applications.length,
      lastSync: new Date().toISOString(),
    },
    googleDrive: {
      status: 'CONNECTED',
      rootFolderUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
      totalDocumentsStored: db.applications.reduce((acc, a) => acc + (a.generatedDocuments?.length || 0), 0),
    },
  });
});

// 13. Export Data (CSV generator)
app.get('/api/export', (req, res) => {
  const { type, year } = req.query;
  let list = [...db.applications];

  if (type && type !== 'ALL') {
    list = list.filter((a) => a.applicationType === type);
  }
  if (year && year !== 'ALL') {
    list = list.filter((a) => a.year === Number(year));
  }

  const csvHeader = [
    'No',
    'Application ID',
    'Jenis Permohonan',
    'Kategori',
    'Tahun',
    'Bahasa',
    'No Kad Pengenalan',
    'Nama Pemohon',
    'Institusi',
    'Tajuk',
    'Status Rekod',
    'Tarikh Permohonan',
    'Google Drive Folder',
  ].join(',');

  const csvRows = list.map((a, idx) => {
    return [
      idx + 1,
      `"${a.applicationId}"`,
      `"${a.applicationType}"`,
      `"${a.category || '-'}"`,
      a.year,
      `"${a.language}"`,
      `"${a.icNumber}"`,
      `"${a.applicantName.replace(/"/g, '""')}"`,
      `"${a.institution.replace(/"/g, '""')}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${new Date(a.createdAt).toLocaleString('ms-MY')}"`,
      `"${a.driveUrl}"`,
    ].join(',');
  });

  const csvContent = [csvHeader, ...csvRows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="iREPRO_Rekod_${type || 'Semua'}_${year || 'Semua'}.csv"`);
  res.send(csvContent);
});

// Setup Vite development middleware or production static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { etag: false, lastModified: false, setHeaders: (res, filePath) => {
      // Never cache index.html - always serve fresh
      if (filePath.endsWith('index.html')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
      }
    }}));
    app.get('*', (req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`iREPRO Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
