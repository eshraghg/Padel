// Spider / Radar chart SVG generator (shot counts per shot type)

/**
 * Build a radar chart SVG string.
 * @param {Object} opts
 * @param {string[]} opts.labels - axis labels (shot types)
 * @param {number[]} opts.values - count per axis
 * @param {string} opts.color - series color
 * @param {number} [opts.maxValue] - shared scale max (so charts are comparable)
 * @param {string} [opts.seriesLabel] - used in hover tooltips (e.g. "Winners")
 */
export function renderRadarChartSvg({ labels, values, color, maxValue = null, seriesLabel = '' }) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 92;
  const n = labels.length;
  const rawMax = Math.max(1, maxValue ?? Math.max(...values, 0));
  // Whole-number ring steps: one ring per shot up to 5, otherwise 4 rings
  const step = rawMax <= 5 ? 1 : Math.ceil(rawMax / 4);
  const levels = rawMax <= 5 ? rawMax : 4;
  const max = step * levels;

  const point = (i, r) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
  };
  const fmt = (v) => v.toFixed(1);

  let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px; display:block; margin:0 auto;" role="img">`;

  // Grid rings
  for (let lv = 1; lv <= levels; lv++) {
    const r = (radius * lv) / levels;
    const ring = labels.map((_, i) => {
      const p = point(i, r);
      return `${fmt(p.x)},${fmt(p.y)}`;
    }).join(' ');
    svg += `<polygon points="${ring}" fill="none" stroke="#334155" stroke-width="1" />`;
    const ringVal = step * lv;
    svg += `<text x="${cx + 3}" y="${fmt(cy - r - 2)}" fill="#64748b" font-size="8">${ringVal}</text>`;
  }

  // Spokes + axis labels
  labels.forEach((label, i) => {
    const outer = point(i, radius);
    svg += `<line x1="${cx}" y1="${cy}" x2="${fmt(outer.x)}" y2="${fmt(outer.y)}" stroke="#1e293b" stroke-width="1" />`;

    const lp = point(i, radius + 14);
    const cos = Math.cos(lp.angle);
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : (cos > 0 ? 'start' : 'end');
    const dy = Math.sin(lp.angle) > 0.5 ? 8 : (Math.sin(lp.angle) < -0.5 ? -2 : 3);
    const hasValue = values[i] > 0;
    svg += `<text x="${fmt(lp.x)}" y="${fmt(lp.y + dy)}" fill="${hasValue ? '#e2e8f0' : '#64748b'}" font-size="9" font-weight="${hasValue ? '700' : '400'}" text-anchor="${anchor}">${label}</text>`;
  });

  // Data polygon
  const dataPts = values.map((v, i) => point(i, (radius * Math.min(v, max)) / max));
  svg += `<polygon points="${dataPts.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ')}" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" stroke-linejoin="round" />`;

  // Vertex dots with hover tooltips (larger invisible hit target)
  dataPts.forEach((p, i) => {
    const tip = `${labels[i]}: ${values[i]}${seriesLabel ? ' ' + seriesLabel.toLowerCase() : ''}`;
    if (values[i] > 0) {
      svg += `<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="4" fill="${color}" stroke="#0b0f19" stroke-width="2" />`;
    }
    svg += `<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="10" fill="transparent"><title>${tip}</title></circle>`;
  });

  svg += '</svg>';
  return svg;
}

/**
 * Build radar data for each player from match statistics.
 * Returns { players: [{ key, name, team, side, winners: number[], errors: number[] }], labels, maxValue }
 */
export function buildPlayerRadarData(stats, shotTypes) {
  const labels = shotTypes.map(s => s.short);
  const keys = ['T1-L', 'T1-R', 'T2-L', 'T2-R'];
  let maxValue = 1;

  const players = keys.map(key => {
    const p = stats.players[key];
    const winners = shotTypes.map(s => p.shots[s.id]?.winners || 0);
    const errors = shotTypes.map(s => p.shots[s.id]?.errors || 0);
    maxValue = Math.max(maxValue, ...winners, ...errors);
    return {
      key,
      name: p.name,
      team: key.slice(0, 2),
      side: key.slice(3),
      winners,
      errors
    };
  });

  return { players, labels, maxValue };
}
