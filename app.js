'use strict';

// ─── FRAGILITY CONFIG ───────────────────────────────────────────────────────

const FRAGILITY = {
  low: {
    label: 'Low',
    foamClearance: 1,       // inches of clearance per side
    foamThickness: 0,       // foam sheet thickness (inches)
    cornerBrackets: 0,
    banding: 0,
    hasps: 0,
    laborMultiplier: 1.0,
    notes: [
      'Standard 3/4" plywood panels',
      'Corner post construction with 2×4 framing',
      'Wood screws throughout',
      'No foam padding required',
    ],
  },
  medium: {
    label: 'Medium',
    foamClearance: 2,
    foamThickness: 1,
    cornerBrackets: 4,
    banding: 10,
    hasps: 2,
    laborMultiplier: 1.3,
    notes: [
      'Standard 3/4" plywood panels',
      '2×4 framing with additional cross members',
      '1" PE foam lining on all interior surfaces',
      'Corner brackets at all joints',
      '10 ft banding straps (2 passes)',
    ],
  },
  high: {
    label: 'High',
    foamClearance: 3,
    foamThickness: 2,
    cornerBrackets: 8,
    banding: 20,
    hasps: 2,
    laborMultiplier: 1.6,
    notes: [
      '3/4" plywood with reinforced bottom (double layer)',
      'Full 2×4 framing + diagonal cross-bracing',
      '2" PE foam lining on all interior surfaces',
      'Custom foam blocking around item',
      'Corner brackets at all joints',
      'Lid secured with hasps',
      '20 ft banding straps (4 passes)',
    ],
  },
  extreme: {
    label: 'Extreme',
    foamClearance: 4,
    foamThickness: 3,
    cornerBrackets: 12,
    banding: 30,
    hasps: 4,
    laborMultiplier: 2.0,
    notes: [
      'Double-wall 3/4" plywood on all sides',
      'Heavy-duty 2×4 framing + full diagonal bracing',
      '3" closed-cell foam lining, all surfaces',
      'Custom foam blocking and cradle for item',
      'Heavy-duty corner brackets and lag bolts',
      'Lid secured with heavy-duty hasps and padlock loops',
      '30 ft banding straps (6 passes)',
      'Shock indicator label recommended',
    ],
  },
};

// ─── UNIT COSTS ─────────────────────────────────────────────────────────────

const UNIT_COST = {
  plywood:        52.00,  // per 4×8 sheet (3/4" OSB/CDX)
  lumber2x4:       6.00,  // per 8-ft 2×4
  foam:            2.50,  // per sq ft (per inch of thickness)
  screwBox:       15.00,  // per box of screws/nails
  cornerBracket:   3.50,  // each
  hasp:            9.00,  // each
  banding:         0.50,  // per linear foot
};

const BASE_LABOR_HOURS = 2.0;
const WALL_THICKNESS    = 1.5;  // 2×4 on-edge (inches)
const PLYWOOD_SHEET_SQFT = 32;  // 4×8 = 32 sq ft
const LUMBER_PIECE_FT    = 8;   // standard stud length

// ─── CALCULATIONS ────────────────────────────────────────────────────────────

function calculate(inputs) {
  const { length, width, height, weight, fragility, laborRate, markup } = inputs;
  const cfg = FRAGILITY[fragility];

  // Interior crate dimensions (item + foam clearance on each side)
  const intL = length + 2 * cfg.foamClearance;
  const intW = width  + 2 * cfg.foamClearance;
  const intH = height + 2 * cfg.foamClearance;

  // Exterior crate dimensions (interior + wall thickness each side)
  const extL = intL + 2 * WALL_THICKNESS;
  const extW = intW + 2 * WALL_THICKNESS;
  const extH = intH + 2 * WALL_THICKNESS;

  // ── PLYWOOD (sq ft → sheets) ──
  // 6 panels: top, bottom, front, back, left, right (exterior face dimensions)
  const panelSqIn = 2 * (extL * extH + extW * extH + extL * extW);
  let panelSqFt   = panelSqIn / 144;

  // Double-wall extreme: double every panel
  const wallMultiplier = fragility === 'extreme' ? 2 : (fragility === 'high' ? 1.25 : 1);
  panelSqFt *= wallMultiplier;

  const plywoodSheets = Math.ceil((panelSqFt * 1.15) / PLYWOOD_SHEET_SQFT); // 15% waste

  // ── LUMBER (linear inches → 8-ft pieces) ──
  let lumberIn = 0;
  // Top + bottom frames
  lumberIn += 2 * (2 * extL + 2 * extW);
  // 4 corner posts
  lumberIn += 4 * extH;
  // Cross members: 1 per 24" span on long side panels
  const crossLong  = Math.max(0, Math.floor(extL / 24) - 1);
  const crossShort = Math.max(0, Math.floor(extW / 24) - 1);
  lumberIn += crossLong  * extH * 2;  // front + back faces
  lumberIn += crossShort * extH * 2;  // left + right faces
  // Diagonal bracing for high/extreme
  if (fragility === 'high' || fragility === 'extreme') {
    lumberIn += 4 * Math.sqrt(extL * extL + extH * extH); // approximate diagonal
  }

  const lumberFt     = (lumberIn / 12) * 1.10; // 10% waste
  const lumber8ftPcs = Math.ceil(lumberFt / LUMBER_PIECE_FT);

  // ── FOAM (sq ft) ──
  let foamSqFt = 0;
  if (cfg.foamThickness > 0) {
    const foamSqIn = 2 * (intL * intH + intW * intH + intL * intW);
    foamSqFt = Math.ceil((foamSqIn / 144) * 1.10); // 10% waste
  }

  // ── HARDWARE ──
  const screwBoxes     = fragility === 'low' ? 1 : fragility === 'medium' ? 1 : 2;
  const cornerBrackets = cfg.cornerBrackets;
  const hasps          = cfg.hasps;
  const bandingFt      = cfg.banding;

  // ── LABOR ──
  const complexityHrs = (extL * extH + extW * extH + extL * extW) / 144 / 12;
  const rawHours      = (BASE_LABOR_HOURS + complexityHrs) * cfg.laborMultiplier;
  const laborHours    = Math.round(rawHours * 4) / 4; // round to nearest 0.25 hr

  // ── COSTS ──
  const matCosts = {
    plywood:        plywoodSheets   * UNIT_COST.plywood,
    lumber:         lumber8ftPcs    * UNIT_COST.lumber2x4,
    foam:           foamSqFt        * UNIT_COST.foam * (cfg.foamThickness || 1),
    screws:         screwBoxes      * UNIT_COST.screwBox,
    cornerBrackets: cornerBrackets  * UNIT_COST.cornerBracket,
    hasps:          hasps           * UNIT_COST.hasp,
    banding:        bandingFt       * UNIT_COST.banding,
  };

  const matSubtotal   = Object.values(matCosts).reduce((a, b) => a + b, 0);
  const matWithMarkup = matSubtotal * (1 + markup / 100);
  const laborCost     = laborHours * laborRate;
  const total         = matWithMarkup + laborCost;

  return {
    dims: { intL, intW, intH, extL, extW, extH },
    materials: { plywoodSheets, lumber8ftPcs, lumberFt: Math.ceil(lumberFt), foamSqFt, foamThickness: cfg.foamThickness, screwBoxes, cornerBrackets, hasps, bandingFt },
    matCosts,
    matSubtotal,
    matWithMarkup,
    laborHours,
    laborCost,
    total,
    notes: cfg.notes,
    fragLabel: cfg.label,
  };
}

// ─── RENDER ──────────────────────────────────────────────────────────────────

function fmt(n)    { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtN(n)   { return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function dim(n)    { return fmtN(n) + '"'; }

function renderResults(inputs, result) {
  const { description, clientName, quoteNum } = inputs;
  const { dims, materials: mat, matCosts, matSubtotal, matWithMarkup, laborHours, laborCost, total, notes, fragLabel } = result;

  // Header
  document.getElementById('quote-title').textContent =
    description ? `Crate Estimate — ${description}` : 'Crate Estimate';

  const metaParts = [];
  if (clientName) metaParts.push('Client: ' + clientName);
  if (quoteNum)   metaParts.push('Quote: ' + quoteNum);
  metaParts.push('Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  document.getElementById('quote-meta').textContent = metaParts.join('   |   ');

  // Spec table
  const specRows = [
    ['Item Dimensions',     `${dim(parseFloat(inputs.length))} L × ${dim(parseFloat(inputs.width))} W × ${dim(parseFloat(inputs.height))} H`],
    ['Item Weight',         inputs.weight + ' lbs'],
    ['Fragility Level',     fragLabel],
    ['Crate Interior',      `${dim(dims.intL)} L × ${dim(dims.intW)} W × ${dim(dims.intH)} H`],
    ['Crate Exterior',      `${dim(dims.extL)} L × ${dim(dims.extW)} W × ${dim(dims.extH)} H`],
    ['Foam Clearance',      `${FRAGILITY[inputs.fragility].foamClearance}" per side`],
  ];
  document.getElementById('spec-table-body').innerHTML = specRows
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

  // Construction notes
  document.getElementById('construction-notes').innerHTML = notes
    .map(n => `<li>${n}</li>`).join('');

  // Materials table
  const matRows = [
    ['3/4" Plywood (4×8 sheet)', mat.plywoodSheets + ' sheets', UNIT_COST.plywood, matCosts.plywood],
    ['2×4 Framing Lumber (8 ft)', mat.lumber8ftPcs + ' pieces', UNIT_COST.lumber2x4, matCosts.lumber],
  ];
  if (mat.foamSqFt > 0) {
    matRows.push([`${mat.foamThickness}" PE Foam Padding`, mat.foamSqFt + ' sq ft', UNIT_COST.foam * mat.foamThickness, matCosts.foam]);
  }
  matRows.push(['Screws / Fasteners', mat.screwBoxes + ' box(es)', UNIT_COST.screwBox, matCosts.screws]);
  if (mat.cornerBrackets > 0) {
    matRows.push(['Corner Brackets', mat.cornerBrackets + ' ea', UNIT_COST.cornerBracket, matCosts.cornerBrackets]);
  }
  if (mat.hasps > 0) {
    matRows.push(['Hasps / Clasps', mat.hasps + ' ea', UNIT_COST.hasp, matCosts.hasps]);
  }
  if (mat.bandingFt > 0) {
    matRows.push(['Banding Strap', mat.bandingFt + ' ft', UNIT_COST.banding, matCosts.banding]);
  }

  document.getElementById('materials-table-body').innerHTML = matRows
    .map(([name, qty, unit, sub]) =>
      `<tr><td>${name}</td><td>${qty}</td><td>${fmt(unit)}</td><td>${fmt(sub)}</td></tr>`
    ).join('');

  const markupAmt = matWithMarkup - matSubtotal;
  document.getElementById('materials-table-foot').innerHTML = `
    <tr><td colspan="3">Materials Subtotal</td><td>${fmt(matSubtotal)}</td></tr>
    <tr><td colspan="3">Markup (${inputs.markup}%)</td><td>${fmt(markupAmt)}</td></tr>
    <tr><td colspan="3"><strong>Materials Total (with markup)</strong></td><td><strong>${fmt(matWithMarkup)}</strong></td></tr>
  `;

  // Labor table
  document.getElementById('labor-table-body').innerHTML = `
    <tr><td>Estimated Hours</td><td>${laborHours} hrs</td></tr>
    <tr><td>Shop Rate</td><td>${fmt(inputs.laborRate)}/hr</td></tr>
    <tr><td><strong>Labor Total</strong></td><td><strong>${fmt(laborCost)}</strong></td></tr>
  `;

  // Quote summary
  document.getElementById('quote-table-body').innerHTML = `
    <tr><td>Materials (w/ markup)</td><td>${fmt(matWithMarkup)}</td></tr>
    <tr><td>Labor (${laborHours} hrs @ ${fmt(inputs.laborRate)}/hr)</td><td>${fmt(laborCost)}</td></tr>
  `;

  document.getElementById('grand-total').innerHTML =
    `<span>TOTAL ESTIMATE</span><span>${fmt(total)}</span>`;

  // Show results
  const section = document.getElementById('results-section');
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── EVENT HANDLERS ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Keep fragility card selection visually synced
  document.querySelectorAll('.frag-option input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.frag-card').forEach(c => c.classList.remove('selected'));
    });
  });

  document.getElementById('calcBtn').addEventListener('click', () => {
    const errEl = document.getElementById('error-msg');
    errEl.classList.add('hidden');

    const length = parseFloat(document.getElementById('length').value);
    const width  = parseFloat(document.getElementById('width').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const laborRate = parseFloat(document.getElementById('laborRate').value);
    const markup    = parseFloat(document.getElementById('markup').value);

    const errors = [];
    if (!length || length <= 0)    errors.push('Length must be greater than 0.');
    if (!width  || width  <= 0)    errors.push('Width must be greater than 0.');
    if (!height || height <= 0)    errors.push('Height must be greater than 0.');
    if (!weight || weight <= 0)    errors.push('Weight must be greater than 0.');
    if (!laborRate || laborRate <= 0) errors.push('Labor rate must be greater than 0.');
    if (isNaN(markup) || markup < 0)  errors.push('Markup must be 0 or greater.');

    if (errors.length) {
      errEl.textContent = errors.join(' ');
      errEl.classList.remove('hidden');
      return;
    }

    const fragility = document.querySelector('input[name="fragility"]:checked').value;

    const inputs = {
      length, width, height, weight,
      fragility,
      laborRate,
      markup,
      description: document.getElementById('description').value.trim(),
      clientName:  document.getElementById('clientName').value.trim(),
      quoteNum:    document.getElementById('quoteNum').value.trim(),
    };

    const result = calculate(inputs);
    renderResults(inputs, result);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    ['length','width','height','weight','description','clientName','quoteNum'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('laborRate').value = '85';
    document.getElementById('markup').value = '20';
    document.querySelector('input[name="fragility"][value="medium"]').checked = true;
    document.getElementById('error-msg').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');
  });
});
