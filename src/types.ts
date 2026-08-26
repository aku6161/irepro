export type ApplicationType = 'INOVASI' | 'PENYELIDIKAN';
export type Language = 'MS' | 'EN';
export type ResearchCategory = 'CAT_1' | 'CAT_2' | 'CAT_3' | 'CAT_4' | 'CAT_5';
export type RecordStatus = 'DRAFT' | 'GENERATED' | 'COMPLETED';
export type UserRole = 'USER' | 'ADMIN';

export interface ResearcherMember {
  id: string;
  name: string;
  icNumber: string;
  phone: string;
  department: string;
  institution: string;
  role?: string;
}

export interface AdminOfficerInfo {
  kupikName: string;
  deputyDirectorName: string;
  directorName: string;
  ppiDirectorName?: string;
}

export interface InnovationApplicationData {
  chiefName: string;
  chiefIc: string;
  chiefPhone: string;
  chiefEmail: string;
  institution: string;
  members: ResearcherMember[];
  adminInfo: AdminOfficerInfo;
  title: string;
  introduction: string;
  objectives: string;
  impactTargetGroup: string;
  impactInstitution: string;
  impactDepartment: string;
}

export interface ResearchApplicationData {
  category: ResearchCategory;
  chiefName: string;
  chiefIc: string;
  chiefPhone: string;
  chiefEmail?: string;
  department: string;
  institution: string;
  // PPP specific fields (Cat IV & V)
  address?: string;
  occupation?: string;
  institutionAddress?: string;
  institutionPhone?: string;
  studyYear?: string;
  // Common & Members
  members: ResearcherMember[];
  adminInfo: AdminOfficerInfo;
  title: string;
  conference?: string;
  introduction: string;
  objectives: string;
  location: string;
  sample: string;
  instruments: string;
  // Timeline dates
  pilotStartDate?: string;
  pilotEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  expectedReportDate?: string;
  // Impacts
  impactDepartment: string;
  impactTargetGroup: string;
  impactInstitution: string;
}

export interface GeneratedDocument {
  id: string;
  applicationId: string;
  documentType: string;
  templateKey: string;
  language: Language;
  fileName: string;
  driveUrl: string;
  contentHtml: string;
  generatedAt: string;
}

export interface ApplicationRecord {
  id: string;
  applicationId: string;
  applicationType: ApplicationType;
  category?: ResearchCategory;
  language: Language;
  icNumber: string;
  applicantName: string;
  email?: string;
  phone?: string;
  department?: string;
  institution: string;
  title: string;
  year: number;
  status: RecordStatus;
  sourceSheet?: 'inovasi' | 'lampiran a' | 'PPP' | 'Data Permohonan';
  sheetRowIndex?: number;
  members?: ResearcherMember[];
  adminOfficers?: AdminOfficerInfo;
  innovationData?: InnovationApplicationData;
  researchData?: ResearchApplicationData;
  generatedDocuments: GeneratedDocument[];
  driveUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  icNumber: string;
  name: string;
  phone: string;
  email: string;
  institution: string;
  department?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  action: 'Login' | 'Create application' | 'Update application' | 'Generate document' | 'Delete application' | 'Admin action';
  applicationId?: string;
  details?: string;
  timestamp: string;
}

export interface FeedbackEntry {
  id: string;
  name: string;
  email: string;
  feedback: string;
  suggestion: string;
  rating: number;
  createdAt: string;
}

export interface StatsOverview {
  totalApplications: number;
  totalInnovation: number;
  totalResearch: number;
  totalApplicants: number;
  currentYearInnovation: number;
  currentYearResearch: number;
  byYear: {
    year: number;
    innovation: number;
    research: number;
    total: number;
  }[];
  byCategory: {
    category: string;
    label: string;
    count: number;
  }[];
  byInstitution: {
    institution: string;
    count: number;
  }[];
}

export const formatCategoryLabel = (cat?: ResearchCategory | string): string => {
  if (!cat) return '';
  switch (cat) {
    case 'CAT_1':
      return 'KATEGORI I';
    case 'CAT_2':
      return 'KATEGORI II';
    case 'CAT_3':
      return 'KATEGORI III';
    case 'CAT_4':
      return 'KATEGORI IV';
    case 'CAT_5':
      return 'KATEGORI V';
    default:
      return String(cat).replace('_', ' ');
  }
};

