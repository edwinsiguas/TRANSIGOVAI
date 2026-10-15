/**
 * DocBadge — Indicador de estado de documento con vencimiento
 *
 * Verde  → Vigente  (vence en > 30 días)
 * Amarillo → Por vencer (vence en ≤ 30 días)
 * Rojo   → Vencido  (ya expiró)
 * Gris   → Sin datos registrados
 */

import { AlertCircle, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

type DocStatus = 'vigente' | 'por_vencer' | 'vencido' | 'sin_datos';

const WARN_DAYS = 30; // días antes de vencimiento para mostrar amarillo

export function getDocStatus(fechaVencimiento?: string | null): DocStatus {
  if (!fechaVencimiento) return 'sin_datos';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento + 'T00:00:00');
  const diffMs  = vence.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0)            return 'vencido';
  if (diffDays <= WARN_DAYS)   return 'por_vencer';
  return 'vigente';
}

export function getDaysLeft(fechaVencimiento?: string | null): number | null {
  if (!fechaVencimiento) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento + 'T00:00:00');
  return Math.ceil((vence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface DocBadgeProps {
  label: string;
  fecha?: string | null;
  /** Si se pasa, sobrescribe el cálculo automático */
  statusOverride?: DocStatus;
}

const CONFIG: Record<DocStatus, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
  vigente: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Vigente',
  },
  por_vencer: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'Por vencer',
  },
  vencido: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: <AlertCircle className="w-3 h-3" />,
    label: 'Vencido',
  },
  sin_datos: {
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-slate-200',
    icon: <HelpCircle className="w-3 h-3" />,
    label: 'Sin datos',
  },
};

export function DocBadge({ label, fecha, statusOverride }: DocBadgeProps) {
  const status = statusOverride ?? getDocStatus(fecha);
  const days   = getDaysLeft(fecha);
  const cfg    = CONFIG[status];

  let subtitle = '';
  if (fecha && days !== null) {
    if (status === 'vencido')    subtitle = `Vencido hace ${Math.abs(days)}d`;
    else if (status === 'por_vencer') subtitle = `Vence en ${days}d`;
    else                         subtitle = `Vence en ${days}d`;
  }

  return (
    <div className={`inline-flex flex-col px-2.5 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border} min-w-[80px]`}>
      <div className={`flex items-center gap-1 ${cfg.text}`}>
        {cfg.icon}
        <span className="text-[10px] font-extrabold uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-[10px] font-semibold mt-0.5 ${cfg.text} opacity-80`}>
        {status === 'sin_datos' ? 'No registrado' : subtitle}
      </span>
    </div>
  );
}
