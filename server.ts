import express from 'express';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const wsTransport = typeof WebSocket === 'function' ? WebSocket : (WebSocket as any)?.default || (WebSocket as any)?.WebSocket;
import {
  GOOGLE_SPREADSHEET_ID,
  GOOGLE_DRIVE_FOLDER,
  GOOGLE_OAUTH_CLIENT_ID,
  syncAllSheets,
  prepareSheetRow,
  appendRowToGoogleSheet,
  formatIc,
  formatDateForSheet,
  parseSheetDate,
} from './server/googleSheets.ts';

// Load env variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://leshuihnieeehmhyxkvz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlc2h1aWhuaWVlZWhtaHl4a3Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzgyNTkzOSwiZXhwIjoyMTAzNDAxOTM5fQ.oXARsks1k2FzON4b2Pl87v6zD66Cs7mPl_g7WDL_zN8';

if (!supabaseUrl || !supabaseKey) {
  console.warn('CRITICAL WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Vercel serverless request path normalizer:
// If request arrives at /api/server.ts or is stripped of /api prefix, normalize it so all /api/* routes match
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.startsWith('/favicon') && !req.url.startsWith('/@')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

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
  action: 'Login' | 'Pendaftaran' | 'Create application' | 'Update application' | 'Generate document' | 'Delete application' | 'Admin action' | 'Backup' | 'Update profile';
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
    id: 'usr-0001',
    icNumber: '850101-12-5555',
    name: 'SHAMSUDDIN BIN AMIN',
    phone: '019-8765432',
    email: 'shamsuddin@kkbf.edu.my',
    institution: 'Kolej Komuniti Beaufort',
    department: 'Unit Penyelidikan & Inovasi',
    createdAt: '2025-01-01T08:30:00.000Z',
  },
  {
    id: 'usr-0002',
    icNumber: '900202-12-6666',
    name: 'REZIELLA BINTI LAHAJI',
    phone: '018-7654321',
    email: 'reziella@kkbf.edu.my',
    institution: 'Kolej Komuniti Beaufort',
    department: 'Unit Penyelidikan & Inovasi',
    createdAt: '2025-01-02T10:00:00.000Z',
  },
  {
    id: 'usr-0003',
    icNumber: '880303-12-7777',
    name: 'NORFAZIRAH BINTI KUSIN',
    phone: '017-6543210',
    email: 'norfazirah@kkbf.edu.my',
    institution: 'Kolej Komuniti Beaufort',
    department: 'Unit Penyelidikan & Inovasi',
    createdAt: '2025-01-03T09:15:00.000Z',
  },
];

function formatUserId(u: { name?: string; icNumber?: string; id?: string }, index?: number): string {
  if (u.id && /^usr-\d{4}$/.test(u.id)) return u.id;
  if (index !== undefined) return `usr-${String(index + 1).padStart(4, '0')}`;

  const existingNums = db.users
    .map(user => user.id)
    .filter(id => /^usr-\d{4}$/.test(id))
    .map(id => parseInt(id.replace('usr-', ''), 10));
  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
  return `usr-${String(maxNum + 1).padStart(4, '0')}`;
}

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

let lastSyncTime = '1970-01-01T00:00:00.000Z';
let activeSyncPromise: Promise<boolean> | null = null;
let initialSyncPromise: Promise<boolean> | null = null;
let isInitialSyncDone = false;

// Function to refresh database with live data from Supabase
async function refreshFromSupabase(): Promise<boolean> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      const { data: users, error: userError } = await supabase.from('users').select('*');
      if (userError) throw userError;

      const { data: applications, error: appError } = await supabase.from('applications').select('*');
      if (appError) throw appError;

      const { data: feedbacks, error: fbError } = await supabase.from('feedback').select('*');
      if (fbError) throw fbError;

      const { data: auditLogs, error: logError } = await supabase.from('audit_logs').select('*');
      if (logError) throw logError;

      const formattedUsers = (users || []).map((u, idx) => ({
        ...u,
        id: formatUserId(u, idx)
      }));
      db.users = formattedUsers;

      // Automatically sync formatted usr-XXXX IDs back to Supabase database
      const usersNeedingSync = formattedUsers.filter((fUser, idx) => {
        const orig = (users || [])[idx];
        return !orig || orig.id !== fUser.id;
      });

      if (usersNeedingSync.length > 0) {
        supabase.from('users').upsert(usersNeedingSync, { onConflict: 'icNumber' }).then(({ error }) => {
          if (error) console.error('[Supabase Auto-Sync Error]:', error);
          else console.log(`[Supabase Auto-Sync Success] Synchronized ${usersNeedingSync.length} user IDs to format usr-XXXX in Supabase.`);
        });
      }

      db.applications = (applications || []).map(a => ({
        ...a,
        generatedDocuments: a.generatedDocuments || [],
        innovationData: a.innovationData || null,
        researchData: a.researchData || null
      }));
      db.feedback = feedbacks || [];
      db.auditLogs = auditLogs || [];

      lastSyncTime = new Date().toISOString();
      console.log(`[iREPRO Server] Successfully synced cache from Supabase! Users: ${db.users.length}, Apps: ${db.applications.length}, Feedback: ${db.feedback.length}`);
      isInitialSyncDone = true;
      return true;
    } catch (err: any) {
      console.error('[iREPRO Server] Error during Supabase sync:', err);
      return false;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

// Initial sync on server start
initialSyncPromise = refreshFromSupabase();

const ensureSyncedMiddleware = async (req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/health') {
    const now = Date.now();
    const lastSyncMs = new Date(lastSyncTime).getTime();
    
    // Trigger refresh only if the cache is older than 10 seconds or initial sync is not complete
    if (now - lastSyncMs > 10000 || !isInitialSyncDone) {
      try {
        await refreshFromSupabase();
      } catch (err) {
        console.error('[iREPRO Server] ensureSyncedMiddleware error:', err);
      }
    }
  }
  next();
};

app.use(ensureSyncedMiddleware);

function saveDb() {
  // Persistence is handled by Supabase
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

  // Write to Supabase asynchronously in the background
  supabase.from('audit_logs').insert({
    id: newLog.id,
    user: newLog.user,
    action: newLog.action,
    applicationId: newLog.applicationId || null,
    details: newLog.details || null,
    timestamp: newLog.timestamp
  }).then(({ error }) => {
    if (error) console.error('[Supabase] Failed to write audit log:', error);
  });
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

// 1. Health check & Keep-alive endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'iREPRO API Engine', time: new Date().toISOString() });
});

// Keep-alive ping endpoint to prevent Supabase 7-day inactivity pause
app.get('/api/keepalive', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    res.json({
      status: 'ok',
      message: 'Supabase database keep-alive ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Supabase Keepalive Error]:', err);
    res.status(500).json({ error: err?.message || 'Keepalive ping failed' });
  }
});


// 2. User Authentication (Email login)
app.post('/api/auth/user-login', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Alamat emel diperlukan.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Sila masukkan alamat emel yang sah (contoh: pengguna@test.com).' });
  }

  // Ensure fresh sync from Supabase so login from any device retrieves latest profile
  try {
    await refreshFromSupabase();
  } catch (err) {
    console.warn('[iREPRO] refreshFromSupabase failed in user-login:', err);
  }

  const existingUser = db.users.find(
    (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
  );

  if (existingUser) {
    addAuditLog(
      `${existingUser.icNumber || 'TIADA-IC'} (${existingUser.name})`,
      'Login',
      undefined,
      'Pengguna log masuk ke Dashboard (Emel)'
    );

    return res.json({
      exists: true,
      user: existingUser,
    });
  } else {
    // User does not exist in users database, prompt registration (Step 2)
    return res.json({
      exists: false,
    });
  }
});

// Explicit registration endpoint
app.post('/api/auth/register-user', async (req, res) => {
  const { icNumber, name, phone, email, institution, department, overwrite } = req.body;
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
    const existingEmail = (existing.email || '').trim().toLowerCase();
    const newEmail = String(email || '').trim().toLowerCase();
    
    if (existingEmail !== newEmail) {
      if (!overwrite) {
        return res.status(409).json({
          error: 'DUPLICATE_IC',
          message: 'No Kad Pengenalan anda telah wujud, adakah anda pasti untuk mengemaskini emel baharu anda?'
        });
      }
    }

    // Update details
    existing.name = name.trim().toUpperCase();
    if (phone) existing.phone = phone.trim();
    if (email) existing.email = email.trim();
    if (institution) existing.institution = institution.trim().toUpperCase();
    if (department) existing.department = department.trim();
    
    const { error: updateError } = await supabase.from('users').upsert(existing, { onConflict: 'icNumber' });
    if (updateError) {
      console.error('[Supabase] Error updating user:', updateError);
      return res.status(500).json({ error: 'Gagal mengemaskini pengguna di database.' });
    }
    
    addAuditLog(
      `${cleanIc} (${existing.name})`,
      'Pendaftaran',
      undefined,
      `Kemaskini emel & maklumat pengguna sedia ada (Emel baru: ${existing.email})`
    );

    return res.json({ success: true, user: existing });
  }

  const newUser: StoredUser = {
    id: formatUserId({ name, icNumber: cleanIc }),
    icNumber: cleanIc,
    name: name.trim().toUpperCase(),
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    institution: institution?.trim().toUpperCase() || 'KOLEJ KOMUNITI BEAUFORT',
    department: department?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  
  const { error: insertError } = await supabase.from('users').insert(newUser);
  if (insertError) {
    console.error('[Supabase] Error registering user:', insertError);
    return res.status(500).json({ error: 'Gagal mendaftar pengguna ke database.' });
  }

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

// Explicit user profile update endpoint
app.put(['/api/auth/update-profile', '/auth/update-profile', '/update-profile'], async (req, res) => {
  const { id, icNumber, name, phone, institution } = req.body;
  
  const rawIc = String(icNumber || id || '').trim();
  const digits = rawIc.replace(/\D/g, '');
  const cleanIc = digits.length === 12
    ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`
    : rawIc;

  if (!cleanIc && !id) {
    return res.status(400).json({ error: 'ID Pengguna atau No. Kad Pengenalan diperlukan.' });
  }

  // Sync cache from Supabase
  try {
    await refreshFromSupabase();
  } catch (err) {
    console.warn('[iREPRO] refreshFromSupabase failed in update-profile:', err);
  }

  // 1. Try finding in memory cache
  let existing = db.users.find(
    (u) =>
      u.id === id ||
      u.icNumber === cleanIc ||
      u.icNumber === icNumber ||
      (digits && u.icNumber?.replace(/\D/g, '') === digits)
  );

  // 2. If not found in memory cache, query Supabase directly by icNumber
  if (!existing && cleanIc) {
    try {
      const { data: supaUsers } = await supabase
        .from('users')
        .select('*')
        .eq('icNumber', cleanIc);
      if (supaUsers && supaUsers.length > 0) {
        existing = supaUsers[0];
      }
    } catch (e) {
      console.error('[Supabase] Direct query failed:', e);
    }
  }

  // 3. Construct updated user object (update existing or create new record for Supabase)
  const updatedUser: StoredUser = {
    id: formatUserId({ name: name || existing?.name, icNumber: existing?.icNumber || cleanIc || rawIc, id: existing?.id || id }),
    icNumber: existing?.icNumber || cleanIc || rawIc,
    name: (name || existing?.name || '').trim().toUpperCase(),
    phone: phone ? phone.trim() : (existing?.phone || ''),
    email: existing?.email || '',
    institution: (institution || existing?.institution || '').trim().toUpperCase(),
    department: existing?.department || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  // Upsert to Supabase
  const { error: upsertError } = await supabase
    .from('users')
    .upsert(updatedUser, { onConflict: 'icNumber' });

  if (upsertError) {
    console.error('[Supabase] Error saving user profile:', upsertError);
    const { error: idUpsertError } = await supabase
      .from('users')
      .upsert(updatedUser);

    if (idUpsertError) {
      console.error('[Supabase] Fallback upsert failed:', idUpsertError);
      return res.status(500).json({ error: 'Gagal mengemaskini profil di pangkalan data Supabase.' });
    }
  }

  // Update in-memory db cache
  const idx = db.users.findIndex((u) => u.icNumber === updatedUser.icNumber || u.id === updatedUser.id);
  if (idx >= 0) {
    db.users[idx] = updatedUser;
  } else {
    db.users.push(updatedUser);
  }

  addAuditLog(
    `${updatedUser.icNumber} (${updatedUser.name})`,
    'Update profile',
    undefined,
    'Kemaskini maklumat profil pengguna ke Supabase'
  );

  return res.json({ success: true, user: updatedUser, message: 'Profil pengguna berjaya dikemaskini!' });
});

// Get all users list (Admin)
app.get('/api/users', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    await refreshFromSupabase();
  } catch (e) {}
  res.json({ users: db.users });
});

// Delete user by ID (Admin)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = db.users.find(u => u.id === id || u.icNumber === id);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemui.' });
  }

  db.users = db.users.filter(u => u.id !== id && u.icNumber !== id);

  const { error } = await supabase.from('users').delete().or(`id.eq.${id},icNumber.eq.${user.icNumber}`);
  if (error) {
    console.error('[Supabase] Error deleting user:', error);
  }

  addAuditLog('ADMIN', 'Admin action', undefined, `Padam pengguna: ${user.name} (${user.icNumber})`);
  res.json({ success: true, message: 'Pengguna berjaya dipadam.' });
});

// 4. Get Applications list (Search, Filter, Role-based)
app.get('/api/applications', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  const { icNumber, search, type, category, year, language, limit, page } = req.query;

  // On Vercel (serverless), db resets each invocation — always sync fresh from Supabase
  try {
    await refreshFromSupabase();
  } catch (err) {
    console.warn('[iREPRO] Could not refresh from Supabase, using cached data:', err);
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
  list.sort((a: any, b: any) => {
    const parseDate = (dStr: any) => {
      if (!dStr) return 0;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) return d.getTime();
      const parts = String(dStr).split(/[\/\-\s:]/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const hours = parts[3] ? parseInt(parts[3], 10) : 0;
        const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
        const seconds = parts[5] ? parseInt(parts[5], 10) : 0;
        const pd = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(pd.getTime())) return pd.getTime();
      }
      return 0;
    };
    const dateA = parseDate(a.createdAt);
    const dateB = parseDate(b.createdAt);
    if (dateB !== dateA) return dateB - dateA;
    return (b.applicationId || '').localeCompare(a.applicationId || '', undefined, { numeric: true, sensitivity: 'base' });
  });

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

    // 1. Write to Supabase first
    const { error: appError } = await supabase.from('applications').insert({
      id: newRecord.id,
      applicationId: newRecord.applicationId,
      applicationType: newRecord.applicationType,
      category: newRecord.category || null,
      language: newRecord.language,
      icNumber: newRecord.icNumber,
      applicantName: newRecord.applicantName,
      email: newRecord.email,
      institution: newRecord.institution,
      title: newRecord.title,
      year: newRecord.year,
      status: newRecord.status,
      sourceSheet: newRecord.sourceSheet,
      sheetRowIndex: null, // Updated after sync
      innovationData: newRecord.innovationData || null,
      researchData: newRecord.researchData || null,
      generatedDocuments: newRecord.generatedDocuments,
      driveUrl: newRecord.driveUrl,
      createdAt: newRecord.createdAt,
      updatedAt: newRecord.updatedAt
    });

    if (appError) {
      console.error('[Supabase] Failed to save application:', appError);
      return res.status(500).json({ error: `Gagal menyimpan permohonan ke database: ${appError.message}` });
    }

    db.applications.unshift(newRecord);

    // 2. Perform background sync to Google Sheets
    (async () => {
      try {
        console.log(`[Google Sheets Background Sync] Syncing ${appId} to sheet "${targetSheet}"...`);
        const sheetResult = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);
        if (sheetResult.success) {
          console.log(`[Google Sheets Background Sync] Appended row to "${targetSheet}" successfully!`);
          
          // Re-pull from sheets to find the correct row index
          const { applications: freshApps } = await syncAllSheets();
          const syncedApp = freshApps.find(a => a.applicationId === appId);
          if (syncedApp && syncedApp.sheetRowIndex !== undefined) {
            await supabase.from('applications').update({
              sheetRowIndex: syncedApp.sheetRowIndex
            }).eq('applicationId', appId);
            
            // Also update local cache
            const cacheApp = db.applications.find(a => a.applicationId === appId);
            if (cacheApp) cacheApp.sheetRowIndex = syncedApp.sheetRowIndex;
            console.log(`[Google Sheets Background Sync] Updated sheetRowIndex ${syncedApp.sheetRowIndex} for ${appId} in database.`);
          }
        } else {
          console.warn(`[Google Sheets Background Sync] Failed to append row to "${targetSheet}":`, sheetResult.message);
        }
      } catch (err: any) {
        console.error(`[Google Sheets Background Sync] Error during sync:`, err.message);
      }
    })();

    const syncedRecord = newRecord;

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
      googleSheetsSynced: false,
      sheetMessage: 'Penyelarasan Google Sheets sedang diproses di latar belakang.',
    });
  } catch (err: any) {
    console.error('Error creating application:', err);
    res.status(500).json({ error: 'Maaf, permohonan tidak dapat diproses. Sila cuba lagi.' });
  }
});

app.get('/api/sheets/pending-sync', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .is('sheetRowIndex', null);

    if (error) throw error;
    res.json({ pendingCount: data?.length || 0, pending: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menyemak rekod belum diselaraskan: ${err.message}` });
  }
});

app.post('/api/sheets/sync-all', async (req, res) => {
  try {
    const { data: pending, error } = await supabase
      .from('applications')
      .select('*')
      .is('sheetRowIndex', null);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return res.json({ success: true, message: 'Semua rekod sudah diselaraskan ke Google Sheets.' });
    }

    console.log(`[iREPRO Sync All] Found ${pending.length} pending records to sync to Google Sheets.`);
    let successCount = 0;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    // Push each record
    for (const record of pending) {
      try {
        const { targetSheet, rowValues } = prepareSheetRow(record);
        const result = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);
        if (result.success) {
          successCount++;
        }
      } catch (e: any) {
        console.error(`[iREPRO Sync All] Error syncing record ${record.applicationId}:`, e.message);
      }
    }

    // Refresh row indices after push
    const { applications: freshApps } = await syncAllSheets();
    for (const app of freshApps) {
      await supabase.from('applications').update({
        sheetRowIndex: app.sheetRowIndex
      }).eq('applicationId', app.applicationId);
    }

    await refreshFromSupabase();

    res.json({
      success: true,
      message: `Berjaya menyelaras ${successCount} daripada ${pending.length} rekod ke Google Sheets.`
    });
  } catch (err: any) {
    res.status(500).json({ error: `Ralat semasa menyelaraskan semua rekod: ${err.message}` });
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
    console.log('[iREPRO Server] Force pulling from Google Sheets...');
    const { applications, users, feedbacks } = await syncAllSheets();
    
    // 1. Upsert users
    if (users.length > 0) {
      const uniqueUsersMap = new Map<string, any>();
      
      // Fetch current users from Supabase to prevent overwriting their registered emails/phones
      const { data: dbUsers } = await supabase.from('users').select('*');
      const dbUsersMap = new Map((dbUsers || []).map(u => [u.icNumber, u]));

      users.forEach((u: any) => {
        const existingDbUser = dbUsersMap.get(u.icNumber);
        
        // Preserve registered fields
        const finalEmail = existingDbUser?.email || u.email || '';
        const finalPhone = existingDbUser?.phone || u.phone || '';
        const finalName = existingDbUser?.name || u.name;
        const finalInstitution = existingDbUser?.institution || u.institution || 'Kolej Komuniti Beaufort';
        const finalDepartment = existingDbUser?.department || u.department || '';

        uniqueUsersMap.set(u.icNumber, {
          id: existingDbUser?.id || u.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          icNumber: u.icNumber,
          name: finalName,
          phone: finalPhone,
          email: finalEmail,
          institution: finalInstitution,
          department: finalDepartment,
          createdAt: existingDbUser?.createdAt || u.createdAt || new Date().toISOString()
        });
      });
      await supabase.from('users').upsert(Array.from(uniqueUsersMap.values()), { onConflict: 'icNumber' });
    }

    // 2. Upsert applications — but skip any that have been deleted
    if (applications.length > 0) {
      // Fetch list of deleted applicationIds to exclude from sync
      const { data: deletedRecords } = await supabase
        .from('deleted_applications')
        .select('applicationId');
      const deletedIds = new Set((deletedRecords || []).map((d: any) => d.applicationId));
      
      const appsToInsert = applications
        .filter((a: any) => !deletedIds.has(a.applicationId)) // skip deleted ones
        .map((a: any) => ({
          id: a.id || `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          applicationId: a.applicationId,
          applicationType: a.applicationType,
          category: a.category || null,
          language: a.language || 'MS',
          icNumber: a.icNumber,
          applicantName: a.applicantName,
          email: a.email || '',
          institution: a.institution || '',
          title: a.title,
          year: Number(a.year) || new Date().getFullYear(),
          status: a.status || 'COMPLETED',
          sourceSheet: a.sourceSheet || null,
          sheetRowIndex: a.sheetRowIndex !== undefined && a.sheetRowIndex !== null ? Number(a.sheetRowIndex) : null,
          innovationData: a.innovationData || null,
          researchData: a.researchData || null,
          generatedDocuments: a.generatedDocuments || [],
          driveUrl: a.driveUrl || '',
          createdAt: a.createdAt || new Date().toISOString(),
          updatedAt: a.updatedAt || new Date().toISOString()
        }));
      if (appsToInsert.length > 0) {
        await supabase.from('applications').upsert(appsToInsert, { onConflict: 'id' });
      }
      if (deletedIds.size > 0) {
        console.log(`[Sync] Skipped ${deletedIds.size} deleted records:`, [...deletedIds]);
      }
    }

    // 3. Upsert feedback
    if (feedbacks.length > 0) {
      const feedbackToInsert = feedbacks.map((f: any, idx: number) => {
        const parsedDate = parseSheetDate(f.createdAt);
        const createdAt = parsedDate ? parsedDate.toISOString() : new Date().toISOString();
        return {
          id: f.id || `fb-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          jantina: f.jantina || '',
          umur: f.umur || '',
          bangsa: f.bangsa || '',
          s1: Number(f.s1) || 0,
          s2: Number(f.s2) || 0,
          s3: Number(f.s3) || 0,
          s4: Number(f.s4) || 0,
          s5: Number(f.s5) || 0,
          comments: f.comments || '',
          createdAt: createdAt
        };
      });
      await supabase.from('feedback').upsert(feedbackToInsert, { onConflict: 'id' });
    }

    // Refresh memory cache from Supabase
    await refreshFromSupabase();

    res.json({
      success: true,
      message: 'Data terkini berjaya ditarik dari Google Sheets dan disegerakkan ke Supabase.',
      totalApplications: db.applications.length,
      lastSyncTime,
    });
  } catch (err: any) {
    console.error('[iREPRO Server] Pull from sheets error:', err);
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

    if (result.success) {
      // Re-pull row index and save to Supabase
      const { applications: freshApps } = await syncAllSheets();
      const syncedApp = freshApps.find(a => a.applicationId === applicationId);
      if (syncedApp && syncedApp.sheetRowIndex !== undefined) {
        await supabase.from('applications').update({
          sheetRowIndex: syncedApp.sheetRowIndex
        }).eq('applicationId', applicationId);
        
        // Also update local cache
        record.sheetRowIndex = syncedApp.sheetRowIndex;
      }
    }

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

  // 1. Update in Supabase first
  const { error: updateError } = await supabase.from('applications').update({
    category: updated.category,
    language: updated.language,
    applicantName: updated.applicantName,
    email: updated.email,
    institution: updated.institution,
    title: updated.title,
    innovationData: updated.innovationData || null,
    researchData: updated.researchData || null,
    generatedDocuments: updated.generatedDocuments,
    driveUrl: updated.driveUrl,
    updatedAt: updated.updatedAt
  }).eq('applicationId', updated.applicationId);

  if (updateError) {
    console.error('[Supabase] Error updating application:', updateError);
    return res.status(500).json({ error: 'Gagal mengemaskini permohonan ke database.' });
  }

  db.applications[index] = updated;

  // 2. Sync edits to Google Sheets in-place (in the background)
  if (existing.sheetRowIndex !== undefined && existing.sheetRowIndex !== null && existing.sourceSheet) {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      (async () => {
        try {
          const { targetSheet, rowValues } = prepareSheetRow(updated);
          const payload = {
            action: 'updateRow',
            targetSheet,
            rowIndex: (existing.sheetRowIndex as number) - 1, // 0-based data row index
            rowValues
          };
          console.log(`[Google Sheets Background Update] Updating in-place row ${existing.sheetRowIndex} for: ${updated.applicationId} in tab: ${targetSheet}...`);
          
          const updateRes = await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const updateResult = await updateRes.json().catch(() => ({}));
          console.log(`[Google Sheets Background Update] Update response:`, updateResult);
        } catch (err: any) {
          console.error('[Google Sheets Background Update] Error updating sheet row:', err);
        }
      })();
    }
  }

  const finalRecord = updated;

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

  // 1. Delete from Supabase first
  const { error: deleteError } = await supabase.from('applications').delete().eq('applicationId', deleted.applicationId);
  if (deleteError) {
    console.error('[Supabase] Error deleting application:', deleteError);
    // Put it back to cache if Supabase delete failed
    db.applications.splice(index, 0, deleted);
    return res.status(500).json({ error: 'Gagal memadam permohonan dari database.' });
  }

  // 2. Permanently record this deletion so future syncs cannot restore it
  await supabase.from('deleted_applications').upsert(
    { applicationId: deleted.applicationId, deletedAt: new Date().toISOString() },
    { onConflict: 'applicationId' }
  ).then(({ error }) => {
    if (error && error.code !== '42P01') { // ignore if table doesn't exist yet
      console.warn('[Supabase] Could not record deletion:', error.message);
    }
  });

  // 3. Delete from Google Sheet via Apps Script (in the background)
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (appsScriptUrl && deleted.sourceSheet && deleted.sheetRowIndex !== undefined && deleted.sheetRowIndex !== null) {
    (async () => {
      try {
        const sheetName = encodeURIComponent(deleted.sourceSheet);
        const deleteUrl = `${appsScriptUrl}?action=deleteRow&sheet=${sheetName}&rowIndex=${deleted.sheetRowIndex}`;
        const delRes = await fetch(deleteUrl, { method: 'GET', redirect: 'follow' });
        const delText = await delRes.text();
        console.log(`[Google Sheets Background Delete] Delete row result for ${deleted.applicationId}:`, delText);
        
        // Re-pull and update sheetRowIndex for remaining rows ONLY — skip the deleted one
        const { applications: freshApps } = await syncAllSheets();
        for (const app of freshApps) {
          // IMPORTANT: Never re-insert the deleted record
          if (app.applicationId === deleted.applicationId) continue;

          await supabase.from('applications').update({
            sheetRowIndex: app.sheetRowIndex
          }).eq('applicationId', app.applicationId);
          
          // Also update local cache
          const cacheApp = db.applications.find(a => a.applicationId === app.applicationId);
          if (cacheApp) cacheApp.sheetRowIndex = app.sheetRowIndex;
        }
      } catch (err: any) {
        console.warn(`[Google Sheets Background Delete] Failed to delete row from sheet:`, err.message);
      }
    })();
  }

  addAuditLog(
    'Admin KUPIK',
    'Delete application',
    deleted.applicationId,
    `Permohonan ${deleted.applicationId} (${deleted.title}) telah dipadam`
  );

  res.json({ success: true, message: 'Permohonan berjaya dipadam.', applicationId: deleted.applicationId });
});


// 9. Backup endpoint — dibaca oleh Vercel Cron setiap Ahad 2am MYT (18:00 UTC Ahad)
// Boleh juga dipanggil secara manual: GET /api/backup?secret=<BACKUP_SECRET>
app.get('/api/backup', async (req, res) => {
  const secret = process.env.BACKUP_SECRET || 'irepro-backup-2026';
  const providedSecret = req.headers['authorization']?.replace('Bearer ', '') || req.query.secret;

  // Vercel Cron sends requests with a special header — allow those too
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || req.headers['user-agent']?.includes('vercel-cron');

  if (!isVercelCron && providedSecret !== secret) {
    return res.status(401).json({ error: 'Unauthorized. Provide ?secret=<BACKUP_SECRET> or set Authorization header.' });
  }

  // Helper: convert array of objects to CSV string with proper escaping
  function toCsv(rows: any[], columns: string[]): string {
    const escape = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      // Wrap in quotes if contains comma, newline, or quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const header = columns.join(',');
    const body = rows.map(row => columns.map(col => escape(row[col])).join(','));
    return [header, ...body].join('\r\n');
  }

  try {
    console.log('[Backup] Starting Supabase CSV backup to Google Drive...');

    // Fetch all data from Supabase
    const [appsRes, usersRes, feedbackRes, deletedRes, logsRes] = await Promise.all([
      supabase.from('applications').select('*').order('createdAt', { ascending: true }),
      supabase.from('users').select('*').order('createdAt', { ascending: true }),
      supabase.from('feedback').select('*').order('createdAt', { ascending: true }),
      supabase.from('deleted_applications').select('*').order('deletedAt', { ascending: true }),
      supabase.from('audit_logs').select('*').order('createdAt', { ascending: false }).limit(500)
    ]);

    if (appsRes.error) throw appsRes.error;
    if (usersRes.error) throw usersRes.error;

    const apps = appsRes.data || [];
    const users = usersRes.data || [];
    const feedbacks = feedbackRes.data || [];
    const deleted = deletedRes.data || [];
    const logs = logsRes.data || [];

    // Define CSV columns for each table
    const csvFiles = [
      {
        table: 'applications',
        rows: apps.length,
        csv: toCsv(apps, [
          'applicationId', 'applicationType', 'category', 'language',
          'icNumber', 'applicantName', 'email', 'institution', 'title',
          'year', 'status', 'sourceSheet', 'sheetRowIndex', 'driveUrl',
          'createdAt', 'updatedAt'
        ])
      },
      {
        table: 'users',
        rows: users.length,
        csv: toCsv(users, [
          'id', 'icNumber', 'name', 'phone', 'email',
          'institution', 'department', 'createdAt'
        ])
      },
      {
        table: 'feedback',
        rows: feedbacks.length,
        csv: toCsv(feedbacks, [
          'id', 'jantina', 'umur', 'bangsa',
          's1', 's2', 's3', 's4', 's5', 'comments', 'createdAt'
        ])
      },
      {
        table: 'deleted_applications',
        rows: deleted.length,
        csv: toCsv(deleted, ['applicationId', 'deletedAt'])
      },
      {
        table: 'audit_logs',
        rows: logs.length,
        csv: toCsv(logs, ['id', 'user', 'action', 'applicationId', 'details', 'timestamp'])
      }
    ];

    const stats = {
      totalApplications: apps.length,
      totalUsers: users.length,
      totalFeedback: feedbacks.length,
      totalDeleted: deleted.length,
      totalInovasi: apps.filter((a: any) => a.applicationType === 'INOVASI').length,
      totalPenyelidikan: apps.filter((a: any) => a.applicationType === 'PENYELIDIKAN').length
    };

    // Upload CSV files to Google Drive via Apps Script
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) throw new Error('APPS_SCRIPT_URL not configured');

    const driveRes = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveBackupToDrive', csvFiles })
    });

    const driveResult = await driveRes.json() as any;
    if (!driveResult.success) throw new Error(driveResult.error || 'Apps Script backup failed');

    // Log backup event
    const fileList = (driveResult.files || []).map((f: any) => f.fileName).join(', ');
    addAuditLog(
      'System (Cron)',
      'Backup',
      undefined,
      `Backup CSV berjaya: ${driveResult.files?.length || 0} fail (${driveResult.totalSizeKb || 0} KB) — ${fileList}`
    );

    console.log(`[Backup] ✓ CSV backup complete: ${driveResult.files?.length} files, ${driveResult.totalSizeKb} KB`);
    return res.json({
      success: true,
      message: `Backup berjaya: ${driveResult.files?.length || 0} fail CSV`,
      files: driveResult.files,
      stats,
      totalSizeKb: driveResult.totalSizeKb
    });

  } catch (err: any) {
    console.error('[Backup] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Statistics Aggregation
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

  // Write to Supabase first
  const { error: fbError } = await supabase.from('feedback').insert(item);
  if (fbError) {
    console.error('[Supabase] Error inserting feedback:', fbError);
    return res.status(500).json({ error: 'Gagal merekodkan maklum balas.' });
  }

  db.feedback.push(item);

  // Background sync feedback to Google Sheets
  (async () => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      await appendRowToGoogleSheet('maklum balas', rowValues, bearerToken);
      console.log(`[iREPRO Server] Successfully appended feedback to 'maklum balas' sheet tab.`);
    } catch (err) {
      console.warn('[iREPRO Server] Could not write feedback to Google Sheets:', err);
    }
  })();

  res.json({ success: true, message: 'Maklum balas penggunaan iREPRO berjaya direkodkan. Terima kasih!' });
});

app.get('/api/feedback', (req, res) => {
  res.json(db.feedback);
});

const GOOGLE_DOC_TEMPLATES: Record<string, string> = {
  innovation_ms_appointment: '1MNR1SAoZYiz91ItxZN8dvNPoP0Rxz8XtP4eemhcStXs',
  innovation_ms_proposal: '1oTMDV7wNeVI0M8tTHZBxRBuxHZ9Vw0wLTz19h8h7jvw',
  innovation_student_ms_proposal: '1sEwenqky6oDrY4GgqrXlX95mPsNjrugz61klNzu-c2s',
  innovation_en_appointment: '1MNR1SAoZYiz91ItxZN8dvNPoP0Rxz8XtP4eemhcStXs', // Fallback to BM layout
  innovation_en_proposal: '123A87vegDr84kN_CfZqgmFE5NsKmskzg53fNexWBOaI',
  innovation_student_en_proposal: '1Jrgr9H-ERnLfDAqQN_CS_lV0uw5dlZUdIXAknaWwrO4',
  innovation_lecturer_ms_report: '1VmxmoM3ppC_XBBVDjvF3jN_HziCZZpJdNT1okwogpSg',
  innovation_lecturer_en_report: '1J_ecaL8sMGa0gjbF6FDJK58bclFLHF9Wrq9PZ5RzmOk',
  innovation_student_ms_report: '1RzBfF6du9uIXXNhLDx6mXQAFruNnElxYnS7H_Hy0kVU',
  innovation_student_en_report: '1yzaRAtRn7cdM5J67h1nzSisFaq7DqyHxyQs8JomVqVY',
  innovation_certificate: '1UDlAfDrZZjJ0VVLaU8vPhpo5VknQgNpKdxIQuky3t4w',
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
  research_cat4_en_ppp_proposal: '17Zas_WPdmlVS5ox19a2qzGwOulp3TDuDbj_MB2pfEIM',
  research_certificate: '1LUguZnvmCb03OtcsiBInycXj-NHJVeTJOE_ncuCP5ZA'
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

  const appId = app.applicationId || app.id || '';

  // Standard substitutions mapping template keys directly
  return {
    '[APPLICATION ID]': appId,
    '[APPLICATION_ID]': appId,
    '[NO_PERMOHONAN]': appId,
    '[ID_PERMOHONAN]': appId,
    '[ID PERMOHONAN]': appId,
    '[NO PERMOHONAN]': appId,
    '[NAMA KETUA]': chiefName,
    '[NAMA]': chiefName,
    '[ NAMA ]': chiefName,
    '[NAMA 1]': members[0]?.name || '',
    '[NAMA 2]': members[1]?.name || '',
    '[NAMA 3]': members[2]?.name || '',
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
    '[INSTITUSI 3]': members[2]?.institution || '',
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
    '<<NAMA 3>>': members[2]?.name || '',
    '<<INSTITUSI 3>>': members[2]?.institution || '',
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
    '[NO. KP 3]': members[2]?.icNumber || '',
    '[NO. TELEFON 3]': members[2]?.phone || '',
    '[JABATAN 3]': members[2]?.department || '',
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

app.post('/api/documents/generate-pdf', async (req, res) => {
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

    const replacements = buildReplacements(templateKey, appRecord);
    
    // Add additional certificate specific placeholders
    const category = appRecord.applicationType === 'INOVASI' 
      ? (appRecord.innovationData?.category || 'Pensyarah / Pelajar')
      : (appRecord.researchData?.category || 'Penyelidikan');

    replacements['[KATEGORI]'] = category;
    replacements['[TARIKH]'] = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

    const defaultAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbx4N_KtHqt7wbI70hJEQIaynFsv34CHj_sdrWE96VNkXZCRALXdmd8XDrxCHPr2ot31Eg/exec';
    const appsScriptUrl = process.env.APPS_SCRIPT_URL || defaultAppsScriptUrl;
    
    console.log(`[PDF Generator] Generating PDF via Apps Script for ${applicationId} (${templateKey}) using template ${templateId}...`);
    const scriptRes = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateDocument',
        templateId,
        fileName: `${applicationId}_${templateKey}.pdf`,
        replacements
      })
    });

    const scriptData = await scriptRes.json().catch((e: any) => ({ error: e.message }));
    if (scriptData.success) {
      const docName = `${applicationId}_${templateKey}.pdf`;

      // Method 1: Apps Script returned base64 PDF directly (best - placeholders already replaced)
      if (scriptData.pdfBase64) {
        console.log(`[PDF Generator] Apps Script returned base64 PDF (${scriptData.pdfBase64.length} chars) for ${applicationId}`);
        const buffer = Buffer.from(scriptData.pdfBase64, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${docName}"`);
        return res.send(buffer);
      }

      // Method 2: Apps Script returned a PDF URL to fetch
      const targetPdfUrl = scriptData.pdfUrl || scriptData.docxUrl;
      if (targetPdfUrl) {
        console.log(`[PDF Generator] Apps Script returned PDF URL: ${targetPdfUrl}`);
        const pdfFetchRes = await fetch(targetPdfUrl);
        if (pdfFetchRes.ok) {
          const arrayBuffer = await pdfFetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${docName}"`);
          return res.send(buffer);
        }
      }
    }

    console.error(`[PDF Generator] Apps Script generation failed:`, scriptData);
    return res.status(500).json({ 
      error: `Gagal menjana PDF daripada templat Google Presentation: ${scriptData.error || 'Ralat tidak diketahui daripada Apps Script.'}` 
    });

  } catch (err: any) {
    console.error('[PDF Generator] Failed to generate PDF:', err.message);
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
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      const viteModuleName = 'vite';
      const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('[Vite Dev Server Warning]:', e);
    }
  } else if (!process.env.VERCEL) {
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

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`iREPRO Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  start();
}

export default app;
