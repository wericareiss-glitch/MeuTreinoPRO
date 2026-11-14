import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { 
  Trophy, 
  Share2, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  FileText,
  Dumbbell,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Eye,
  Loader2,
  MessageCircle,
  FileSpreadsheet,
  FileDown,
  History,
  Calendar,
  Pencil,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { MuscleGroup, WorkoutSessionSummary } from '../types/workout';
import { generateWorkoutCardImage } from '../utils/generateWorkoutCardImage';
import { extractSessionPRs, estimate1RM } from '../utils/prEngine';
import { exportCompletedSessionToPDF } from '../utils/pdfExport';
import { recalculateSessionSummary } from '../utils/sessionEditor';
import { WorkoutPdfExportModal } from './WorkoutPdfExportModal';

interface ExercisePerformanceHistoryEntry {
  sessionId: string;
  dateIso: string;
  formattedDate: string;
  splitName: string;
  isCurrentSession: boolean;
  setsCount: number;
  topWeight: number;
  topReps: number;
  estimated1RM: number;
  volumeLoadKg: number;
  setsDetail: string;
}

const HISTORY_ROW_HEIGHT = 76;

const VirtualizedExerciseHistoryRow = React.memo(
  ({ index, style, data }: ListChildComponentProps<ExercisePerformanceHistoryEntry[]>) => {
    const entry = data[index];
    if (!entry) return null;

    return (
      <div style={style} className="px-1 py-1">
        <div
          className={`h-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
            entry.isCurrentSession
              ? 'bg-emerald-950/35 border-emerald-500/45 shadow-sm'
              : 'bg-[#090f1d] border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
                <span>{entry.formattedDate}</span>
              </span>
              {entry.isCurrentSession && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Sessão Atual
                </span>
              )}
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                · {entry.splitName}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
              {entry.setsCount} {entry.setsCount === 1 ? 'série' : 'séries'}: {entry.setsDetail}
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <div className="text-xs font-black text-emerald-400">
              {entry.topWeight} kg &times; {entry.topReps}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1.5">
              <span>1RM ~{entry.estimated1RM}kg</span>
              <span>·</span>
              <span className="text-sky-400 font-bold">
                {entry.volumeLoadKg.toLocaleString('pt-BR')}kg
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

interface EditableExerciseDraft {
  name: string;
  muscleKey?: MuscleGroup;
  muscleGroup: string;
  sets: { weight: string; reps: string }[];
}

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkoutSessionSummary | null;
  athleteName: string;
  previousSessions?: WorkoutSessionSummary[];
  onUpdateSession?: (updated: WorkoutSessionSummary) => void;
  initialEditMode?: boolean;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  onClose,
  session,
  athleteName,
  previousSessions = [],
  onUpdateSession,
  initialEditMode = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'image_card'>('details');
  const [cardFormat, setCardFormat] = useState<'story' | 'post'>('story');
  const [cardImage, setCardImage] = useState<{ blob: Blob; dataUrl: string; file: File } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(Boolean(initialEditMode && onUpdateSession));
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [draftExercises, setDraftExercises] = useState<EditableExerciseDraft[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const historyContainerRef = useRef<HTMLDivElement | null>(null);
  const [historyListWidth, setHistoryListWidth] = useState<number>(460);

  const hydrateEditDraft = useCallback((target: WorkoutSessionSummary | null) => {
    if (!target) {
      setDraftNotes('');
      setDraftExercises([]);
      setEditError(null);
      return;
    }
    setDraftNotes(target.notes || '');
    setDraftExercises(
      (target.completedExercises || []).map((ex) => ({
        name: ex.name,
        muscleKey: ex.muscleKey,
        muscleGroup: ex.muscleGroup,
        sets: (ex.sets || []).map((st) => ({
          weight: String(st.weight ?? 0),
          reps: String(st.reps ?? 0),
        })),
      }))
    );
    setEditError(null);
  }, []);

  useEffect(() => {
    if (!isOpen || !session) {
      setIsEditing(false);
      setEditError(null);
      return;
    }
    hydrateEditDraft(session);
    const shouldEdit = Boolean(initialEditMode && onUpdateSession);
    setIsEditing(shouldEdit);
    if (shouldEdit) {
      setActiveTab('details');
    }
  }, [isOpen, session, initialEditMode, onUpdateSession, hydrateEditDraft]);

  // Seleciona automaticamente o primeiro exercício da sessão ao abrir o modal
  useEffect(() => {
    if (session && session.completedExercises.length > 0) {
      setSelectedExerciseName((prev) => {
        const exists = session.completedExercises.some((e) => e.name === prev);
        return exists ? prev : session.completedExercises[0].name;
      });
    } else {
      setSelectedExerciseName('');
    }
  }, [session]);

  // Ajusta dinamicamente a largura do FixedSizeList (react-window) ao tamanho do modal
  useEffect(() => {
    if (!isOpen || activeTab !== 'details') return;
    const el = historyContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setHistoryListWidth(el.clientWidth);
      }
    };
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, [isOpen, activeTab, selectedExerciseName]);

  // Histórico completo de performance do exercício selecionado (suporta centenas de registros sem travar)
  const selectedExerciseHistory = useMemo<ExercisePerformanceHistoryEntry[]>(() => {
    if (!session || !selectedExerciseName) return [];
    const targetKey = selectedExerciseName.trim().toLowerCase();

    const sessionMap = new Map<string, WorkoutSessionSummary>();
    sessionMap.set(session.id, session);
    for (const prev of previousSessions) {
      if (prev && prev.id && !sessionMap.has(prev.id)) {
        sessionMap.set(prev.id, prev);
      }
    }

    const sortedSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const entries: ExercisePerformanceHistoryEntry[] = [];
    for (const sess of sortedSessions) {
      const matchedEx = sess.completedExercises?.find(
        (ex) => ex.name.trim().toLowerCase() === targetKey
      );
      if (!matchedEx || !matchedEx.sets || matchedEx.sets.length === 0) continue;

      let topWeight = 0;
      let topReps = 0;
      let best1RM = 0;
      let volumeLoadKg = 0;

      for (const st of matchedEx.sets) {
        const w = Number(st.weight) || 0;
        const r = Number(st.reps) || 0;
        volumeLoadKg += w * r;
        const est1RM = estimate1RM(w, r);
        if (w > topWeight || (w === topWeight && r > topReps)) {
          topWeight = w;
          topReps = r;
        }
        if (est1RM > best1RM) {
          best1RM = est1RM;
        }
      }

      const d = new Date(sess.date);
      const formattedDate = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });

      const setsDetail = matchedEx.sets
        .map((st) => `${st.weight || 0}kg×${st.reps || 0}`)
        .join(' · ');

      entries.push({
        sessionId: sess.id,
        dateIso: sess.date,
        formattedDate,
        splitName: sess.splitName,
        isCurrentSession: sess.id === session.id,
        setsCount: matchedEx.sets.length,
        topWeight,
        topReps,
        estimated1RM: best1RM,
        volumeLoadKg: Math.round(volumeLoadKg),
        setsDetail,
      });
    }

    return entries;
  }, [session, previousSessions, selectedExerciseName]);

  const handleSelectExercise = useCallback((name: string) => {
    setSelectedExerciseName(name);
  }, []);

  const liveDraftSummary = useMemo(() => {
    if (!session) return null;
    return recalculateSessionSummary({
      ...session,
      notes: draftNotes,
      completedExercises: draftExercises.map((ex) => ({
        name: ex.name,
        muscleKey: ex.muscleKey,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets.map((st) => ({
          weight: parseFloat(st.weight.replace(',', '.')) || 0,
          reps: parseInt(st.reps, 10) || 0,
        })),
      })),
    });
  }, [session, draftNotes, draftExercises]);

  const totalDraftSets = useMemo(
    () => draftExercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    [draftExercises]
  );

  const handleEnterEditMode = useCallback(() => {
    if (!session || !onUpdateSession) return;
    hydrateEditDraft(session);
    setActiveTab('details');
    setIsEditing(true);
  }, [session, onUpdateSession, hydrateEditDraft]);

  const handleCancelEdit = useCallback(() => {
    hydrateEditDraft(session);
    setIsEditing(false);
  }, [session, hydrateEditDraft]);

  const handleUpdateDraftSet = useCallback(
    (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
      setEditError(null);
      setDraftExercises((prev) =>
        prev.map((ex, eI) => {
          if (eI !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((st, sI) => (sI === setIdx ? { ...st, [field]: value } : st)),
          };
        })
      );
    },
    []
  );

  const handleAddDraftSet = useCallback((exIdx: number) => {
    setEditError(null);
    setDraftExercises((prev) =>
      prev.map((ex, eI) => {
        if (eI !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1] || { weight: '0', reps: '10' };
        return {
          ...ex,
          sets: [...ex.sets, { weight: last.weight, reps: last.reps }],
        };
      })
    );
  }, []);

  const handleRemoveDraftSet = useCallback((exIdx: number, setIdx: number) => {
    setDraftExercises((prev) => {
      const currentTotal = prev.reduce((sum, ex) => sum + ex.sets.length, 0);
      if (currentTotal <= 1) {
        setEditError('A sessão precisa manter pelo menos 1 série registrada.');
        return prev;
      }
      setEditError(null);
      return prev.map((ex, eI) => {
        if (eI !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.filter((_, sI) => sI !== setIdx),
        };
      });
    });
  }, []);

  const handleSaveEditedSession = useCallback(() => {
    if (!onUpdateSession || !liveDraftSummary) return;
    if (liveDraftSummary.totalSets <= 0) {
      setEditError('Adicione pelo menos 1 série antes de salvar.');
      return;
    }
    onUpdateSession(liveDraftSummary);
    setIsEditing(false);
    setShareFeedback('Alterações salvas com sucesso!');
    setTimeout(() => setShareFeedback(null), 3000);
  }, [onUpdateSession, liveDraftSummary]);

  // Extrai recordes pessoais batidos nesta sessão
  const sessionPRs = useMemo(() => {
    if (!session) return [];
    const olderSessions = previousSessions.filter(
      (s) => s.id !== session.id && new Date(s.date).getTime() < new Date(session.date).getTime()
    );
    return extractSessionPRs(session, olderSessions);
  }, [session, previousSessions]);

  // Generate image card automatically whenever modal opens with session or format changes
  useEffect(() => {
    if (!isOpen || !session) {
      setCardImage(null);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    generateWorkoutCardImage(session, athleteName, {
      format: cardFormat,
      prsCount: sessionPRs.length,
    })
      .then((res) => {
        if (isMounted) {
          setCardImage(res);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao gerar imagem do cartão de treino:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, session, athleteName, cardFormat, sessionPRs.length]);

  if (!isOpen || !session) return null;

  // Format date
  const sessionDate = new Date(session.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate max load across all sets
  let maxLift = 0;
  session.completedExercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (s.weight > maxLift) maxLift = s.weight;
    });
  });

  // Build clean text summary
  const buildShareText = () => {
    const lines = [
      `🏆 *TREINO CONCLUÍDO COM SUCESSO!*`,
      `⚡ *MeuTreino Pro — Hipertrofia Individualizada*`,
      `👤 Atleta: *${athleteName}*`,
      `📅 ${sessionDate}`,
      `💪 Divisão: *${session.splitName}*`,
      `🏋️‍♂️ Tonelagem Total: *${session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg*`,
      `🔥 Séries Efetivas Concluídas: *${session.totalSets}*`,
    ];

    if (maxLift > 0) {
      lines.push(`⚡ Carga Máxima da Sessão: *${maxLift} kg*`);
    }

    if (sessionPRs.length > 0) {
      lines.push('');
      lines.push('🔥 *NOVOS RECORDES PESSOAIS (PRs):*');
      sessionPRs.forEach((pr) => {
        lines.push(`• *${pr.exerciseName}*: ${pr.weight}kg × ${pr.reps} reps (+${pr.isWeightPR ? `${pr.diffWeight}kg na carga` : `${pr.diff1RM}kg no 1RM`})`);
      });
    }

    if (session.notes) {
      lines.push(`📝 Observações: _"${session.notes}"_`);
    }

    lines.push('');
    lines.push('📋 *Destaques dos Exercícios:*');
    session.completedExercises.forEach((ex, idx) => {
      let maxSet = ex.sets[0];
      ex.sets.forEach((s) => {
        if (s.weight > (maxSet?.weight || 0)) maxSet = s;
      });

      lines.push(`${idx + 1}. *${ex.name}* (${ex.sets.length} séries) · Top: *${maxSet?.weight || 0}kg x ${maxSet?.reps || 0}*`);
    });

    lines.push('');
    lines.push('⚡ _Hipertrofia individualizada e periodização com MeuTreino Pro._');
    return lines.join('\n');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(buildShareText());
    const a = document.createElement('a');
    a.href = `https://api.whatsapp.com/send?text=${text}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportSessionCSV = () => {
    if (!session) return;
    const headers = ['Data', 'Divisao', 'Exercicio', 'Serie', 'Carga (kg)', 'Reps'];
    const rows: string[][] = [];
    const dStr = new Date(session.date).toLocaleDateString('pt-BR');
    session.completedExercises.forEach((ex) => {
      ex.sets.forEach((s, sIdx) => {
        rows.push([
          `"${dStr}"`,
          `"${session.splitName}"`,
          `"${ex.name}"`,
          `"${sIdx + 1}"`,
          `"${s.weight}"`,
          `"${s.reps}"`
        ]);
      });
    });
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treino_${session.splitName.toLowerCase().replace(/\s+/g, '_')}_${new Date(session.date).toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShareFeedback('CSV exportado com sucesso!');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  // Direct download of the generated PNG card
  const handleDownloadImage = () => {
    if (!cardImage) return;
    const a = document.createElement('a');
    a.href = cardImage.dataUrl;
    a.download = cardImage.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setShareFeedback('Imagem baixada com sucesso!');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  // Copy image to clipboard (if supported)
  const handleCopyImage = async () => {
    if (!cardImage) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': cardImage.blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
        return;
      }
    } catch {
      // Fallback: download if copy direct image is restricted
      handleDownloadImage();
    }
  };

  // Smart Share with Image File
  const handleShare = async () => {
    const text = buildShareText();

    // Check if navigator.share is available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        // Try sharing WITH image file first
        if (cardImage?.file && navigator.canShare && navigator.canShare({ files: [cardImage.file] })) {
          await navigator.share({
            title: `Treino Concluído - ${athleteName}`,
            text: text,
            files: [cardImage.file],
          });
          setShareFeedback('Treino e imagem compartilhados com sucesso!');
          setTimeout(() => setShareFeedback(null), 3500);
          return;
        }

        // If file sharing is not supported by the environment, share text and trigger image download
        await navigator.share({
          title: `Treino Concluído - ${athleteName}`,
          text: text,
        });

        // Also download image so the user can easily attach it
        if (cardImage) {
          handleDownloadImage();
        }
      } catch (err: unknown) {
        // User aborted share or permission denied
        if (err instanceof Error && err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      // Fallback for desktop browsers without Web Share: copy text + download image
      handleCopy();
      if (cardImage) {
        handleDownloadImage();
      }
    }
  };

  const handleCopy = () => {
    const text = buildShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-emerald-500/30 rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl shadow-emerald-500/10 relative overflow-hidden ring-1 ring-emerald-500/20">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 text-center relative z-10 border-b border-slate-800/80 bg-[#0d1424]/90">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trophy Badge */}
          <div className="relative inline-block mb-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-400/25">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 text-slate-950">
              <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Parabéns, {athleteName}! 🏆
          </h2>
          <p className="text-xs sm:text-sm text-emerald-400 font-bold mt-1 flex items-center justify-center gap-1.5">
            <span>Sessão Concluída com Sucesso</span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-slate-300 uppercase tracking-wider text-[11px] font-extrabold bg-slate-800 px-2 py-0.5 rounded">
              {session.splitName}
            </span>
          </p>

          {/* Tabs: Detalhes vs Cartão Imagem vs Editar Registro */}
          <div className="flex items-center justify-center flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                if (isEditing) handleCancelEdit();
                setActiveTab('details');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !isEditing && activeTab === 'details'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Resumo & Métricas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isEditing) handleCancelEdit();
                setActiveTab('image_card');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !isEditing && activeTab === 'image_card'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Cartão de Imagem (PNG)</span>
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {onUpdateSession && (
              <button
                type="button"
                onClick={isEditing ? handleCancelEdit : handleEnterEditMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isEditing
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-slate-800/60 text-amber-300 hover:bg-amber-500/15 border border-amber-500/25'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Editando Registro' : 'Editar Sessão'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modo Edição de Sessão Concluída */}
        {isEditing && liveDraftSummary && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Prévia em tempo real das métricas recalculadas */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-emerald-500/30 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Tonelagem Recalculada
                </span>
                <div className="text-lg font-black font-mono text-white mt-0.5">
                  {liveDraftSummary.totalVolumeLoadKg.toLocaleString('pt-BR')}{' '}
                  <span className="text-[10px] font-normal text-slate-400">kg</span>
                </div>
              </div>
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-sky-500/30 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                  Séries Válidas
                </span>
                <div className="text-lg font-black font-mono text-sky-400 mt-0.5">
                  {liveDraftSummary.totalSets}
                </div>
              </div>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-semibold text-center">
                {editError}
              </div>
            )}

            {/* Notas da Sessão */}
            <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <label
                htmlFor="edit-session-notes"
                className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notas da Sessão</span>
              </label>
              <textarea
                id="edit-session-notes"
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={2}
                placeholder="Ex.: Boa execução, carga controlada, aumentar 2kg na próxima..."
                className="w-full bg-[#070b14] border border-slate-800 focus:border-emerald-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
              />
            </div>

            {/* Lista de Exercícios e Séries Editáveis */}
            <div className="space-y-3">
              {draftExercises.map((ex, exIdx) => (
                <div
                  key={`${ex.name}_${exIdx}`}
                  className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-sky-400 block">
                        {ex.muscleGroup}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {ex.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddDraftSet(exIdx)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Série</span>
                    </button>
                  </div>

                  {ex.sets.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">
                      Nenhuma série restante (este exercício será removido ao salvar).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ex.sets.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 bg-[#070b14] border border-slate-800/80 rounded-xl p-2"
                        >
                          <span className="text-[11px] font-mono font-black text-slate-400 px-1.5">
                            S{sIdx + 1}
                          </span>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                              Carga (kg)
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              min="0"
                              value={st.weight}
                              onChange={(e) =>
                                handleUpdateDraftSet(exIdx, sIdx, 'weight', e.target.value)
                              }
                              aria-label={`Carga da série ${sIdx + 1} de ${ex.name}`}
                              className="w-full bg-[#0f172a] border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                              Reps
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              step="1"
                              min="0"
                              value={st.reps}
                              onChange={(e) =>
                                handleUpdateDraftSet(exIdx, sIdx, 'reps', e.target.value)
                              }
                              aria-label={`Repetições da série ${sIdx + 1} de ${ex.name}`}
                              className="w-full bg-[#0f172a] border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftSet(exIdx, sIdx)}
                            disabled={totalDraftSets <= 1}
                            title={
                              totalDraftSets <= 1
                                ? 'A sessão precisa de pelo menos 1 série'
                                : 'Remover esta série'
                            }
                            aria-label={`Remover série ${sIdx + 1} de ${ex.name}`}
                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer self-end"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Detailed Interactive View */}
        {!isEditing && activeTab === 'details' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Key KPI Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Tonelagem Total */}
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-emerald-500/30 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Tonelagem Total</span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-white">
                  {session.totalVolumeLoadKg.toLocaleString('pt-BR')}{' '}
                  <span className="text-[10px] font-normal text-slate-400">kg</span>
                </div>
                <span className="text-[9px] text-slate-400">volume de carga pura</span>
              </div>

              {/* Total de Séries */}
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-sky-500/30 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Séries Válidas</span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-sky-400">
                  {session.totalSets}
                </div>
                <span className="text-[9px] text-slate-400">estímulos efetivos</span>
              </div>

              {/* Carga Máxima */}
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-amber-500/30 text-center col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Carga Máxima</span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-300">
                  {maxLift > 0 ? `${maxLift} kg` : `${session.completedExercises.length} exerc.`}
                </div>
                <span className="text-[9px] text-slate-400">pico de sobrecarga</span>
              </div>
            </div>

            {/* Novos Recordes Pessoais (PRs) Batidos nesta Sessão */}
            {sessionPRs.length > 0 && (
              <div className="bg-gradient-to-br from-[#1a1307] via-[#140e04] to-[#0c0902] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-xl shadow-amber-500/10 animate-fadeIn">
                <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Flame className="w-4 h-4 fill-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-300">
                        🔥 Novos Recordes Pessoais (PRs) Batidos!
                      </h4>
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        {sessionPRs.length} superação(ões) histórica(s) nesta sessão
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Novo Pico
                  </span>
                </div>

                <div className="space-y-1.5">
                  {sessionPRs.map((pr, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/70 border border-amber-500/25 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-white block truncate">{pr.exerciseName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {pr.weight}kg × {pr.reps} reps
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-amber-400 block text-xs sm:text-sm">
                          +{pr.isWeightPR ? `${pr.diffWeight}kg na carga` : `${pr.diff1RM}kg no 1RM`}
                        </span>
                        <span className="text-[9px] text-amber-300/80 font-bold uppercase">
                          {pr.isWeightPR ? 'Carga Máxima' : '1RM Estimado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Notes if provided */}
            {session.notes && (
              <div className="bg-[#080e1b] border border-purple-500/25 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">
                    Notas Registradas na Sessão:
                  </span>
                  <p className="text-xs text-slate-200 italic font-medium">
                    &ldquo;{session.notes}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Exercise-by-Exercise Highlights (Clicáveis para ver o histórico de performance) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Desempenho dos Exercícios</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Toque em um exercício para ver seu histórico
                </span>
              </div>

              <div className="space-y-2">
                {session.completedExercises.map((ex, idx) => {
                  let topSet = ex.sets[0];
                  ex.sets.forEach((s) => {
                    if (s.weight > (topSet?.weight || 0)) topSet = s;
                  });
                  const isSelected = selectedExerciseName === ex.name;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectExercise(ex.name)}
                      className={`w-full text-left p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/25 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-md'
                          : 'bg-[#0b1220] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                            {ex.muscleGroup}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {ex.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {ex.sets.length} {ex.sets.length === 1 ? 'série completada' : 'séries completadas'}
                        </span>
                      </div>

                      {/* Top Set Pill */}
                      <div className="bg-[#121c2e] px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Top Set:
                        </span>
                        <strong className="text-emerald-400 font-black">
                          {topSet?.weight || 0} kg &times; {topSet?.reps || 0}
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Histórico de Performance Virtualizado (react-window) para o Exercício Selecionado */}
            {selectedExerciseName && (
              <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-white truncate">
                        Histórico de Performance: {selectedExerciseName}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">
                        {selectedExerciseHistory.length}{' '}
                        {selectedExerciseHistory.length === 1
                          ? 'registro encontrado'
                          : 'registros encontrados'}
                      </span>
                    </div>
                  </div>

                  {/* Seletor rápido de exercício caso haja mais de 1 exercício na sessão */}
                  {session.completedExercises.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {session.completedExercises.map((ex, i) => {
                        const active = ex.name === selectedExerciseName;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectExercise(ex.name)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                              active
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {ex.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div ref={historyContainerRef} className="w-full">
                  {selectedExerciseHistory.length > 0 ? (
                    <List
                      height={Math.min(
                        HISTORY_ROW_HEIGHT * 4,
                        Math.max(HISTORY_ROW_HEIGHT, selectedExerciseHistory.length * HISTORY_ROW_HEIGHT)
                      )}
                      itemCount={selectedExerciseHistory.length}
                      itemSize={HISTORY_ROW_HEIGHT}
                      width={historyListWidth}
                      itemData={selectedExerciseHistory}
                      overscanCount={4}
                    >
                      {VirtualizedExerciseHistoryRow}
                    </List>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Nenhum histórico anterior registrado para este exercício.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Visual Image Card Preview */}
        {!isEditing && activeTab === 'image_card' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 flex flex-col items-center">
            {/* Format Selector: Story do Instagram (9:16) vs Feed */}
            <div className="flex items-center gap-1.5 bg-[#0b1220] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCardFormat('story')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'story'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Story do Instagram (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setCardFormat('post')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'post'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Card Compacto (Feed)</span>
              </button>
            </div>

            {isGenerating ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-xs font-semibold">Renderizando Story gráfico em alta resolução...</p>
              </div>
            ) : cardImage ? (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="relative group rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black max-h-[46vh] flex items-center justify-center">
                  <img
                    src={cardImage.dataUrl}
                    alt="Cartão de Treino Concluído"
                    className="max-h-[46vh] w-auto object-contain rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Story PNG</span>
                    </button>
                  </div>
                </div>

                {/* Sub-actions for the Image Card */}
                <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Imagem PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedImage ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Imagem Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Imagem</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-center flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Pronto para publicar no Instagram Stories, WhatsApp Status ou enviar para seu treinador!</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-rose-400 text-xs">
                Não foi possível gerar a imagem. Tente novamente.
              </div>
            )}
          </div>
        )}

        {/* Share Feedback Toast Banner */}
        {shareFeedback && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Modal Footer: Action Buttons */}
        {isEditing ? (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0d1424] flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveEditedSession}
              className="flex-1 py-3 px-5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Alterações da Sessão</span>
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0d1424] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>Compartilhar Treino + Imagem</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={!cardImage}
                className="py-3 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-400 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Baixar Cartão em PNG"
              >
                <Download className="w-4 h-4" />
                <span className="hidden xs:inline">Baixar Card</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="py-3 px-3 rounded-xl font-bold text-xs bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-500/40 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                title="Compartilhar no WhatsApp com formatação"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                <span className="hidden xs:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportCompletedSessionToPDF(session, athleteName);
                  setShareFeedback('Relatório em PDF baixado com sucesso!');
                  setTimeout(() => setShareFeedback(null), 3000);
                }}
                className="py-3 px-3 rounded-xl font-bold text-xs bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                title="Baixar relatório completo da sessão concluída em PDF A4"
              >
                <FileDown className="w-4 h-4 text-sky-400" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(true)}
                className="py-3 px-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                title="Visualizar e imprimir folha A4"
              >
                <Eye className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline">Ver A4</span>
              </button>

              <button
                type="button"
                onClick={handleExportSessionCSV}
                className="py-3 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Exportar dados desta sessão em CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="hidden xs:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="py-3 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Copiar texto para colar"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden xs:inline">Texto</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* Modal de Pré-visualização e Impressão A4 da Sessão Concluída */}
      <WorkoutPdfExportModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        session={session}
        athleteName={athleteName}
      />
    </div>
  );
};
