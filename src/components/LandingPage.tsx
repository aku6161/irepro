import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  FileText, 
  Layers, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  Award, 
  GraduationCap, 
  FolderArchive,
  BarChart3,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onOpenUserLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenUserLogin, onOpenAdminLogin }) => {
  const { stats, setActiveView, userRole, isAdmin } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic density based on screen size
    const particleCount = Math.min(85, Math.floor(width / 15));
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
      });
    }

    // Mouse positioning
    const mouse = {
      x: null as number | null,
      y: null as number | null,
      maxDistance: 135,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Create radial glow in the center for that nice tech atmosphere
      const glow = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      glow.addColorStop(0, '#1c0412'); // very subtle purple glow center
      glow.addColorStop(1, '#070104'); // dark black edges
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Update & Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Boundary collision
        if (p.x < 0 || p.x > width) p.vx = -p.vx;
        if (p.y < 0 || p.y > height) p.vy = -p.vy;

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(219, 39, 119, 0.85)'; // rose-600 / pink-rose dots
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(219, 39, 119, 0.7)';
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Draw connecting lines between particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 115) {
            const alpha = (1 - dist / 115) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(219, 39, 119, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // Draw mouse interaction lines
      if (mouse.x !== null && mouse.y !== null) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.maxDistance) {
            const alpha = (1 - dist / mouse.maxDistance) * 0.42;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`; // brighter rose-500
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const totalInv = stats?.totalInnovation ?? 18;
  const totalRes = stats?.totalResearch ?? 24;
  const totalApp = stats?.totalApplications ?? (totalInv + totalRes);
  const totalApplicants = stats?.totalApplicants ?? 35;

  return (
    <div className="min-h-screen relative text-slate-100 flex flex-col justify-between selection:bg-red-600 selection:text-white overflow-hidden bg-[#070104]">
      {/* Moving Constellation Plexus Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-800/40 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Ministry / Institutional Tag */}
            <div className="inline-flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 rounded-full px-3.5 py-1.5 mb-6 text-xs text-red-300 font-medium">
              <GraduationCap className="w-4 h-4 text-red-400" />
              <span>Unit Penyelidikan, Inovasi &amp; Komersialan</span>
            </div>

            {/* Main Hero Logo Banner */}
            <div className="flex flex-col items-center justify-center mb-5">
              <img
                src="/hero-logo.png"
                alt="iREPRO POLYCC - Innovation &amp; Research Proposal"
                className="w-full max-w-md sm:max-w-lg md:max-w-xl h-auto object-contain mx-auto drop-shadow-xl"
              />
            </div>
            <p className="text-base sm:text-lg text-slate-400 mb-8 font-normal leading-relaxed">
              Platform Digital Rasmi bagi Penyediaan, Penjanaan Dokumen, Penyimpanan Berpusat dan Perekodan Data Permohonan Inovasi &amp; Penyelidikan Kolej Komuniti Beaufort.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
              <button
                id="btn-hero-login"
                onClick={onOpenUserLogin}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-red-600/25 transition-all transform hover:-translate-y-0.5"
              >
                <span>Log Masuk Pemohon</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="btn-hero-admin"
                onClick={onOpenAdminLogin}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-red-950/40 text-red-300 border border-red-500/40 font-semibold text-sm px-5 py-3.5 rounded-xl transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <span>Pentadbir (KUPIK)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Statistics Section */}
      <div className="relative bg-slate-950/20 backdrop-blur-xs border-b border-slate-800/40 py-10 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Statistik Keseluruhan iREPRO
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Stat 1: Total Applications */}
            <div className="bg-slate-900/30 backdrop-blur-xs border border-slate-800/60 p-5 rounded-2xl text-center hover:border-slate-700/80 transition-all shadow-xs hover:scale-102">
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1 font-serif">
                {totalApp}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Jumlah Permohonan
              </div>
            </div>

            {/* Stat 2: Innovation */}
            <div className="bg-slate-900/30 backdrop-blur-xs border border-slate-800/60 p-5 rounded-2xl text-center hover:border-red-900/50 transition-all shadow-xs hover:scale-102">
              <div className="text-3xl sm:text-4xl font-extrabold text-red-400 mb-1 font-serif">
                {totalInv}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Jumlah Inovasi
              </div>
            </div>

            {/* Stat 3: Research */}
            <div className="bg-slate-900/30 backdrop-blur-xs border border-slate-800/60 p-5 rounded-2xl text-center hover:border-emerald-900/50 transition-all shadow-xs hover:scale-102">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mb-1 font-serif">
                {totalRes}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Jumlah Penyelidikan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Functions / Feature Cards */}
      <div className="relative py-16 bg-slate-900/10 backdrop-blur-xs border-b border-slate-800/40 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Fungsi Utama Platform iREPRO
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-slate-950/45 backdrop-blur-xs border border-slate-800/60 p-6 rounded-2xl hover:border-red-700/60 transition-all hover:scale-[1.02] shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                1. Penjanaan Dokumen Automatik
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Menjana Surat Lantikan, Kertas Cadangan, Lampiran A, dan Borang PPP mengikut templat piawai rasmi JPPKK dalam Bahasa Melayu atau Bahasa Inggeris.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-950/45 backdrop-blur-xs border border-slate-800/60 p-6 rounded-2xl hover:border-emerald-700/60 transition-all hover:scale-[1.02] shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                2. Satu Kali Pengisian (One Time Entry)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pengguna hanya perlu memasukkan data permohonan sekali sahaja. Data diselaraskan secara automatik ke fail surat, kertas kerja, dan pangkalan data berpusat.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-950/45 backdrop-blur-xs border border-slate-800/60 p-6 rounded-2xl hover:border-indigo-700/60 transition-all hover:scale-[1.02] shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                <FolderArchive className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                3. Integrasi Drive &amp; Sheets
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Penyimpanan fail dokumen dalam Google Drive berstruktur mengikut tahun dan Application ID, serta penyelarasan rekod ke Google Sheets inovasi &amp; penyelidikan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Disclaimer Banner as mandated in spec */}
      <div className="relative bg-slate-950/30 backdrop-blur-xs py-6 border-b border-slate-800/40 text-xs text-slate-400 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-left">
            <ShieldCheck className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-200">Kenyataan Operasi Sistem:</span> iREPRO berfungsi sebagai platform digital bagi pengisian data, penjanaan dokumen rasmi, penyimpanan berpusat dan paparan statistik.
            </div>
          </div>
          <button
            onClick={() => setActiveView('panduan')}
            className="text-xs text-red-400 hover:text-red-300 font-semibold underline shrink-0"
          >
            Baca Panduan Penuh »
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-slate-950/40 backdrop-blur-xs py-8 text-xs text-slate-500 border-t border-slate-800/40 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-300">iREPRO (Innovation &amp; Research Proposal)</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dibangunkan untuk Unit Penyelidikan, Inovasi dan Komersialan POLYCC.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <button onClick={() => setActiveView('panduan')} className="hover:text-slate-300">
              Panduan
            </button>
            <button onClick={() => setActiveView('hubungi')} className="hover:text-slate-300">
              Hubungi Kami
            </button>
            <span>•</span>
            <span className="text-slate-400">Pembangun: Shamsuddin Amin</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
