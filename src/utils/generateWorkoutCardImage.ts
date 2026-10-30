/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary } from '../types/workout';

// Helper to draw rounded rectangle with cross-browser fallback
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Generates a high-resolution, social-ready image card for the workout session.
 * Rendered at 1080px width, crisp typography, dark theme and gold/emerald highlights.
 */
export async function generateWorkoutCardImage(
  session: WorkoutSessionSummary,
  athleteName: string
): Promise<{ blob: Blob; dataUrl: string; file: File }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  const width = 1080;
  
  // Calculate height dynamically based on items
  const baseHeaderHeight = 440;
  const notesHeight = session.notes ? 90 : 0;
  const exerciseRowHeight = 92;
  const exerciseCount = Math.min(session.completedExercises.length, 8);
  const footerHeight = 130;
  const totalHeight = Math.max(1080, baseHeaderHeight + notesHeight + (exerciseCount * exerciseRowHeight) + footerHeight);

  canvas.width = width;
  canvas.height = totalHeight;

  // 1. Deep luxury athletic background
  const bgGradient = ctx.createLinearGradient(0, 0, width, totalHeight);
  bgGradient.addColorStop(0, '#0a0f1d');
  bgGradient.addColorStop(0.5, '#070b14');
  bgGradient.addColorStop(1, '#05070d');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, totalHeight);

  // Radial glow accents
  const glow1 = ctx.createRadialGradient(200, 150, 20, 200, 150, 450);
  glow1.addColorStop(0, 'rgba(16, 185, 129, 0.15)'); // emerald
  glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, totalHeight);

  const glow2 = ctx.createRadialGradient(width - 200, 250, 20, width - 200, 250, 450);
  glow2.addColorStop(0, 'rgba(14, 165, 233, 0.12)'); // cyan/sky
  glow2.addColorStop(1, 'rgba(14, 165, 233, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, totalHeight);

  // Outer border frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 24, 24, width - 48, totalHeight - 48, 36);
  ctx.stroke();

  // 2. Brand Header Banner
  const brandY = 70;
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38bdf8'; // sky-400
  ctx.textAlign = 'left';
  ctx.fillText('⚡ MEUTREINO PRO', 64, brandY);

  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('HIPERTROFIA INDIVIDUALIZADA', 290, brandY - 2);

  // Date on the right
  const dateFormatted = new Date(session.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(`📅 ${dateFormatted}`, width - 64, brandY - 2);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, brandY + 28);
  ctx.lineTo(width - 64, brandY + 28);
  ctx.stroke();

  // 3. Trophy & Athlete Headline
  const heroY = 150;

  // Split badge pill
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
  drawRoundedRect(ctx, 64, heroY, 210, 36, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(`DIVISÃO: ${session.splitName}`, 64 + 105, heroY + 23);

  // Celebration Title
  ctx.textAlign = 'left';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  // Gold gradient for text
  const goldGrad = ctx.createLinearGradient(64, heroY + 80, 500, heroY + 80);
  goldGrad.addColorStop(0, '#fef08a');
  goldGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = goldGrad;
  ctx.fillText('🏆 TREINO CONCLUÍDO!', 64, heroY + 80);

  // Athlete name
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`Atleta: ${athleteName}`, 64, heroY + 118);

  // 4. Three Big KPI Blocks
  const kpiY = heroY + 150;
  const kpiWidth = (width - 128 - 36) / 3;
  const kpiHeight = 110;

  // Max load calculation
  let maxWeight = 0;
  session.completedExercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (s.weight > maxWeight) maxWeight = s.weight;
    });
  });

  const kpis = [
    {
      label: 'TONELAGEM TOTAL',
      value: `${session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg`,
      sub: 'Volume Load Acumulado',
      accent: '#10b981', // emerald
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    {
      label: 'SÉRIES EFETIVAS',
      value: `${session.totalSets}`,
      sub: 'Séries Válidas',
      accent: '#38bdf8', // sky
      bg: 'rgba(56, 189, 248, 0.08)',
      border: 'rgba(56, 189, 248, 0.25)',
    },
    {
      label: 'CARGA MÁXIMA',
      value: maxWeight > 0 ? `${maxWeight} kg` : `${session.completedExercises.length} exerc.`,
      sub: maxWeight > 0 ? 'Pico de Sobrecarga' : 'Exercícios Concluídos',
      accent: '#f59e0b', // amber
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.25)',
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kX = 64 + idx * (kpiWidth + 18);
    // Box
    ctx.fillStyle = kpi.bg;
    drawRoundedRect(ctx, kX, kpiY, kpiWidth, kpiHeight, 20);
    ctx.fill();
    ctx.strokeStyle = kpi.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(kpi.label, kX + 22, kpiY + 30);

    // Value
    ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = kpi.accent;
    ctx.fillText(kpi.value, kX + 22, kpiY + 68);

    // Sub
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(kpi.sub, kX + 22, kpiY + 92);
  });

  // 5. Session Notes (if present)
  let currentY = kpiY + kpiHeight + 28;
  if (session.notes) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.07)';
    drawRoundedRect(ctx, 64, currentY, width - 128, 68, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'left';
    ctx.fillText('📝 NOTAS DA SESSÃO:', 88, currentY + 28);

    ctx.font = 'italic 500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    // Truncate if long
    const noteText = session.notes.length > 95 ? session.notes.slice(0, 92) + '...' : session.notes;
    ctx.fillText(`"${noteText}"`, 88, currentY + 50);

    currentY += 88;
  }

  // 6. Exercises Highlights Section Header
  ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'left';
  ctx.fillText('📋 PERFORMANCE POR EXERCÍCIO & TOP SETS', 64, currentY);

  currentY += 18;

  // 7. Exercise Rows
  const maxExercises = Math.min(session.completedExercises.length, 8);
  for (let i = 0; i < maxExercises; i++) {
    const ex = session.completedExercises[i];
    const rowY = currentY + (i * exerciseRowHeight);

    // Background card for exercise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    drawRoundedRect(ctx, 64, rowY, width - 128, 76, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Exercise Name & Muscle Group
    ctx.textAlign = 'left';
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    const truncatedName = ex.name.length > 32 ? ex.name.slice(0, 30) + '...' : ex.name;
    ctx.fillText(`${i + 1}. ${truncatedName}`, 86, rowY + 32);

    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${ex.muscleGroup} • ${ex.sets.length} séries`, 86, rowY + 56);

    // Find top set
    let topSet = ex.sets[0];
    ex.sets.forEach((s) => {
      if (s.weight > (topSet?.weight || 0)) topSet = s;
    });

    // Top Set Pill on the right
    if (topSet) {
      const pillWidth = 230;
      const pillX = width - 64 - pillWidth - 20;
      const pillY = rowY + 18;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      drawRoundedRect(ctx, pillX, pillY, pillWidth, 40, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`⭐ TOP: ${topSet.weight}kg × ${topSet.reps}`, pillX + (pillWidth / 2), pillY + 25);
    }
  }

  // If there are more exercises than 8, note it
  if (session.completedExercises.length > 8) {
    const extra = session.completedExercises.length - 8;
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${extra} outro(s) exercício(s) concluído(s)`, width / 2, currentY + (maxExercises * exerciseRowHeight) + 12);
  }

  // 8. Footer Signature
  const footerY = totalHeight - 60;
  ctx.textAlign = 'center';
  ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('MeuTreino Pro — Hipertrofia Individualizada • Evolução Constante & Resultados Reais', width / 2, footerY);

  // Return Blob, File and DataURL
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Falha ao gerar imagem do treino no Canvas.'));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const safeAthlete = athleteName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'atleta';
      const file = new File([blob], `meutreino_pro_${safeAthlete}_${Date.now()}.png`, {
        type: 'image/png',
      });
      resolve({ blob, dataUrl, file });
    }, 'image/png', 0.95);
  });
}
