import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ApplicationType, 
  Language, 
  ResearchCategory, 
  ResearcherMember, 
  AdminOfficerInfo, 
  ApplicationRecord,
  formatCategoryLabel
} from '../types';
import { 
  getDocumentTemplatesForApplication, 
  generateDocumentHtml 
} from '../utils/documentTemplates';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  Clock, 
  Loader2, 
  ShieldCheck, 
  GraduationCap, 
  HelpCircle 
} from 'lucide-react';

interface ApplicationFormProps {
  editMode?: boolean;
  onComplete?: (createdApp: ApplicationRecord) => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ editMode = false, onComplete }) => {
  const { 
    currentUser, 
    editingApplication, 
    createApplication, 
    updateApplication, 
    setActiveView, 
    showToast,
    applications
  } = useApp();

  // Find latest application by this user to pre-populate details
  const latestApp = useMemo(() => {
    if (editMode || !currentUser || !applications) return null;
    const userApps = applications.filter(a => 
      a.icNumber === currentUser.icNumber || 
      a.applicantName?.trim().toUpperCase() === currentUser.name?.trim().toUpperCase()
    );
    if (userApps.length === 0) return null;
    return [...userApps].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [applications, currentUser, editMode]);

  // Current Step: 1 to 7
  const [step, setStep] = useState<number>(1);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 1. Step 1: Type & Language & Category
  const [appType, setAppType] = useState<ApplicationType>(
    editingApplication?.applicationType || 'INOVASI'
  );
  const [language, setLanguage] = useState<Language>(
    editingApplication?.language || 'MS'
  );
  const [researchCategory, setResearchCategory] = useState<ResearchCategory>(() => {
    if (editingApplication?.category) return editingApplication.category;
    return (editingApplication?.applicationType || 'INOVASI') === 'INOVASI' ? 'PENSYARAH' : 'CAT_1';
  });

  // 2. Step 2: Applicant / Chief Details
  const [chiefName, setChiefName] = useState<string>(
    editingApplication?.applicantName || latestApp?.applicantName || currentUser?.name || ''
  );
  const [chiefIc, setChiefIc] = useState<string>(
    editingApplication?.icNumber || latestApp?.icNumber || currentUser?.icNumber || ''
  );
  const [chiefPhone, setChiefPhone] = useState<string>(
    editingApplication?.innovationData?.chiefPhone || 
    editingApplication?.researchData?.chiefPhone || 
    latestApp?.innovationData?.chiefPhone ||
    latestApp?.researchData?.chiefPhone ||
    currentUser?.phone || ''
  );
  const [chiefEmail, setChiefEmail] = useState<string>(
    editingApplication?.innovationData?.chiefEmail ||
    editingApplication?.researchData?.chiefEmail ||
    latestApp?.innovationData?.chiefEmail ||
    latestApp?.researchData?.chiefEmail ||
    currentUser?.email || ''
  );
  const [institution, setInstitution] = useState<string>(
    editingApplication?.institution || latestApp?.institution || currentUser?.institution || ''
  );
  const [department, setDepartment] = useState<string>(
    editingApplication?.researchData?.department || latestApp?.researchData?.department || currentUser?.department || ''
  );

  // PPP Specific fields (Cat IV & V)
  const [address, setAddress] = useState<string>(
    editingApplication?.researchData?.address || latestApp?.researchData?.address || ''
  );
  const [occupation, setOccupation] = useState<string>(
    editingApplication?.researchData?.occupation || latestApp?.researchData?.occupation || ''
  );
  const [institutionAddress, setInstitutionAddress] = useState<string>(
    editingApplication?.researchData?.institutionAddress || latestApp?.researchData?.institutionAddress || ''
  );
  const [institutionPhone, setInstitutionPhone] = useState<string>(
    editingApplication?.researchData?.institutionPhone || latestApp?.researchData?.institutionPhone || ''
  );
  const [studyYear, setStudyYear] = useState<string>(
    editingApplication?.researchData?.studyYear || latestApp?.researchData?.studyYear || ''
  );

  // 3. Step 3: Members & Admin Officers
  const [members, setMembers] = useState<ResearcherMember[]>(() => {
    if (editingApplication?.innovationData?.members) return editingApplication.innovationData.members;
    if (editingApplication?.researchData?.members) return editingApplication.researchData.members;
    return [
      {
        id: 'mem-1',
        name: '',
        icNumber: '',
        phone: '',
        department: '',
        institution: '',
        role: 'Ahli 1',
      },
    ];
  });

  const [kupikName, setKupikName] = useState<string>(
    editingApplication?.innovationData?.adminInfo?.kupikName ||
    editingApplication?.researchData?.adminInfo?.kupikName ||
    ''
  );
  const [deputyDirectorName, setDeputyDirectorName] = useState<string>(
    editingApplication?.innovationData?.adminInfo?.deputyDirectorName ||
    editingApplication?.researchData?.adminInfo?.deputyDirectorName ||
    ''
  );
  const [directorName, setDirectorName] = useState<string>(
    editingApplication?.innovationData?.adminInfo?.directorName ||
    editingApplication?.researchData?.adminInfo?.directorName ||
    ''
  );
  const [ppiDirectorName, setPpiDirectorName] = useState<string>(
    editingApplication?.researchData?.adminInfo?.ppiDirectorName ||
    ''
  );

  // 4. Step 4: Proposal / Content Details
  const [title, setTitle] = useState<string>(editingApplication?.title || '');
  const [conference, setConference] = useState<string>(
    editingApplication?.researchData?.conference || ''
  );
  const [introduction, setIntroduction] = useState<string>(
    editingApplication?.innovationData?.introduction ||
    editingApplication?.researchData?.introduction || ''
  );
  const [objectives, setObjectives] = useState<string>(
    editingApplication?.innovationData?.objectives ||
    editingApplication?.researchData?.objectives || ''
  );
  const [location, setLocation] = useState<string>(
    editingApplication?.researchData?.location || 'Makmal Komputer & Bilik Kuliah Politeknik'
  );
  const [sample, setSample] = useState<string>(
    editingApplication?.researchData?.sample || '80 orang pelajar semester 3'
  );
  const [instruments, setInstruments] = useState<string>(
    editingApplication?.researchData?.instruments || 'Borang soal selidik skala Likert dan ujian amali'
  );

  // Dates for PPP & Research
  const [pilotStartDate, setPilotStartDate] = useState<string>(
    editingApplication?.researchData?.pilotStartDate || '2026-03-01'
  );
  const [pilotEndDate, setPilotEndDate] = useState<string>(
    editingApplication?.researchData?.pilotEndDate || '2026-03-31'
  );
  const [actualStartDate, setActualStartDate] = useState<string>(
    editingApplication?.researchData?.actualStartDate || '2026-04-15'
  );
  const [actualEndDate, setActualEndDate] = useState<string>(
    editingApplication?.researchData?.actualEndDate || '2026-08-30'
  );
  const [expectedReportDate, setExpectedReportDate] = useState<string>(
    editingApplication?.researchData?.expectedReportDate || '2026-10-15'
  );

  // 5. Step 5: Impacts
  const [impactTargetGroup, setImpactTargetGroup] = useState<string>(
    editingApplication?.innovationData?.impactTargetGroup ||
    editingApplication?.researchData?.impactTargetGroup || ''
  );
  const [impactInstitution, setImpactInstitution] = useState<string>(
    editingApplication?.innovationData?.impactInstitution ||
    editingApplication?.researchData?.impactInstitution || ''
  );
  const [impactDepartment, setImpactDepartment] = useState<string>(
    editingApplication?.innovationData?.impactDepartment ||
    editingApplication?.researchData?.impactDepartment || ''
  );

  const isPppStructure = appType === 'PENYELIDIKAN' && (researchCategory === 'CAT_4' || researchCategory === 'CAT_5');

  // Auto-save draft timestamp simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 15000);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    return () => clearInterval(timer);
  }, []);

  // Format IC Helper
  const formatIcNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 6) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
  };

  const handleChiefIcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChiefIc(formatIcNumber(e.target.value));
  };

  // Add / Remove Member (Maximum 2/3 members)
  const maxMembers = (appType === 'INOVASI' && researchCategory === 'PELAJAR') ? 3 : 2;

  const addMember = () => {
    if (members.length >= maxMembers) {
      showToast(`Maksimum hanya ${maxMembers} orang ahli tambahan dibenarkan.`, 'info');
      return;
    }
    const newIdx = members.length + 1;
    setMembers([
      ...members,
      {
        id: `mem-${Date.now()}`,
        name: '',
        icNumber: '',
        phone: '',
        department: '',
        institution: '',
        role: `Ahli ${newIdx}`,
      },
    ]);
  };

  const removeMember = (index: number) => {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const updateMemberField = (index: number, field: keyof ResearcherMember, value: string) => {
    const updated = [...members];
    if (field === 'icNumber') {
      updated[index][field] = formatIcNumber(value);
    } else if (field === 'name') {
      updated[index][field] = value.toUpperCase();
    } else {
      updated[index][field] = value;
    }
    setMembers(updated);
  };

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!appType) errors.appType = 'Sila pilih jenis permohonan.';
      if (!language) errors.language = 'Sila pilih bahasa dokumen.';
    } else if (currentStep === 2) {
      if (!chiefName.trim()) errors.chiefName = 'Nama pemohon diperlukan.';
      if (!chiefIc.trim() || !/^\d{6}-\d{2}-\d{4}$/.test(chiefIc.trim())) {
        errors.chiefIc = 'Format No. Kad Pengenalan mestilah 000000-00-0000 (12 digit).';
      }
      if (!chiefPhone.trim()) errors.chiefPhone = 'No. telefon diperlukan.';
      if (!institution.trim()) errors.institution = 'Institusi diperlukan.';
    } else if (currentStep === 4) {
      if (!title.trim()) errors.title = 'Tajuk permohonan diperlukan.';
      if (!introduction.trim()) errors.introduction = 'Pengenalan / Latar belakang diperlukan.';
      if (!objectives.trim()) errors.objectives = 'Objektif diperlukan.';

      // Date validation
      if (isPppStructure) {
        if (pilotStartDate && pilotEndDate && new Date(pilotEndDate) < new Date(pilotStartDate)) {
          errors.pilotDates = 'Tarikh akhir kajian rintis tidak boleh lebih awal daripada tarikh mula.';
        }
        if (actualStartDate && actualEndDate && new Date(actualEndDate) < new Date(actualStartDate)) {
          errors.actualDates = 'Tarikh akhir kajian sebenar tidak boleh lebih awal daripada tarikh mula.';
        }
      }
    } else if (currentStep === 5) {
      if (!impactTargetGroup.trim()) errors.impactTargetGroup = 'Impak kepada kumpulan sasaran diperlukan.';
      if (!impactInstitution.trim()) errors.impactInstitution = 'Impak kepada institusi diperlukan.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 7));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setValidationErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit & Generate Documents (Step 7)
  const handleFinalSubmit = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(20);

      const year = editingApplication?.year || new Date().getFullYear();
      const tempAppId = editingApplication?.applicationId || (appType === 'INOVASI' ? `IREPRO-INV-${year}-NEW` : `IREPRO-RES-${year}-NEW`);

      // Prepare payload
      const validMembers = members.filter((m) => m.name.trim() !== '');

      const adminInfo: AdminOfficerInfo = {
        kupikName: kupikName.trim() || 'KUPIK',
        deputyDirectorName: deputyDirectorName.trim() || 'Timbalan Pengarah',
        directorName: directorName.trim() || 'Pengarah',
        ppiDirectorName: ppiDirectorName.trim(),
      };

      const innovationData = appType === 'INOVASI' ? {
        chiefName: chiefName.trim(),
        chiefIc: chiefIc.trim(),
        chiefPhone: chiefPhone.trim(),
        chiefEmail: chiefEmail.trim(),
        institution: institution.trim(),
        members: validMembers,
        adminInfo,
        title: title.trim(),
        introduction: introduction.trim(),
        objectives: objectives.trim(),
        impactTargetGroup: impactTargetGroup.trim(),
        impactInstitution: impactInstitution.trim(),
        impactDepartment: impactDepartment.trim(),
      } : undefined;

      const researchData = appType === 'PENYELIDIKAN' ? {
        category: researchCategory,
        chiefName: chiefName.trim(),
        chiefIc: chiefIc.trim(),
        chiefPhone: chiefPhone.trim(),
        chiefEmail: chiefEmail.trim(),
        department: department.trim(),
        institution: institution.trim(),
        address: address.trim(),
        occupation: occupation.trim(),
        institutionAddress: institutionAddress.trim(),
        institutionPhone: institutionPhone.trim(),
        studyYear: studyYear.trim(),
        members: validMembers,
        adminInfo,
        title: title.trim(),
        conference: conference.trim(),
        introduction: introduction.trim(),
        objectives: objectives.trim(),
        location: location.trim(),
        sample: sample.trim(),
        instruments: instruments.trim(),
        pilotStartDate,
        pilotEndDate,
        actualStartDate,
        actualEndDate,
        expectedReportDate,
        impactDepartment: impactDepartment.trim(),
        impactTargetGroup: impactTargetGroup.trim(),
        impactInstitution: impactInstitution.trim(),
      } : undefined;

      // Simulated Progress
      setGenerationProgress(50);

      // Generate HTML documents
      const templateConfigs = getDocumentTemplatesForApplication({
        applicationId: tempAppId,
        applicationType: appType,
        category: researchCategory,
        language: language,
        title: title.trim(),
        year: year,
      });

      const tempAppRecord: ApplicationRecord = {
        id: editingApplication?.id || `temp-${Date.now()}`,
        applicationId: tempAppId,
        applicationType: appType,
        category: researchCategory,
        language: language,
        icNumber: chiefIc.trim(),
        applicantName: chiefName.trim(),
        institution: institution.trim(),
        title: title.trim(),
        year: year,
        status: 'COMPLETED',
        innovationData,
        researchData,
        generatedDocuments: [],
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        createdAt: editingApplication?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const generatedDocs = templateConfigs.map((t) => ({
        id: `doc-${Date.now()}-${t.key}`,
        applicationId: tempAppId,
        documentType: t.docType,
        templateKey: t.key,
        language: language,
        fileName: t.fileName,
        driveUrl: 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing',
        contentHtml: generateDocumentHtml(t.key, tempAppRecord),
        generatedAt: new Date().toISOString(),
      }));

      setGenerationProgress(80);

      const finalPayload = {
        applicationType: appType,
        category: researchCategory,
        language: language,
        icNumber: chiefIc.trim(),
        applicantName: chiefName.trim(),
        institution: institution.trim(),
        title: title.trim(),
        year: year,
        innovationData,
        researchData,
        generatedDocuments: generatedDocs,
      };

      let resultApp: ApplicationRecord;
      if (editMode && editingApplication) {
        resultApp = await updateApplication(editingApplication.id, finalPayload);
      } else {
        resultApp = await createApplication(finalPayload);
      }

      setGenerationProgress(100);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      if (onComplete) {
        onComplete(resultApp);
      } else {
        setActiveView('user_dashboard');
      }
    } catch (err: any) {
      showToast(err.message || 'Maaf, dokumen tidak dapat dijana. Sila cuba semula atau hubungi pentadbir.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const stepsLabels = [
    'Jenis & Bahasa',
    'Maklumat Pemohon',
    'Maklumat Ahli',
    'Maklumat Permohonan',
    'Maklumat Impak',
    'Semakan',
    'Jana Dokumen',
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Form Card Top Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4 text-red-600" />
            <span>{editMode ? 'Kemaskini Permohonan' : 'Borang Permohonan Baharu'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {appType === 'INOVASI' ? 'Borang Projek Inovasi' : `Borang Penyelidikan (${researchCategory.replace('_', ' ')})`}
          </h1>
        </div>

        {/* Autosave badge as specified on page 19 & 20 */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Save className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>
            Draft terakhir disimpan: <strong>{lastSavedTime || '11:32 AM'}</strong>
          </span>
        </div>
      </div>

      {/* Progress Indicator (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7) as required on page 23 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between relative">
          {/* Progress bar line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-red-600 transition-all duration-300 -z-0"
            style={{ width: `${((step - 1) / (stepsLabels.length - 1)) * 100}%` }}
          />

          {stepsLabels.map((lbl, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < step;
            const isCurrent = stepNum === step;

            return (
              <div key={lbl} className="flex flex-col items-center relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    if (stepNum < step) setStep(stepNum);
                  }}
                  disabled={stepNum > step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-red-600 text-white ring-4 ring-red-100 shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </button>
                <span className="hidden sm:block text-[10px] font-medium text-slate-500 mt-1.5 text-center max-w-[80px] truncate">
                  {lbl}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Error Alert Box */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-start space-x-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Sila semak maklumat yang diperlukan:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {Object.values(validationErrors).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* ================= STEP 1: JENIS & BAHASA ================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Langkah 1: Pilih Jenis Permohonan &amp; Bahasa Dokumen
                </h3>
                <p className="text-xs text-slate-500">
                  Bahasa yang dipilih akan menentukan format dan teks dokumen rasmi yang dijana.
                </p>
              </div>

              {/* Jenis Permohonan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Jenis Permohonan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Inovasi */}
                  <label
                    className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      appType === 'INOVASI'
                        ? 'border-red-600 bg-red-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="appType"
                      value="INOVASI"
                      checked={appType === 'INOVASI'}
                      onChange={() => {
                        setAppType('INOVASI');
                        setResearchCategory('PENSYARAH');
                      }}
                      className="mt-1 text-red-600 focus:ring-red-500"
                    />
                    <div className="ml-3">
                      <span className="font-bold text-sm text-slate-900 block">1. INOVASI</span>
                    </div>
                  </label>

                  {/* Option 2: Penyelidikan */}
                  <label
                    className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      appType === 'PENYELIDIKAN'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="appType"
                      value="PENYELIDIKAN"
                      checked={appType === 'PENYELIDIKAN'}
                      onChange={() => {
                        setAppType('PENYELIDIKAN');
                        setResearchCategory('CAT_1');
                      }}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="ml-3">
                      <span className="font-bold text-sm text-slate-900 block">2. PENYELIDIKAN</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Inovasi Category Selection */}
              {appType === 'INOVASI' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pilih Kategori Inovasi <span className="text-rose-500">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        cat: 'PENSYARAH' as ResearchCategory,
                        label: 'Kategori Pensyarah',
                        desc: 'Maksimum 2 ahli tambahan.',
                      },
                      {
                        cat: 'PELAJAR' as ResearchCategory,
                        label: 'Kategori Pelajar',
                        desc: 'Maksimum 3 ahli pelajar.',
                      },
                    ].map((item) => (
                      <label
                        key={item.cat}
                        className={`flex items-start p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          researchCategory === item.cat
                            ? 'bg-red-50 border-red-600 text-red-950 font-semibold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="innovationCategory"
                          value={item.cat}
                          checked={researchCategory === item.cat}
                          onChange={() => setResearchCategory(item.cat)}
                          className="mt-0.5 text-red-600 focus:ring-red-500"
                        />
                        <div className="ml-2.5">
                          <span className="font-bold text-slate-900 block">{item.label}</span>
                          <span className="text-[11px] text-slate-500 font-normal mt-1 block">{item.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Penyelidikan Category Selection */}
              {appType === 'PENYELIDIKAN' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pilih Kategori Penyelidikan <span className="text-rose-500">*</span>
                  </label>

                  <div className="space-y-2">
                    {[
                      {
                        cat: 'CAT_1' as ResearchCategory,
                        label: 'Kategori I',
                        desc: 'Penyelidik POLYCC A • Responden POLYCC A',
                        detail: 'Kelulusan: Pengarah Institusi',
                      },
                      {
                        cat: 'CAT_2' as ResearchCategory,
                        label: 'Kategori II',
                        desc: 'Penyelidik POLYCC • Responden Agensi Luar',
                        detail: 'Kelulusan: Pengarah Institusi',
                      },
                      {
                        cat: 'CAT_3' as ResearchCategory,
                        label: 'Kategori III',
                        desc: 'Penyelidik POLYCC A • Responden POLYCC B',
                        detail: 'Kelulusan: Pengarah PPI',
                      },
                      {
                        cat: 'CAT_4' as ResearchCategory,
                        label: 'Kategori IV',
                        desc: 'Penyelidik Agensi Luar • Responden POLYCC',
                        detail: 'Kelulusan: Pengarah PPI',
                      },
                      {
                        cat: 'CAT_5' as ResearchCategory,
                        label: 'Kategori V',
                        desc: 'Penyelidik Pensyarah Sambung Belajar/Pelajar IPT • Responden Agensi Luar',
                        detail: 'Kelulusan: Pengarah PPI',
                      },
                    ].map((item) => (
                      <label
                        key={item.cat}
                        className={`flex items-start p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          researchCategory === item.cat
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="researchCategory"
                          value={item.cat}
                          checked={researchCategory === item.cat}
                          onChange={() => setResearchCategory(item.cat)}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="ml-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{item.label}</span>
                            <span className="text-[11px] font-medium text-emerald-800">({item.desc})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-normal mt-0.5 block">{item.detail}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Pilihan Bahasa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Bahasa Dokumen Yang Dijana <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <label
                    className={`flex items-center justify-center p-3 rounded-xl border-2 text-xs font-bold cursor-pointer transition-all ${
                      language === 'MS'
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value="MS"
                      checked={language === 'MS'}
                      onChange={() => setLanguage('MS')}
                      className="sr-only"
                    />
                    <span>Bahasa Melayu</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-3 rounded-xl border-2 text-xs font-bold cursor-pointer transition-all ${
                      language === 'EN'
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value="EN"
                      checked={language === 'EN'}
                      onChange={() => setLanguage('EN')}
                      className="sr-only"
                    />
                    <span>English</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: MAKLUMAT PEMOHON ================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Langkah 2: Maklumat Pemohon / Ketua Penyelidik
                </h3>
                <p className="text-xs text-slate-500">
                  Maklumat ketua kumpulan atau penyelidik utama bagi rekod permohonan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Ketua */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penuh &amp; Gelaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chiefName}
                    onChange={(e) => setChiefName(e.target.value.toUpperCase())}
                    placeholder="DR. AHMAD FAUZI BIN ISMAIL"
                    className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                </div>

                {/* No. Kad Pengenalan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Kad Pengenalan (MyKad) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chiefIc}
                    onChange={handleChiefIcChange}
                    placeholder="000000-00-0000"
                    maxLength={14}
                    className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Format: 000000-00-0000 (12 digit)</p>
                </div>

                {/* No. Telefon */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telefon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chiefPhone}
                    onChange={(e) => setChiefPhone(e.target.value)}
                    placeholder="012-3456789"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                </div>

                {/* Emel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emel
                  </label>
                  <input
                    type="email"
                    value={chiefEmail}
                    onChange={(e) => setChiefEmail(e.target.value)}
                    placeholder="shamsuddin.amin@yahoo.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                </div>

                {/* Jabatan / Fakulti */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan / Fakulti
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value.toUpperCase())}
                    placeholder="Unit Kulinari"
                    className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                </div>

                {/* Institusi */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institusi / Politeknik / Kolej Komuniti / Agensi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value.toUpperCase())}
                    placeholder="Politeknik Sultan Salahuddin Abdul Aziz Shah"
                    className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                </div>

                {/* Extra PPP Fields for Cat IV & V (pages 10 & 11) */}
                {isPppStructure && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pekerjaan / Jawatan
                      </label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value.toUpperCase())}
                        placeholder="Penyelidik Pasca Doktoral"
                        className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tahun Pengajian (Jika Pelajar IPTA/S)
                      </label>
                      <input
                        type="text"
                        value={studyYear}
                        onChange={(e) => setStudyYear(e.target.value.toUpperCase())}
                        placeholder="Tahun 2 (Semester 4)"
                        className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Kediaman / Surat Menyurat
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value.toUpperCase())}
                        placeholder="Alamat lengkap pemohon"
                        className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat &amp; No. Telefon Institusi Pemohon
                      </label>
                      <input
                        type="text"
                        value={institutionAddress}
                        onChange={(e) => setInstitutionAddress(e.target.value.toUpperCase())}
                        placeholder="Alamat universiti / agensi luar dan No. Tel"
                        className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: MAKLUMAT AHLI & PENTADBIRAN ================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Langkah 3: Maklumat Ahli Kumpulan &amp; Maklumat Pentadbiran
                </h3>
                <p className="text-xs text-slate-500">
                  Tambah ahli projek (jika ada) serta pegawai pentadbiran bagi pengesahan dokumen.
                </p>
              </div>

              {/* Dynamic Members Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Senarai Ahli Projek (Maksimum {maxMembers} Orang - {members.length}/{maxMembers})
                  </label>
                  {members.length < maxMembers && (
                    <button
                      type="button"
                      onClick={addMember}
                      className="inline-flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Ahli</span>
                    </button>
                  )}
                </div>

                {members.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    Tiada ahli tambahan direkodkan. Klik "+ Tambah Ahli" sekiranya projek melibatkan ahli kumpulan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member, idx) => (
                      <div
                        key={member.id || idx}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-bold text-slate-700">
                            Ahli {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMember(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 text-xs"
                            title="Padam Ahli"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Nama Penuh Ahli
                            </label>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateMemberField(idx, 'name', e.target.value.toUpperCase())}
                              placeholder="NAMA PENUH AHLI"
                              className="w-full text-xs uppercase px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              No. Kad Pengenalan Ahli (MyKad)
                            </label>
                            <input
                              type="text"
                              value={member.icNumber}
                              onChange={(e) => updateMemberField(idx, 'icNumber', e.target.value)}
                              placeholder="000000-00-0000"
                              maxLength={14}
                              className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">Format: 000000-00-0000</p>
                          </div>

                          {appType !== 'INOVASI' && (
                            <>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  No. Telefon
                                </label>
                                <input
                                  type="text"
                                  value={member.phone}
                                  onChange={(e) => updateMemberField(idx, 'phone', e.target.value)}
                                  placeholder="01X-XXXXXXX"
                                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Jabatan Ahli
                                </label>
                                <input
                                  type="text"
                                  value={member.department}
                                  onChange={(e) => updateMemberField(idx, 'department', e.target.value.toUpperCase())}
                                  placeholder="Unit Teknologi Elektrik"
                                  className="w-full text-xs uppercase px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Institusi Ahli
                            </label>
                            <input
                              type="text"
                              value={member.institution}
                              onChange={(e) => updateMemberField(idx, 'institution', e.target.value.toUpperCase())}
                              placeholder="Kolej Komuniti Beaufort"
                              className="w-full text-xs uppercase px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Maklumat Pentadbiran (pages 7, 12, 14) */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Maklumat Pentadbiran Bagi Tandatangan &amp; Pengesahan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama KUPIK (Ketua Unit Inovasi)
                    </label>
                    <input
                      type="text"
                      value={kupikName}
                      onChange={(e) => setKupikName(e.target.value.toUpperCase())}
                      placeholder="Norfazirah binti Kusin"
                      className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Timbalan Pengarah
                    </label>
                    <input
                      type="text"
                      value={deputyDirectorName}
                      onChange={(e) => setDeputyDirectorName(e.target.value.toUpperCase())}
                      placeholder="Azlenah bte Mohd Sen"
                      className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Pengarah Institusi
                    </label>
                    <input
                      type="text"
                      value={directorName}
                      onChange={(e) => setDirectorName(e.target.value.toUpperCase())}
                      placeholder="Ts. Julkifli bin Ag. Besar"
                      className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {appType === 'PENYELIDIKAN' && researchCategory !== 'CAT_1' && researchCategory !== 'CAT_2' && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Pengarah PPI (Pusat Penyelidikan &amp; Inovasi)
                    </label>
                    <input
                      type="text"
                      value={ppiDirectorName}
                      onChange={(e) => setPpiDirectorName(e.target.value.toUpperCase())}
                      placeholder="Nama Pengarah PPI JPPKK"
                      className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4: MAKLUMAT INOVASI / PENYELIDIKAN ================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Langkah 4: Kandungan Cadangan {appType === 'INOVASI' ? 'Inovasi' : 'Penyelidikan'}
                </h3>
                <p className="text-xs text-slate-500">
                  Lengkapkan tajuk, latar belakang pengenalan, objektif serta butiran metodologi kajian.
                </p>
              </div>

              {/* Tajuk */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tajuk Permohonan {appType === 'INOVASI' ? 'Inovasi' : 'Penyelidikan'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitle(appType === 'INOVASI' ? val.toUpperCase() : val);
                  }}
                  placeholder="Sistem Pemantauan Pintar IoT Kualiti Udara Makmal..."
                  className={`w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 ${appType === 'INOVASI' ? 'uppercase' : ''}`}
                />
              </div>

              {/* Persidangan jika ada (Research) */}
              {appType === 'PENYELIDIKAN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Persidangan / Seminar (Jika Ada)
                  </label>
                  <input
                    type="text"
                    value={conference}
                    onChange={(e) => setConference(e.target.value)}
                    placeholder="National Innovation & Research Conference (NIRC)"
                    className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {/* Pengenalan (textarea besar) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pengenalan &amp; Latar Belakang <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="Latar belakang kajian, masalah dan sorotan literatur ringkas..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 leading-relaxed font-sans"
                />
              </div>

              {/* Objektif (textarea besar) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Objektif Kajian <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Nyatakan objektif-objektif utama kajian permohonan ini..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 leading-relaxed"
                />
              </div>

              {/* Metodologi (Penyelidikan) */}
              {appType === 'PENYELIDIKAN' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tempat / Lokasi Kajian
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Politeknik Ungku Omar"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Populasi &amp; Sampel
                    </label>
                    <input
                      type="text"
                      value={sample}
                      onChange={(e) => setSample(e.target.value)}
                      placeholder="120 orang pelajar"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Instrumen Kajian
                    </label>
                    <input
                      type="text"
                      value={instruments}
                      onChange={(e) => setInstruments(e.target.value)}
                      placeholder="Soal selidik Likert 5-mata"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Date pickers for PPP / Penyelidikan (pages 10 & 11) */}
              {isPppStructure && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Jadual &amp; Tempoh Kajian Penyelidikan (PPP)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tarikh Mula Kajian Rintis
                      </label>
                      <input
                        type="date"
                        value={pilotStartDate}
                        onChange={(e) => setPilotStartDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tarikh Akhir Kajian Rintis
                      </label>
                      <input
                        type="date"
                        value={pilotEndDate}
                        onChange={(e) => setPilotEndDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tarikh Mula Kajian Sebenar
                      </label>
                      <input
                        type="date"
                        value={actualStartDate}
                        onChange={(e) => setActualStartDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tarikh Akhir Kajian Sebenar
                      </label>
                      <input
                        type="date"
                        value={actualEndDate}
                        onChange={(e) => setActualEndDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tarikh Jangkaan Laporan Siap
                      </label>
                      <input
                        type="date"
                        value={expectedReportDate}
                        onChange={(e) => setExpectedReportDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 5: MAKLUMAT IMPAK ================= */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Langkah 5: Maklumat Impak &amp; Signifikan
                </h3>
                <p className="text-xs text-slate-500">
                  Nyatakan sumbangan dan faedah hasil projek/penyelidikan kepada pelbagai pihak.
                </p>
              </div>

              {/* Impak Kumpulan Sasaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Impak Kepada Kumpulan Sasaran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={impactTargetGroup}
                  onChange={(e) => setImpactTargetGroup(e.target.value)}
                  placeholder="Meningkatkan kebolehpasaran dan pemahaman konsep teknikal pelajar..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 leading-relaxed"
                />
              </div>

              {/* Impak Institusi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Impak Kepada Institusi / Politeknik / Kolej Komuniti <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={impactInstitution}
                  onChange={(e) => setImpactInstitution(e.target.value)}
                  placeholder="Meningkatkan penarafan akreditasi dan pensijilan kualiti institut..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 leading-relaxed"
                />
              </div>

              {/* Impak Jabatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Impak Kepada Jabatan (JPPKK)
                </label>
                <textarea
                  rows={3}
                  value={impactDepartment}
                  onChange={(e) => setImpactDepartment(e.target.value)}
                  placeholder="Mengautomasikan proses pengurusan makmal dan mengurangkan kos penyelenggaraan..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 6: SEMAKAN (REVIEW) ================= */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Langkah 6: Semak Maklumat Permohonan
                </h3>
                <p className="text-xs text-slate-500">
                  Sila semak butiran sebelum pengesahan dan penjanaan dokumen rasmi dilakukan.
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
                {/* Header info */}
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                      {appType} {appType === 'PENYELIDIKAN' ? `(${formatCategoryLabel(researchCategory)})` : ''} • {language === 'MS' ? 'Bahasa Melayu' : 'English'}
                    </span>
                    <h4 className="font-extrabold text-base text-slate-900 mt-0.5">{title}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    Sesi {editingApplication?.year || 2026}
                  </span>
                </div>

                {/* Grid info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ketua Pemohon / Penyelidik
                    </span>
                    <span className="font-bold text-slate-800">{chiefName}</span>
                    <p className="text-slate-500 font-mono text-[11px]">No. KP: {chiefIc}</p>
                    <p className="text-slate-500 text-[11px]">{chiefPhone} • {chiefEmail || 'Tiada emel'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Institusi &amp; Jabatan
                    </span>
                    <span className="font-bold text-slate-800">{institution}</span>
                    <p className="text-slate-500 text-[11px]">{department}</p>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ahli Projek ({members.length} Orang)
                  </span>
                  {members.length > 0 ? (
                    <div className="space-y-1">
                      {members.map((m, idx) => (
                        <div key={idx} className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 flex justify-between">
                          <span>{idx + 1}. <strong>{m.name}</strong> ({m.icNumber || '-'})</span>
                          <span className="text-slate-500">{m.department || institution}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Tiada ahli tambahan</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 7: JANA DOKUMEN & PENGESAHAN ================= */}
          {step === 7 && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-red-600/10 text-red-600 border border-red-200 mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                  Sahkan &amp; Jana Dokumen Rasmi
                </h3>
              </div>

              {isGenerating ? (
                <div className="max-w-md mx-auto p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-center space-x-2 text-sm font-bold text-red-700">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sedang menjana dokumen rasmi... {generationProgress}%</span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Menggantikan placeholder templat, menjana surat pelantikan &amp; kertas cadangan...
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-red-50/60 border border-red-200 rounded-2xl max-w-lg mx-auto text-left space-y-3">
                  <div className="text-xs font-bold text-red-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600" />
                    <span>Dokumen yang akan dijana serta-merta:</span>
                  </div>
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                    {appType === 'INOVASI' ? (
                      <>
                        <li>Surat Pelantikan Kumpulan Projek Inovasi ({language})</li>
                        <li>Kertas Cadangan Projek Inovasi ({language})</li>
                      </>
                    ) : (
                      <>
                        <li>Surat Pelantikan Penyelidik ({language})</li>
                        <li>Borang Lampiran A / Borang PPP ({language})</li>
                        <li>Kertas Cadangan Penyelidikan ({language})</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Bottom Navigation Actions */}
        <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              id="btn-form-prev"
              type="button"
              onClick={prevStep}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <button
              id="btn-form-cancel"
              type="button"
              onClick={() => setActiveView('user_dashboard')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Batal
            </button>
          )}

          {step < 7 ? (
            <button
              id="btn-form-next"
              type="button"
              onClick={nextStep}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all"
            >
              <span>{step === 6 ? 'Sahkan & Teruskan' : 'Seterusnya'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="btn-form-generate"
              type="button"
              onClick={handleFinalSubmit}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menjana Dokumen...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Sahkan &amp; Jana Dokumen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
