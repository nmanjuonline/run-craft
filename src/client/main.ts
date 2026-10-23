/**
 * RunCraft Application Orchestrator
 * Connects CanvasEngine, parsers, and UI controls
 */

import { CanvasEngine, formatDuration, isStrengthOrGymActivity } from './studio/canvasEngine.js';
import { MOCK_ACTIVITIES } from '../sources/mockData.js';
import { parseGpxFileContent } from './parsers/gpxClientParser.js';
import { parseFitFileBuffer } from './parsers/fitClientParser.js';
import { CONFIG } from '../config.js';
import type { WorkoutActivity, OverlayConfig, AspectRatio, OverlayLayoutId } from '../types.js';

// Application State
let currentActivity: WorkoutActivity = {
  ...MOCK_ACTIVITIES[0],
  locationCity: MOCK_ACTIVITIES[0].gearName && !MOCK_ACTIVITIES[0].locationCity?.includes(MOCK_ACTIVITIES[0].gearName)
    ? `${MOCK_ACTIVITIES[0].locationCity} • ${MOCK_ACTIVITIES[0].gearName}`
    : MOCK_ACTIVITIES[0].locationCity,
};
let currentConfig: OverlayConfig = JSON.parse(JSON.stringify(CONFIG.DEFAULTS.DEFAULT_OVERLAY_CONFIG));
let canvasEngine: CanvasEngine;

// DOM Elements
const canvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
const viewIntervals = document.getElementById('viewIntervals') as HTMLElement;
const viewPresets = document.getElementById('viewPresets') as HTMLElement;
const viewGarmin = document.getElementById('viewGarmin') as HTMLElement;
const viewGpx = document.getElementById('viewGpx') as HTMLElement;

const tabIntervalsBtn = document.getElementById('tabIntervalsBtn') as HTMLButtonElement;
const tabPresetsBtn = document.getElementById('tabPresetsBtn') as HTMLButtonElement;
const tabGarminBtn = document.getElementById('tabGarminBtn') as HTMLButtonElement;
const tabGpxBtn = document.getElementById('tabGpxBtn') as HTMLButtonElement;

const intervalsConnectPrompt = document.getElementById('intervalsConnectPrompt') as HTMLElement;
const intervalsControls = document.getElementById('intervalsControls') as HTMLElement;
const intervalsAthleteLabel = document.getElementById('intervalsAthleteLabel') as HTMLElement;
const intervalsRefreshBtn = document.getElementById('intervalsRefreshBtn') as HTMLButtonElement;
const intervalsKeyChangeBtn = document.getElementById('intervalsKeyChangeBtn') as HTMLButtonElement;
const intervalsDateFilters = document.getElementById('intervalsDateFilters') as HTMLElement;
const intervalsCountBadge = document.getElementById('intervalsCountBadge') as HTMLElement;
const intervalsRangeBadge = document.getElementById('intervalsRangeBadge') as HTMLElement;
const intervalsActivityList = document.getElementById('intervalsActivityList') as HTMLElement;
const openIntervalsModalFromSidebarBtn = document.getElementById('openIntervalsModalFromSidebarBtn') as HTMLButtonElement;

// Intervals Modal
const intervalsConnectBtn = document.getElementById('intervalsConnectBtn') as HTMLButtonElement;
const intervalsBtnLabel = document.getElementById('intervalsBtnLabel') as HTMLElement;
const intervalsModal = document.getElementById('intervalsModal') as HTMLElement;
const closeIntervalsModalBtn = document.getElementById('closeIntervalsModalBtn') as HTMLButtonElement;
const intervalsStatusAlert = document.getElementById('intervalsStatusAlert') as HTMLElement;
const intervalsApiKeyInput = document.getElementById('intervalsApiKeyInput') as HTMLInputElement;
const intervalsKeySubmitBtn = document.getElementById('intervalsKeySubmitBtn') as HTMLButtonElement;

const fitFileInput = document.getElementById('fitFileInput') as HTMLInputElement;
const gpxFileInput = document.getElementById('gpxFileInput') as HTMLInputElement;
const photoFileInput = document.getElementById('photoFileInput') as HTMLInputElement;
const photoDropzone = document.getElementById('photoDropzone') as HTMLElement;

const thumbTrail = document.getElementById('thumbTrail') as HTMLElement;
const thumbCycling = document.getElementById('thumbCycling') as HTMLElement;

// Sliders
const vignetteSlider = document.getElementById('vignetteSlider') as HTMLInputElement;
const brightnessSlider = document.getElementById('brightnessSlider') as HTMLInputElement;
const contrastSlider = document.getElementById('contrastSlider') as HTMLInputElement;
const saturationSlider = document.getElementById('saturationSlider') as HTMLInputElement;
const opacitySlider = document.getElementById('opacitySlider') as HTMLInputElement;
const glowSlider = document.getElementById('glowSlider') as HTMLInputElement | null;

const vignetteVal = document.getElementById('vignetteVal') as HTMLElement;
const brightnessVal = document.getElementById('brightnessVal') as HTMLElement;
const contrastVal = document.getElementById('contrastVal') as HTMLElement;
const saturationVal = document.getElementById('saturationVal') as HTMLElement;
const opacityVal = document.getElementById('opacityVal') as HTMLElement;
const glowVal = document.getElementById('glowVal') as HTMLElement | null;
const glowSliderGroup = document.getElementById('glowSliderGroup') as HTMLElement | null;

// Toggles
const togglePolyline = document.getElementById('togglePolyline') as HTMLInputElement;
const toggleGlow = document.getElementById('toggleGlow') as HTMLInputElement;
const togglePins = document.getElementById('togglePins') as HTMLInputElement;
const toggleHeader = document.getElementById('toggleHeader') as HTMLInputElement;
const toggleHeroStats = document.getElementById('toggleHeroStats') as HTMLInputElement;
const toggleSecondaryStats = document.getElementById('toggleSecondaryStats') as HTMLInputElement | null;
const toggleHrZones = document.getElementById('toggleHrZones') as HTMLInputElement;
const toggleWatermark = document.getElementById('toggleWatermark') as HTMLInputElement;

// Individual Metric Toggles
const toggleMetricDist = document.getElementById('toggleMetricDist') as HTMLInputElement | null;
const toggleMetricTime = document.getElementById('toggleMetricTime') as HTMLInputElement | null;
const toggleMetricPace = document.getElementById('toggleMetricPace') as HTMLInputElement | null;
const toggleMetricEle = document.getElementById('toggleMetricEle') as HTMLInputElement | null;
const toggleMetricHr = document.getElementById('toggleMetricHr') as HTMLInputElement | null;
const toggleMetricCadence = document.getElementById('toggleMetricCadence') as HTMLInputElement | null;
const toggleMetricCalories = document.getElementById('toggleMetricCalories') as HTMLInputElement | null;
const toggleMetricPower = document.getElementById('toggleMetricPower') as HTMLInputElement | null;

// Inputs
const editTitleInput = document.getElementById('editTitleInput') as HTMLInputElement;
const editDistInput = document.getElementById('editDistInput') as HTMLInputElement;
const editEleInput = document.getElementById('editEleInput') as HTMLInputElement;
const editLocationInput = document.getElementById('editLocationInput') as HTMLInputElement;

// Action Buttons
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const shareBtn = document.getElementById('shareBtn') as HTMLButtonElement;
const copyImageBtn = document.getElementById('copyImageBtn') as HTMLButtonElement | null;

// History & Navbar Controls
const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement | null;
const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement | null;
const focusModeBtn = document.getElementById('focusModeBtn') as HTMLButtonElement | null;
const shortcutsBtn = document.getElementById('shortcutsBtn') as HTMLButtonElement | null;
const shortcutsModal = document.getElementById('shortcutsModal') as HTMLElement | null;
const closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn') as HTMLButtonElement | null;

// Zoom & Pan Toolbar Controls
const zoomInBtn = document.getElementById('zoomInBtn') as HTMLButtonElement | null;
const zoomOutBtn = document.getElementById('zoomOutBtn') as HTMLButtonElement | null;
const zoomResetBtn = document.getElementById('zoomResetBtn') as HTMLButtonElement | null;
const panResetBtn = document.getElementById('panResetBtn') as HTMLButtonElement | null;
const zoomReadoutText = document.getElementById('zoomReadoutText') as HTMLElement | null;
const canvasPanHint = document.getElementById('canvasPanHint') as HTMLElement | null;
const canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement | null;

// Filter & Color Picker Controls
const workoutSearchInput = document.getElementById('workoutSearchInput') as HTMLInputElement | null;
const resetFiltersBtn = document.getElementById('resetFiltersBtn') as HTMLButtonElement | null;
const customColorPicker = document.getElementById('customColorPicker') as HTMLInputElement | null;
const globalDropOverlay = document.getElementById('globalDropOverlay') as HTMLElement | null;

// Strava Modal
const stravaConnectBtn = document.getElementById('stravaConnectBtn') as HTMLButtonElement;
const stravaModal = document.getElementById('stravaModal') as HTMLElement;
const closeStravaModalBtn = document.getElementById('closeStravaModalBtn') as HTMLButtonElement;
const stravaDemoBtn = document.getElementById('stravaDemoBtn') as HTMLButtonElement;
const stravaClientIdInput = document.getElementById('stravaClientIdInput') as HTMLInputElement;
const stravaClientSecretInput = document.getElementById('stravaClientSecretInput') as HTMLInputElement;
const stravaTokenInput = document.getElementById('stravaTokenInput') as HTMLInputElement;
const stravaTokenSubmitBtn = document.getElementById('stravaTokenSubmitBtn') as HTMLButtonElement;
const stravaAuthProceedBtn = document.getElementById('stravaAuthProceedBtn') as HTMLButtonElement;
const stravaStatusAlert = document.getElementById('stravaStatusAlert') as HTMLElement;

/**
 * Initialize Canvas & Load Initial Assets
 */
async function initApp() {
  canvasEngine = new CanvasEngine(canvas);

  // Load Initial Photo
  await loadBackdropImage('/samples/sample_trail.jpg');

  // Populate Presets in Sidebar
  renderPresetsList();

  // Setup Event Handlers
  setupTabs();
  setupMobileTabs();
  setupPhotoUpload();
  setupSliders();
  setupToggles();
  setupAspectRatios();
  setupPalette();
  setupLayoutTemplates();
  setupTextEditor();
  syncEditorInputs();
  setupExport();
  setupStravaModal();
  setupIntervalsModal();
  setupCanvasInteraction();
  setupShortcutsAndFocusMode();
  setupGlobalDragDrop();
  setupWorkoutSearch();

  // Initial Render & History Baseline
  triggerRender();
  pushHistory(true);

  // Handle Strava OAuth callback if returning from Strava redirect
  await handleOAuthCallback();

  // Auto-sync Intervals.icu if API key is stored
  const savedIntervalsKey = localStorage.getItem('intervals_api_key');
  if (savedIntervalsKey) {
    loadIntervalsActivities(savedIntervalsKey, true);
  }
}

function triggerRender() {
  if (!canvasEngine) return;
  canvasEngine.render(currentActivity, currentConfig);
}

function loadBackdropImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvasEngine.setImage(img);
      triggerRender();
      resolve();
    };
    img.onerror = () => {
      canvasEngine.setImage(null);
      triggerRender();
      resolve();
    };
    img.src = src;
  });
}

export function getSportIcon(sport: string): string {
  switch (sport) {
    case 'Ride': return '🚴';
    case 'TrailRun': return '⛰️';
    case 'Hike': return '🥾';
    case 'WeightTraining':
    case 'Strength': return '🏋️';
    case 'Crossfit': return '🔥';
    case 'Yoga':
    case 'Pilates': return '🧘';
    case 'Workout':
    case 'Cardio':
    case 'HIIT': return '💪';
    case 'Run':
    default: return '🏃';
  }
}

export function formatActivityMeta(act: WorkoutActivity): string {
  if (act.distanceMeters > 0) {
    return `${(act.distanceMeters / 1000).toFixed(1)} km • ${act.date}`;
  }
  const dur = formatDuration(act.movingTimeSec || act.elapsedTimeSec || 3600);
  const calPart = act.calories ? `${act.calories} kcal • ` : '';
  return `${dur} • ${calPart}${act.date}`;
}

function renderPresetsList() {
  viewPresets.innerHTML = '';
  MOCK_ACTIVITIES.forEach((act, idx) => {
    const item = document.createElement('div');
    item.className = `activity-item ${act.id === currentActivity.id ? 'active' : ''}`;
    item.innerHTML = `
      <div class="act-info">
        <h4>${act.title}</h4>
        <div class="act-meta">${formatActivityMeta(act)}</div>
      </div>
      <span class="act-badge">${getSportIcon(act.sportType)} ${act.sportType}</span>
    `;
    item.addEventListener('click', () => {
      document.querySelectorAll('.activity-item').forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      currentActivity = { ...act };
      syncEditorInputs();
      triggerRender();
      pushHistory(true);
    });
    viewPresets.appendChild(item);
  });
}

export function formatWorkoutSubtitle(act: { locationCity?: string; gearName?: string }): string {
  const parts: string[] = [];
  if (act.locationCity) parts.push(act.locationCity);
  if (act.gearName && !act.locationCity?.includes(act.gearName)) {
    parts.push(act.gearName);
  }
  return parts.join(' • ').trim();
}

function syncEditorInputs() {
  editTitleInput.value = currentActivity.title;
  editDistInput.value = (currentActivity.distanceMeters / 1000).toFixed(1);
  editEleInput.value = currentActivity.elevationGainMeters.toString();
  const subtitle = formatWorkoutSubtitle(currentActivity);
  editLocationInput.value = subtitle;
  if (subtitle) {
    currentActivity.locationCity = subtitle;
  }
}

function syncSliderInputs() {
  if (vignetteSlider) {
    vignetteSlider.value = currentConfig.photoFilters.vignette.toString();
    vignetteVal.textContent = `${Math.round(currentConfig.photoFilters.vignette * 100)}%`;
  }
  if (brightnessSlider) {
    brightnessSlider.value = currentConfig.photoFilters.brightness.toString();
    brightnessVal.textContent = `${Math.round(currentConfig.photoFilters.brightness * 100)}%`;
  }
  if (contrastSlider) {
    contrastSlider.value = currentConfig.photoFilters.contrast.toString();
    contrastVal.textContent = `${Math.round(currentConfig.photoFilters.contrast * 100)}%`;
  }
  if (saturationSlider) {
    saturationSlider.value = currentConfig.photoFilters.saturation.toString();
    saturationVal.textContent = `${Math.round(currentConfig.photoFilters.saturation * 100)}%`;
  }
  if (opacitySlider) {
    opacitySlider.value = currentConfig.cardOpacity.toString();
    opacityVal.textContent = `${Math.round(currentConfig.cardOpacity * 100)}%`;
  }
  if (glowSlider && glowVal) {
    const g = currentConfig.glowIntensity ?? 0.7;
    glowSlider.value = g.toString();
    glowVal.textContent = `${Math.round(g * 100)}%`;
  }
}

function syncTogglesState() {
  if (togglePolyline) togglePolyline.checked = !!currentConfig.showPolyline;
  if (toggleGlow) toggleGlow.checked = !!currentConfig.showGlow;
  if (togglePins) togglePins.checked = !!currentConfig.showStartFinishPins;
  if (toggleHeader) toggleHeader.checked = !!currentConfig.showTitleHeader;
  if (toggleHeroStats) toggleHeroStats.checked = !!currentConfig.showHeroStats;
  if (toggleSecondaryStats) toggleSecondaryStats.checked = !!currentConfig.showSecondaryStats;
  if (toggleHrZones) toggleHrZones.checked = !!currentConfig.showHrZones;
  if (toggleWatermark) toggleWatermark.checked = !!currentConfig.showWatermark;

  if (currentConfig.metrics) {
    if (toggleMetricDist) toggleMetricDist.checked = currentConfig.metrics.distance;
    if (toggleMetricTime) toggleMetricTime.checked = currentConfig.metrics.time;
    if (toggleMetricPace) toggleMetricPace.checked = currentConfig.metrics.pace;
    if (toggleMetricEle) toggleMetricEle.checked = currentConfig.metrics.elevation;
    if (toggleMetricHr) toggleMetricHr.checked = currentConfig.metrics.heartRate;
    if (toggleMetricCadence) toggleMetricCadence.checked = currentConfig.metrics.cadence;
    if (toggleMetricCalories) toggleMetricCalories.checked = currentConfig.metrics.calories;
    if (toggleMetricPower) toggleMetricPower.checked = currentConfig.metrics.power;
  }

  const transparentToggle = document.getElementById('transparentBgToggle') as HTMLInputElement | null;
  if (transparentToggle) transparentToggle.checked = !!currentConfig.transparentBackground;

  // Sync aspect ratio buttons
  document.querySelectorAll<HTMLButtonElement>('[data-ratio]').forEach((btn) => {
    if (btn.getAttribute('data-ratio') === currentConfig.aspectRatio) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Sync template cards
  document.querySelectorAll<HTMLButtonElement>('.layout-template-card').forEach((card) => {
    if (card.getAttribute('data-layout') === currentConfig.layoutId) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Sync palette color dots
  document.querySelectorAll<HTMLElement>('.color-dot').forEach((dot) => {
    if (dot.getAttribute('data-color') === currentConfig.accentColor) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  if (customColorPicker) {
    customColorPicker.value = currentConfig.accentColor;
  }
}

// ==========================================================================
// History (Undo / Redo) Architecture
// ==========================================================================
interface HistorySnapshot {
  activity: WorkoutActivity;
  config: OverlayConfig;
  photoOffset: { x: number; y: number };
  photoZoom: number;
}

const historyStack: HistorySnapshot[] = [];
let historyIndex = -1;
let historyDebounceTimer: any = null;

function updateHistoryButtons() {
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
}

function pushHistory(immediate = false) {
  const saveSnapshot = () => {
    const transform = canvasEngine
      ? canvasEngine.getImageTransform()
      : { offset: { x: 0, y: 0 }, zoom: 1.0 };

    const snapshot: HistorySnapshot = {
      activity: JSON.parse(JSON.stringify(currentActivity)),
      config: JSON.parse(JSON.stringify(currentConfig)),
      photoOffset: { ...transform.offset },
      photoZoom: transform.zoom,
    };

    if (historyIndex < historyStack.length - 1) {
      historyStack.splice(historyIndex + 1);
    }

    historyStack.push(snapshot);
    if (historyStack.length > 50) historyStack.shift();
    historyIndex = historyStack.length - 1;
    updateHistoryButtons();
  };

  if (immediate) {
    clearTimeout(historyDebounceTimer);
    saveSnapshot();
  } else {
    clearTimeout(historyDebounceTimer);
    historyDebounceTimer = setTimeout(saveSnapshot, 250);
  }
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    applyHistoryState(historyStack[historyIndex]);
    showToast('Undo');
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    applyHistoryState(historyStack[historyIndex]);
    showToast('Redo');
  }
}

function applyHistoryState(state: HistorySnapshot) {
  currentActivity = JSON.parse(JSON.stringify(state.activity));
  currentConfig = JSON.parse(JSON.stringify(state.config));
  if (canvasEngine) {
    canvasEngine.setImageTransform(state.photoOffset, state.photoZoom);
    if (zoomReadoutText) zoomReadoutText.textContent = `${Math.round(state.photoZoom * 100)}%`;
  }
  syncEditorInputs();
  syncSliderInputs();
  syncTogglesState();
  triggerRender();
  updateHistoryButtons();
}


function setupTabs() {
  tabIntervalsBtn.addEventListener('click', () => {
    setTabActive(tabIntervalsBtn, viewIntervals);
  });
  tabPresetsBtn.addEventListener('click', () => {
    setTabActive(tabPresetsBtn, viewPresets);
  });
  tabGarminBtn.addEventListener('click', () => {
    setTabActive(tabGarminBtn, viewGarmin);
  });
  tabGpxBtn.addEventListener('click', () => {
    setTabActive(tabGpxBtn, viewGpx);
  });

  // Garmin Dropzone Click & Drag
  viewGarmin.addEventListener('click', () => fitFileInput.click());
  setupDragDrop(viewGarmin, handleFitFile);
  fitFileInput.addEventListener('change', (e: any) => {
    const file = e.target.files?.[0];
    if (file) handleFitFile(file);
  });

  // GPX Dropzone Click & Drag
  viewGpx.addEventListener('click', () => gpxFileInput.click());
  setupDragDrop(viewGpx, handleGpxFile);
  gpxFileInput.addEventListener('change', (e: any) => {
    const file = e.target.files?.[0];
    if (file) handleGpxFile(file);
  });
}

function setTabActive(btn: HTMLButtonElement, view: HTMLElement) {
  [tabIntervalsBtn, tabPresetsBtn, tabGarminBtn, tabGpxBtn].forEach((b) => b?.classList.remove('active'));
  [viewIntervals, viewPresets, viewGarmin, viewGpx].forEach((v) => { if (v) v.style.display = 'none'; });
  btn.classList.add('active');
  view.style.display = 'block';
}

function setupDragDrop(el: HTMLElement, handler: (file: File) => void) {
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('dragover');
  });
  el.addEventListener('dragleave', () => el.classList.remove('dragover'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handler(file);
  });
}

const toastEl = document.getElementById('toastNotification');
let toastTimer: any = null;

function showToast(msg: string, isError = false) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = 'flex';
  toastEl.style.borderColor = isError ? '#ff4a36' : 'var(--accent-lime)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3500);
}

function addActivityToList(act: WorkoutActivity) {
  const item = document.createElement('div');
  item.className = 'activity-item active';
  item.innerHTML = `
    <div class="act-info">
      <h4>${act.title}</h4>
      <div class="act-meta">${formatActivityMeta(act)}</div>
    </div>
    <span class="act-badge">${getSportIcon(act.sportType)} ${act.sportType}</span>
  `;
  document.querySelectorAll('.activity-item').forEach((el) => el.classList.remove('active'));
  item.addEventListener('click', () => {
    document.querySelectorAll('.activity-item').forEach((el) => el.classList.remove('active'));
    item.classList.add('active');
    currentActivity = { ...act };
    syncEditorInputs();
    triggerRender();
  });
  viewPresets.prepend(item);
  setTabActive(tabPresetsBtn, viewPresets);
}

async function handleFitFile(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const act = await parseFitFileBuffer(buffer, file.name);
    currentActivity = act;
    addActivityToList(act);
    syncEditorInputs();
    triggerRender();
    const distOrDur = act.distanceMeters > 0 ? `${(act.distanceMeters / 1000).toFixed(1)}km` : formatDuration(act.movingTimeSec || act.elapsedTimeSec || 3600);
    showToast(`⚡ Loaded ${distOrDur} Garmin workout: ${act.title}`);
  } catch (err: any) {
    showToast(`Could not parse .FIT file: ${err.message}`, true);
  }
}

async function handleGpxFile(file: File) {
  try {
    const text = await file.text();
    const act = parseGpxFileContent(text, file.name);
    currentActivity = act;
    addActivityToList(act);
    syncEditorInputs();
    triggerRender();
    showToast(`⚡ Loaded ${(act.distanceMeters / 1000).toFixed(1)}km GPX track: ${act.title}`);
  } catch (err: any) {
    showToast(`Could not parse .GPX file: ${err.message}`, true);
  }
}

function setupPhotoUpload() {
  photoDropzone.addEventListener('click', () => photoFileInput.click());
  setupDragDrop(photoDropzone, handlePhotoFile);
  photoFileInput.addEventListener('change', (e: any) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
  });

  thumbTrail.addEventListener('click', () => {
    thumbTrail.classList.add('active');
    thumbCycling.classList.remove('active');
    loadBackdropImage('/samples/sample_trail.jpg');
  });

  thumbCycling.addEventListener('click', () => {
    thumbCycling.classList.add('active');
    thumbTrail.classList.remove('active');
    loadBackdropImage('/samples/sample_cycling.jpg');
  });
}

function handlePhotoFile(file: File) {
  if (!file.type.startsWith('image/')) {
    showToast('Please choose an image file (JPEG, PNG, WEBP).', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    document.querySelectorAll('.sample-thumb').forEach((t) => t.classList.remove('active'));
    loadBackdropImage(dataUrl);
    pushHistory(true);
    showToast('⚡ Backdrop photo updated!');
  };
  reader.readAsDataURL(file);
}

function setupSliders() {
  vignetteSlider.addEventListener('input', () => {
    const v = parseFloat(vignetteSlider.value);
    currentConfig.photoFilters.vignette = v;
    vignetteVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
    pushHistory();
  });
  vignetteSlider.addEventListener('dblclick', () => {
    vignetteSlider.value = '0.35';
    vignetteSlider.dispatchEvent(new Event('input'));
    showToast('Dark vignette reset (35%)');
  });

  brightnessSlider.addEventListener('input', () => {
    const v = parseFloat(brightnessSlider.value);
    currentConfig.photoFilters.brightness = v;
    brightnessVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
    pushHistory();
  });
  brightnessSlider.addEventListener('dblclick', () => {
    brightnessSlider.value = '1.0';
    brightnessSlider.dispatchEvent(new Event('input'));
    showToast('Brightness reset (100%)');
  });

  contrastSlider.addEventListener('input', () => {
    const v = parseFloat(contrastSlider.value);
    currentConfig.photoFilters.contrast = v;
    contrastVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
    pushHistory();
  });
  contrastSlider.addEventListener('dblclick', () => {
    contrastSlider.value = '1.05';
    contrastSlider.dispatchEvent(new Event('input'));
    showToast('Contrast reset (105%)');
  });

  saturationSlider.addEventListener('input', () => {
    const v = parseFloat(saturationSlider.value);
    currentConfig.photoFilters.saturation = v;
    saturationVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
    pushHistory();
  });
  saturationSlider.addEventListener('dblclick', () => {
    saturationSlider.value = '1.05';
    saturationSlider.dispatchEvent(new Event('input'));
    showToast('Saturation reset (105%)');
  });

  opacitySlider.addEventListener('input', () => {
    const v = parseFloat(opacitySlider.value);
    currentConfig.cardOpacity = v;
    opacityVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
    pushHistory();
  });
  opacitySlider.addEventListener('dblclick', () => {
    opacitySlider.value = '0.85';
    opacitySlider.dispatchEvent(new Event('input'));
    showToast('Card opacity reset (85%)');
  });

  if (glowSlider && glowVal) {
    glowSlider.addEventListener('input', () => {
      const v = parseFloat(glowSlider.value);
      currentConfig.glowIntensity = v;
      glowVal.textContent = `${Math.round(v * 100)}%`;
      triggerRender();
      pushHistory();
    });
    glowSlider.addEventListener('dblclick', () => {
      glowSlider.value = '0.70';
      glowSlider.dispatchEvent(new Event('input'));
      showToast('Glow intensity reset (70%)');
    });
  }

  // One-click Reset Atmosphere Filters
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      currentConfig.photoFilters = {
        brightness: 1.0,
        contrast: 1.05,
        saturation: 1.05,
        vignette: 0.35,
        blur: 0,
        exposure: 0,
      };
      syncSliderInputs();
      triggerRender();
      pushHistory();
      showToast('Photo atmosphere filters reset to defaults');
    });
  }
}

function setupToggles() {
  togglePolyline.addEventListener('change', () => {
    currentConfig.showPolyline = togglePolyline.checked;
    triggerRender();
    pushHistory();
  });
  toggleGlow.addEventListener('change', () => {
    currentConfig.showGlow = toggleGlow.checked;
    if (glowSliderGroup) {
      glowSliderGroup.style.display = toggleGlow.checked ? 'block' : 'none';
    }
    triggerRender();
    pushHistory();
  });
  togglePins.addEventListener('change', () => {
    currentConfig.showStartFinishPins = togglePins.checked;
    triggerRender();
    pushHistory();
  });
  toggleHeader.addEventListener('change', () => {
    currentConfig.showTitleHeader = toggleHeader.checked;
    triggerRender();
    pushHistory();
  });
  toggleHeroStats.addEventListener('change', () => {
    currentConfig.showHeroStats = toggleHeroStats.checked;
    triggerRender();
    pushHistory();
  });
  if (toggleSecondaryStats) {
    toggleSecondaryStats.addEventListener('change', () => {
      currentConfig.showSecondaryStats = toggleSecondaryStats.checked;
      triggerRender();
      pushHistory();
    });
  }
  toggleHrZones.addEventListener('change', () => {
    currentConfig.showHrZones = toggleHrZones.checked;
    triggerRender();
    pushHistory();
  });
  toggleWatermark.addEventListener('change', () => {
    currentConfig.showWatermark = toggleWatermark.checked;
    triggerRender();
    pushHistory();
  });

  // Individual Metric Toggles
  const ensureMetrics = () => {
    if (!currentConfig.metrics) {
      currentConfig.metrics = {
        distance: true,
        time: true,
        pace: true,
        elevation: true,
        heartRate: true,
        cadence: true,
        calories: true,
        power: true,
      };
    }
  };

  if (toggleMetricDist) {
    toggleMetricDist.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.distance = toggleMetricDist.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricTime) {
    toggleMetricTime.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.time = toggleMetricTime.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricPace) {
    toggleMetricPace.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.pace = toggleMetricPace.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricEle) {
    toggleMetricEle.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.elevation = toggleMetricEle.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricHr) {
    toggleMetricHr.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.heartRate = toggleMetricHr.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricCadence) {
    toggleMetricCadence.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.cadence = toggleMetricCadence.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricCalories) {
    toggleMetricCalories.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.calories = toggleMetricCalories.checked;
      triggerRender();
      pushHistory();
    });
  }
  if (toggleMetricPower) {
    toggleMetricPower.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.power = toggleMetricPower.checked;
      triggerRender();
      pushHistory();
    });
  }

  // Transparent Background Overlay Toggle
  const transparentBgToggle = document.getElementById('transparentBgToggle') as HTMLInputElement | null;
  const canvasWrapper = document.getElementById('canvasWrapper');
  const photoFiltersCard = document.getElementById('photoFiltersCard');

  if (transparentBgToggle) {
    transparentBgToggle.checked = !!currentConfig.transparentBackground;
    transparentBgToggle.addEventListener('change', () => {
      currentConfig.transparentBackground = transparentBgToggle.checked;
      if (transparentBgToggle.checked) {
        canvasWrapper?.classList.add('is-transparent');
        photoFiltersCard?.classList.add('photo-controls-disabled');
        photoDropzone?.classList.add('photo-controls-disabled');
        showToast('Transparent overlay mode active');
      } else {
        canvasWrapper?.classList.remove('is-transparent');
        photoFiltersCard?.classList.remove('photo-controls-disabled');
        photoDropzone?.classList.remove('photo-controls-disabled');
      }
      triggerRender();
      pushHistory();
    });
  }
}

function setupMobileTabs() {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.mobile-tab-btn');
  const sections = document.querySelectorAll<HTMLElement>('.studio-section');

  const drawer = document.getElementById('mobileBottomDrawer');
  const drawerHeader = document.getElementById('drawerHeader');
  const drawerToggleBtn = document.getElementById('drawerToggleBtn');
  const drawerToggleIcon = document.getElementById('drawerToggleIcon');
  const drawerToggleText = document.getElementById('drawerToggleText');
  const drawerActiveIcon = document.getElementById('drawerActiveIcon');
  const drawerActiveTitle = document.getElementById('drawerActiveTitle');
  const drawerQuickDownloadBtn = document.getElementById('drawerQuickDownloadBtn');
  const floatingExpandBtn = document.getElementById('floatingExpandBtn');
  const studioContainer = document.querySelector('.studio-container');

  const TAB_METADATA: Record<string, { icon: string; title: string }> = {
    workouts: { icon: '🏃', title: 'Garmin & Workouts' },
    photo: { icon: '📷', title: 'Photo & Filter' },
    metrics: { icon: '📊', title: 'Workout Metrics' },
    style: { icon: '🎨', title: 'Theme & Style' },
    widgets: { icon: '🛠️', title: 'Widgets' },
    text: { icon: '✏️', title: 'Edit Stats' },
  };

  function setDrawerCollapsed(collapsed: boolean) {
    if (!drawer) return;
    if (collapsed) {
      drawer.classList.add('collapsed');
      drawer.classList.remove('expanded');
      studioContainer?.classList.add('drawer-is-collapsed');
      if (drawerToggleText) drawerToggleText.textContent = 'Show';
    } else {
      drawer.classList.remove('collapsed');
      studioContainer?.classList.remove('drawer-is-collapsed');
      if (drawerToggleText) drawerToggleText.textContent = 'Hide';
    }
  }

  function toggleDrawer() {
    if (!drawer) return;
    const isCollapsed = drawer.classList.contains('collapsed');
    setDrawerCollapsed(!isCollapsed);
  }

  drawerToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDrawer();
  });

  drawerHeader?.addEventListener('click', () => {
    toggleDrawer();
  });

  // Tap anywhere on collapsed drawer bar to expand
  drawer?.addEventListener('click', (e) => {
    if (drawer.classList.contains('collapsed')) {
      const target = e.target as HTMLElement;
      if (target.closest('#drawerQuickDownloadBtn') || target.closest('#drawerQuickOverlayBtn')) return;
      setDrawerCollapsed(false);
    }
  });

  // Dedicated floating Show Controls pill
  floatingExpandBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setDrawerCollapsed(false);
  });

  drawerQuickDownloadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadBtn?.click();
  });

  // Tapping canvas on mobile toggles drawer:
  // If open -> collapse to view photo cleanly
  // If collapsed -> expand back to show controls
  if (canvas) {
    canvas.addEventListener('click', () => {
      if (window.innerWidth <= 991 && drawer) {
        const isCollapsed = drawer.classList.contains('collapsed');
        setDrawerCollapsed(!isCollapsed);
      }
    });
  }

  // Native touch swipe gestures on mobile drawer
  let touchStartY = 0;
  let touchStartX = 0;

  drawer?.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  drawer?.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);

      // Predominantly vertical swipe gesture
      if (Math.abs(deltaY) > 25 && Math.abs(deltaY) > deltaX) {
        if (deltaY < -25 && drawer.classList.contains('collapsed')) {
          // Swiped UP when collapsed -> Expand drawer
          setDrawerCollapsed(false);
        } else if (deltaY > 40 && !drawer.classList.contains('collapsed')) {
          // Swiped DOWN on header -> Collapse drawer
          const target = e.target as HTMLElement;
          if (target.closest('.drawer-header')) {
            setDrawerCollapsed(true);
          }
        }
      }
    }
  }, { passive: true });

  // Sync initial tab state on mobile (Workouts is first tab)
  const activeTabBtn = document.querySelector<HTMLButtonElement>('.mobile-tab-btn.active');
  const initialTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') || 'workouts' : 'workouts';

  sections.forEach((sec) => {
    if (sec.getAttribute('data-section') === initialTab) {
      sec.classList.add('active-mobile-section');
    } else {
      sec.classList.remove('active-mobile-section');
    }
  });

  const initialMeta = TAB_METADATA[initialTab];
  if (initialMeta) {
    if (drawerActiveIcon) drawerActiveIcon.textContent = initialMeta.icon;
    if (drawerActiveTitle) drawerActiveTitle.textContent = initialMeta.title;
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab') || 'workouts';
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Expand drawer to show controls
      setDrawerCollapsed(false);

      const drawerBody = document.getElementById('drawerBody');
      if (drawerBody) drawerBody.scrollTop = 0;

      sections.forEach((sec) => {
        if (sec.getAttribute('data-section') === targetTab) {
          sec.classList.add('active-mobile-section');
          sec.scrollTop = 0;
        } else {
          sec.classList.remove('active-mobile-section');
        }
      });

      const meta = TAB_METADATA[targetTab];
      if (meta) {
        if (drawerActiveIcon) drawerActiveIcon.textContent = meta.icon;
        if (drawerActiveTitle) drawerActiveTitle.textContent = meta.title;
      }
    });
  });
}

function setupAspectRatios() {
  const btns = document.querySelectorAll('[data-ratio]');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const ratio = btn.getAttribute('data-ratio') as AspectRatio;
      currentConfig.aspectRatio = ratio;
      triggerRender();
      pushHistory();
    });
  });
}

function setupPalette() {
  const dots = document.querySelectorAll('.color-dot');
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      dots.forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      currentConfig.accentColor = dot.getAttribute('data-color') || '#c8ff00';
      triggerRender();
      pushHistory();
    });
  });

  if (customColorPicker) {
    customColorPicker.addEventListener('input', () => {
      dots.forEach((d) => d.classList.remove('active'));
      currentConfig.accentColor = customColorPicker.value;
      triggerRender();
    });
    customColorPicker.addEventListener('change', () => {
      pushHistory();
      showToast(`Selected custom accent: ${customColorPicker.value}`);
    });
  }

  const routeBtns = document.querySelectorAll('[data-routemode]');
  routeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      routeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentConfig.routeColorMode = (btn.getAttribute('data-routemode') || 'elevation') as any;
      triggerRender();
      pushHistory();
    });
  });
}

function setupLayoutTemplates() {
  const cards = document.querySelectorAll<HTMLButtonElement>('.layout-template-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const layout = (card.getAttribute('data-layout') || 'classic') as OverlayLayoutId;
      currentConfig.layoutId = layout;
      triggerRender();
      pushHistory();
      const label = card.querySelector('.ltc-label')?.textContent || layout;
      showToast(`Selected: ${label} layout`);
    });
  });
}

const availableGears: string[] = ['Salomon S/Lab', 'Nike Vaporfly 3', 'Trek Emonda SLR 9'];

function updateGearSuggestions(newGears: string[]) {
  for (const g of newGears) {
    if (g && !availableGears.includes(g)) {
      availableGears.push(g);
    }
  }
  renderGearChips();
}

function renderGearChips() {
  const datalist = document.getElementById('gearSuggestions') as HTMLDataListElement;
  if (datalist) {
    datalist.innerHTML = availableGears.map((g) => `<option value="${g}">`).join('');
  }
  const chipsContainer = document.getElementById('gearQuickChips');
  if (!chipsContainer) return;
  chipsContainer.innerHTML = '';
  availableGears.slice(0, 8).forEach((gear) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'gear-chip';
    chip.textContent = gear;
    chip.addEventListener('click', () => {
      const cur = editLocationInput.value.trim();
      let newLocation = '';
      if (!cur) {
        newLocation = gear;
      } else if (cur.includes('•')) {
        const parts = cur.split('•').map((s) => s.trim()).filter(Boolean);
        newLocation = `${parts[0]} • ${gear}`;
      } else {
        newLocation = `${cur} • ${gear}`;
      }
      editLocationInput.value = newLocation;
      currentActivity.gearName = gear;
      currentActivity.locationCity = newLocation;
      triggerRender();
      pushHistory();
    });
    chipsContainer.appendChild(chip);
  });
}

function setupTextEditor() {
  renderGearChips();
  editTitleInput.addEventListener('input', () => {
    currentActivity.title = editTitleInput.value;
    triggerRender();
    pushHistory();
  });
  editDistInput.addEventListener('input', () => {
    const km = parseFloat(editDistInput.value) || 0;
    currentActivity.distanceMeters = Math.round(km * 1000);
    if (km > 0 && currentActivity.movingTimeSec > 0) {
      currentActivity.avgPaceSecPerKm = Math.round(currentActivity.movingTimeSec / km);
    }
    triggerRender();
    pushHistory();
  });
  editEleInput.addEventListener('input', () => {
    currentActivity.elevationGainMeters = parseInt(editEleInput.value, 10) || 0;
    triggerRender();
    pushHistory();
  });
  editLocationInput.addEventListener('input', () => {
    currentActivity.locationCity = editLocationInput.value;
    triggerRender();
    pushHistory();
  });
}

function setupExport() {
  // Download HD Image (exports current canvas view)
  downloadBtn.addEventListener('click', () => {
    const isTrans = !!currentConfig.transparentBackground;
    const cleanTitle = currentActivity.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const link = document.createElement('a');
    link.download = `runcraft_${isTrans ? 'overlay_' : ''}${cleanTitle}${isTrans ? '_transparent' : ''}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    showToast(isTrans ? 'Downloaded transparent overlay PNG!' : 'Downloaded HD Image!');
  });

  // Copy Image to Clipboard (Instant sharing)
  if (copyImageBtn) {
    copyImageBtn.addEventListener('click', () => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Could not generate image blob', true);
          return;
        }
        if (navigator.clipboard && (window as any).ClipboardItem) {
          try {
            const item = new (window as any).ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('📋 Copied HD image to clipboard! Ready to paste.');
            return;
          } catch (clipErr) {
            console.warn('Clipboard write failed, fallback to download:', clipErr);
          }
        }
        downloadBtn.click();
        showToast('Image downloaded! (Clipboard write not permitted in browser)');
      }, 'image/png', 1.0);
    });
  }

  // Download Transparent Overlay (No background / overlay only)
  const downloadOverlayBtn = document.getElementById('downloadOverlayBtn');
  const drawerQuickOverlayBtn = document.getElementById('drawerQuickOverlayBtn');

  function exportTransparentOverlay(e?: Event) {
    e?.stopPropagation();
    const cleanTitle = currentActivity.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    if (currentConfig.transparentBackground) {
      // Already in transparent mode, download directly
      const link = document.createElement('a');
      link.download = `runcraft_overlay_${cleanTitle}_transparent.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      showToast('Exported transparent overlay PNG!');
      return;
    }

    // Render transparent overlay temporarily without losing user's photo/state
    canvasEngine.render(currentActivity, { ...currentConfig, transparentBackground: true });
    const link = document.createElement('a');
    link.download = `runcraft_overlay_${cleanTitle}_transparent.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();

    // Re-render active view
    canvasEngine.render(currentActivity, currentConfig);
    showToast('Exported transparent overlay PNG!');
  }

  downloadOverlayBtn?.addEventListener('click', exportTransparentOverlay);
  drawerQuickOverlayBtn?.addEventListener('click', exportTransparentOverlay);

  // Share to Social (Web Share API)
  shareBtn.addEventListener('click', async () => {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'workout_overlay.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: currentActivity.title,
            text: `Finished ${currentActivity.title}! ${(currentActivity.distanceMeters / 1000).toFixed(1)} km run overlay created with RunCraft.`,
            files: [file],
          });
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            downloadBtn.click();
          }
        }
      } else {
        // Fallback for desktop browsers without Web Share files support
        downloadBtn.click();
        showToast('Image downloaded! Ready to share to Stories or feed.');
      }
    }, 'image/png', 0.95);
  });
}

/**
 * Direct Canvas Manipulation: Drag to Pan Photo, Wheel to Zoom, Controls
 */
function setupCanvasInteraction() {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialOffset = { x: 0, y: 0 };

  function updateZoomReadout() {
    if (zoomReadoutText && canvasEngine) {
      const { zoom } = canvasEngine.getImageTransform();
      zoomReadoutText.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  function onPointerDown(clientX: number, clientY: number) {
    if (!canvasEngine || !canvasEngine.hasImage()) return;
    isDragging = true;
    startX = clientX;
    startY = clientY;
    initialOffset = canvasEngine.getImageTransform().offset;
    canvasWrapper?.classList.add('is-panning');
    if (canvasPanHint) canvasPanHint.style.opacity = '0';
  }

  function onPointerMove(clientX: number, clientY: number) {
    if (!isDragging || !canvasEngine) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const deltaX = (clientX - startX) * scaleX;
    const deltaY = (clientY - startY) * scaleY;

    const currentZoom = canvasEngine.getImageTransform().zoom;
    canvasEngine.setImageTransform(
      {
        x: initialOffset.x + deltaX,
        y: initialOffset.y + deltaY,
      },
      currentZoom
    );
    triggerRender();
  }

  function onPointerUp() {
    if (isDragging) {
      isDragging = false;
      canvasWrapper?.classList.remove('is-panning');
      pushHistory();
    }
  }

  // Mouse drag
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    onPointerDown(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) onPointerMove(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', () => {
    onPointerUp();
  });

  // Touch drag
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    onPointerUp();
  });

  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    if (!canvasEngine || !canvasEngine.hasImage()) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    const { offset, zoom } = canvasEngine.getImageTransform();
    const newZoom = Math.max(0.5, Math.min(4.0, zoom * factor));
    canvasEngine.setImageTransform(offset, newZoom);
    updateZoomReadout();
    triggerRender();
    pushHistory();
    if (canvasPanHint) canvasPanHint.style.opacity = '0';
  }, { passive: false });

  // Double click canvas to reset pan & zoom
  canvas.addEventListener('dblclick', () => {
    if (!canvasEngine || !canvasEngine.hasImage()) return;
    canvasEngine.resetImageTransform();
    updateZoomReadout();
    triggerRender();
    pushHistory();
    showToast('Reset photo position and zoom');
  });

  // Floating Zoom Toolbar Buttons
  zoomInBtn?.addEventListener('click', () => {
    if (!canvasEngine) return;
    const { offset, zoom } = canvasEngine.getImageTransform();
    const newZoom = Math.min(4.0, zoom * 1.15);
    canvasEngine.setImageTransform(offset, newZoom);
    updateZoomReadout();
    triggerRender();
    pushHistory();
  });

  zoomOutBtn?.addEventListener('click', () => {
    if (!canvasEngine) return;
    const { offset, zoom } = canvasEngine.getImageTransform();
    const newZoom = Math.max(0.5, zoom * 0.85);
    canvasEngine.setImageTransform(offset, newZoom);
    updateZoomReadout();
    triggerRender();
    pushHistory();
  });

  zoomResetBtn?.addEventListener('click', () => {
    if (!canvasEngine) return;
    canvasEngine.resetImageTransform();
    updateZoomReadout();
    triggerRender();
    pushHistory();
    showToast('Reset photo zoom and position');
  });

  panResetBtn?.addEventListener('click', () => {
    if (!canvasEngine) return;
    const { zoom } = canvasEngine.getImageTransform();
    canvasEngine.setImageTransform({ x: 0, y: 0 }, zoom);
    triggerRender();
    pushHistory();
    showToast('Centered photo position');
  });
}

/**
 * Keyboard Shortcuts Guide & Focus Canvas Mode
 */
function setupShortcutsAndFocusMode() {
  const studioContainer = document.querySelector('.studio-container');

  undoBtn?.addEventListener('click', undo);
  redoBtn?.addEventListener('click', redo);

  function toggleFocusMode() {
    if (!studioContainer) return;
    const isFocus = studioContainer.classList.toggle('is-focus-mode');
    focusModeBtn?.classList.toggle('active', isFocus);
    showToast(isFocus ? 'Entered Focus Canvas Mode (press F or Esc to exit)' : 'Exited Focus Mode');
  }

  focusModeBtn?.addEventListener('click', toggleFocusMode);

  function toggleShortcutsModal(show?: boolean) {
    if (!shortcutsModal) return;
    const shouldShow = show !== undefined ? show : !shortcutsModal.classList.contains('open');
    if (shouldShow) {
      shortcutsModal.classList.add('open');
    } else {
      shortcutsModal.classList.remove('open');
    }
  }

  shortcutsBtn?.addEventListener('click', () => toggleShortcutsModal(true));
  closeShortcutsModalBtn?.addEventListener('click', () => toggleShortcutsModal(false));
  shortcutsModal?.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) toggleShortcutsModal(false);
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // Escape closes any modal or exits focus mode
    if (e.key === 'Escape') {
      if (shortcutsModal?.classList.contains('open')) {
        toggleShortcutsModal(false);
        return;
      }
      if (intervalsModal?.classList.contains('open')) {
        intervalsModal.classList.remove('open');
        return;
      }
      if (stravaModal?.classList.contains('open')) {
        stravaModal.classList.remove('open');
        return;
      }
      if (studioContainer?.classList.contains('is-focus-mode')) {
        toggleFocusMode();
        return;
      }
    }

    // Ctrl+Z / Cmd+Z (Undo / Redo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    // Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl+S or Ctrl+D (Download HD Image)
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      downloadBtn?.click();
      return;
    }

    // Single-key shortcuts below: ignore if typing in inputs
    if (isInput) return;

    if (e.key === '?') {
      e.preventDefault();
      toggleShortcutsModal();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFocusMode();
    } else if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      const transparentToggle = document.getElementById('transparentBgToggle') as HTMLInputElement | null;
      if (transparentToggle) {
        transparentToggle.checked = !transparentToggle.checked;
        transparentToggle.dispatchEvent(new Event('change'));
      }
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const ratioMap: Record<string, AspectRatio> = { '1': '9:16', '2': '4:5', '3': '1:1', '4': '16:9' };
      const targetRatio = ratioMap[e.key];
      if (targetRatio) {
        const btn = document.querySelector<HTMLButtonElement>(`[data-ratio="${targetRatio}"]`);
        btn?.click();
      }
    }
  });
}

/**
 * Global Drag & Drop: Drag photos, .FIT or .GPX files anywhere on the browser window
 */
function setupGlobalDragDrop() {
  const overlay = document.getElementById('globalDropOverlay');
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (overlay && e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      overlay.style.display = 'flex';
    }
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0 && overlay) {
      overlay.style.display = 'none';
      dragCounter = 0;
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (overlay) overlay.style.display = 'none';

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith('.fit')) {
      handleFitFile(file);
    } else if (name.endsWith('.gpx')) {
      handleGpxFile(file);
    } else if (file.type.startsWith('image/')) {
      handlePhotoFile(file);
    } else {
      showToast('Unsupported file format. Please drop .fit, .gpx, or photo files.', true);
    }
  });
}

/**
 * Real-time Workout Search in Presets & Intervals List
 */
function setupWorkoutSearch() {
  if (!workoutSearchInput) return;

  workoutSearchInput.addEventListener('input', () => {
    const q = workoutSearchInput.value.toLowerCase().trim();
    const filterContainer = (container: HTMLElement | null) => {
      if (!container) return;
      const items = container.querySelectorAll<HTMLElement>('.activity-item');
      items.forEach((item) => {
        const text = item.textContent?.toLowerCase() || '';
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    };

    filterContainer(viewPresets);
    filterContainer(intervalsActivityList);
  });
}


function showStravaAlert(msg: string, type: 'error' | 'success' | 'info') {
  stravaStatusAlert.style.display = 'block';
  stravaStatusAlert.textContent = msg;
  if (type === 'error') {
    stravaStatusAlert.style.background = 'rgba(255, 74, 54, 0.15)';
    stravaStatusAlert.style.color = '#ff4a36';
    stravaStatusAlert.style.border = '1px solid rgba(255, 74, 54, 0.3)';
  } else if (type === 'success') {
    stravaStatusAlert.style.background = 'rgba(0, 255, 136, 0.15)';
    stravaStatusAlert.style.color = '#00ff88';
    stravaStatusAlert.style.border = '1px solid rgba(0, 255, 136, 0.3)';
  } else {
    stravaStatusAlert.style.background = 'rgba(0, 240, 255, 0.15)';
    stravaStatusAlert.style.color = '#00f0ff';
    stravaStatusAlert.style.border = '1px solid rgba(0, 240, 255, 0.3)';
  }
}

async function loadStravaActivities(token: string, silent = false): Promise<boolean> {
  if (!silent) showStravaAlert('Connecting to Strava API...', 'info');

  try {
    const res = await fetch('/api/strava/activities', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error || err.details?.message || (typeof err.details === 'string' ? err.details : 'Failed to fetch workouts from Strava');
      throw new Error(msg);
    }

    const data = await res.json();
    const activities: WorkoutActivity[] = data.activities || [];
    const gears: Array<{ id: string; name: string }> = data.gears || [];
    if (gears.length > 0) {
      updateGearSuggestions(gears.map((g) => g.name));
    }

    if (activities.length === 0) {
      if (!silent) showStravaAlert('Connected! No recent activities found on your Strava account.', 'info');
      return true;
    }

    // Save token
    localStorage.setItem('strava_access_token', token);

    // Update UI badge
    const stravaBtnLabel = document.getElementById('stravaBtnLabel');
    if (stravaBtnLabel) stravaBtnLabel.textContent = 'Strava Connected ✓';
    stravaConnectBtn.style.background = '#00ff88';
    stravaConnectBtn.style.color = '#0b0f17';

    // Populate activities into viewPresets
    viewPresets.innerHTML = '';
    activities.forEach((act, idx) => {
      const item = document.createElement('div');
      item.className = `activity-item ${idx === 0 ? 'active' : ''}`;
      item.innerHTML = `
        <div class="act-info">
          <h4>${act.title}</h4>
          <div class="act-meta">${formatActivityMeta(act)}</div>
        </div>
        <span class="act-badge" style="background: rgba(252, 76, 2, 0.2); color: #fc4c02;">${getSportIcon(act.sportType)} ${act.sportType}</span>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.activity-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        currentActivity = { ...act };
        syncEditorInputs();
        triggerRender();
      });
      viewPresets.appendChild(item);
    });

    // Select the first activity immediately
    currentActivity = { ...activities[0] };
    syncEditorInputs();
    triggerRender();

    if (!silent) {
      showStravaAlert(`Successfully imported ${activities.length} workouts from Strava!`, 'success');
      setTimeout(() => {
        stravaModal.classList.remove('open');
      }, 1400);
    }

    return true;
  } catch (err: any) {
    localStorage.removeItem('strava_access_token');
    if (!silent) {
      showStravaAlert(`Strava Error: ${err.message}`, 'error');
    }
    return false;
  }
}

function setupStravaModal() {
  // Load saved credentials if any
  const savedId = localStorage.getItem('strava_client_id');
  if (savedId) stravaClientIdInput.value = savedId;
  const savedSecret = localStorage.getItem('strava_client_secret');
  if (savedSecret) stravaClientSecretInput.value = savedSecret;

  stravaConnectBtn.addEventListener('click', () => {
    stravaModal.classList.add('open');
    stravaStatusAlert.style.display = 'none';
  });

  closeStravaModalBtn.addEventListener('click', () => {
    stravaModal.classList.remove('open');
  });

  stravaModal.addEventListener('click', (e) => {
    if (e.target === stravaModal) stravaModal.classList.remove('open');
  });

  // Option 1: Instant Connect via Personal Access Token
  stravaTokenSubmitBtn.addEventListener('click', async () => {
    const token = stravaTokenInput.value.trim();
    if (!token) {
      showStravaAlert('Please paste your Access Token from strava.com/settings/api', 'error');
      return;
    }
    await loadStravaActivities(token);
  });

  // Option 2: OAuth 2.0 Proceed Button
  stravaAuthProceedBtn.addEventListener('click', () => {
    const clientId = stravaClientIdInput.value.trim();
    const clientSecret = stravaClientSecretInput.value.trim();

    if (!clientId) {
      showStravaAlert('Please enter your Strava Client ID', 'error');
      stravaClientIdInput.focus();
      return;
    }

    if (!clientSecret) {
      showStravaAlert('Please enter your Client Secret from strava.com/settings/api (required to complete the OAuth exchange).', 'error');
      stravaClientSecretInput.focus();
      return;
    }

    localStorage.setItem('strava_client_id', clientId);
    localStorage.setItem('strava_client_secret', clientSecret);

    // Redirect to Strava OAuth
    const redirectUri = window.location.origin + '/';
    const scope = 'read,activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&approval_prompt=auto&scope=${encodeURIComponent(scope)}`;

    showStravaAlert('Redirecting to Strava for authorization...', 'info');
    setTimeout(() => {
      window.location.href = authUrl;
    }, 200);
  });

  // Option 3: Demo Workouts
  stravaDemoBtn.addEventListener('click', () => {
    stravaModal.classList.remove('open');
    const stravaBtnLabel = document.getElementById('stravaBtnLabel');
    if (stravaBtnLabel) stravaBtnLabel.textContent = 'Athlete Connected ✓';
    stravaConnectBtn.style.background = '#00ff88';
    stravaConnectBtn.style.color = '#0b0f17';
    renderPresetsList();
    pushHistory(true);
    showToast('Connected demo workouts! Customize overlays below.');
  });
}

/**
 * Handle incoming OAuth redirects (?code=...) on page load
 */
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    stravaModal.classList.add('open');
    showStravaAlert(`Strava Authorization error: ${error}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (code) {
    stravaModal.classList.add('open');
    showStravaAlert('Authorization code received! Exchanging token with Strava...', 'info');

    const clientId = localStorage.getItem('strava_client_id') || '137524';
    const clientSecret = localStorage.getItem('strava_client_secret') || '';

    try {
      const res = await fetch('/api/strava/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, clientId, clientSecret }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details?.message || 'Token exchange failed. Check Client Secret.');
      }

      const accessToken = data.accessToken;
      if (accessToken) {
        await loadStravaActivities(accessToken);
      }
    } catch (err: any) {
      showStravaAlert(`OAuth Exchange Failed: ${err.message}. If needed, you can paste your Access Token directly above.`, 'error');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

function showIntervalsAlert(msg: string, type: 'error' | 'success' | 'info') {
  if (!intervalsStatusAlert) return;
  intervalsStatusAlert.style.display = 'block';
  intervalsStatusAlert.textContent = msg;
  if (type === 'error') {
    intervalsStatusAlert.style.background = 'rgba(255, 74, 54, 0.15)';
    intervalsStatusAlert.style.color = '#ff4a36';
    intervalsStatusAlert.style.border = '1px solid rgba(255, 74, 54, 0.3)';
  } else if (type === 'success') {
    intervalsStatusAlert.style.background = 'rgba(0, 255, 136, 0.15)';
    intervalsStatusAlert.style.color = '#00ff88';
    intervalsStatusAlert.style.border = '1px solid rgba(0, 255, 136, 0.3)';
  } else {
    intervalsStatusAlert.style.background = 'rgba(0, 240, 255, 0.15)';
    intervalsStatusAlert.style.color = '#00f0ff';
    intervalsStatusAlert.style.border = '1px solid rgba(0, 240, 255, 0.3)';
  }
}

let intervalsSelectedDays = localStorage.getItem('intervals_filter_days') || '365';

function daysLabel(days: string): string {
  if (days === '30') return 'Last 30 Days';
  if (days === '90') return 'Last 90 Days';
  if (days === '365' || days === '1y') return 'Last 1 Year';
  if (days === 'all' || days === 'max' || days === '3650') return 'All Time';
  return `Last ${days} Days`;
}

async function loadIntervalsActivities(apiKey: string, silent = false, daysOverride?: string): Promise<boolean> {
  const cleanKey = apiKey.trim().replace(/^API_KEY[:=]\s*/i, '').replace(/["']/g, '');
  if (!cleanKey) return false;

  const days = daysOverride || intervalsSelectedDays;
  intervalsSelectedDays = days;
  localStorage.setItem('intervals_filter_days', days);

  if (!silent) showIntervalsAlert(`Connecting to Intervals.icu & pulling Garmin workouts (${daysLabel(days)})...`, 'info');
  if (intervalsCountBadge) intervalsCountBadge.textContent = 'Syncing...';

  try {
    const res = await fetch(`/api/intervals/activities?days=${days}`, {
      headers: { Authorization: `Bearer ${cleanKey}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to connect to Intervals.icu. Check your API key.');
    }

    const data = await res.json();
    const activities: WorkoutActivity[] = data.activities || [];
    const gears: Array<{ id: string; name: string }> = data.gears || [];
    if (gears.length > 0) {
      updateGearSuggestions(gears.map((g) => g.name));
    }

    // Save API key
    localStorage.setItem('intervals_api_key', cleanKey);

    // Update UI badge
    if (intervalsBtnLabel) intervalsBtnLabel.textContent = 'Garmin Synced ✓';
    const shortLabel = intervalsConnectBtn.querySelector('.btn-text-short');
    if (shortLabel) shortLabel.textContent = 'Garmin ✓';
    intervalsConnectBtn.classList.add('connected');
    intervalsConnectBtn.style.background = '';
    intervalsConnectBtn.style.color = '';

    // Show controls toolbar, hide connect prompt
    if (intervalsConnectPrompt) intervalsConnectPrompt.style.display = 'none';
    if (intervalsControls) intervalsControls.style.display = 'block';

    // Update athlete name
    if (data.athlete?.name && intervalsAthleteLabel) {
      intervalsAthleteLabel.textContent = data.athlete.name;
    }

    // Update date filter pills active state
    if (intervalsDateFilters) {
      const filterBtns = intervalsDateFilters.querySelectorAll<HTMLButtonElement>('.segment-btn');
      filterBtns.forEach((btn) => {
        if (btn.dataset.days === days) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Update badges
    if (intervalsRangeBadge) intervalsRangeBadge.textContent = daysLabel(days);
    if (intervalsCountBadge) intervalsCountBadge.textContent = `${activities.length} workout${activities.length === 1 ? '' : 's'}`;

    if (activities.length === 0) {
      if (!silent) showIntervalsAlert(`Connected! No activities found in ${daysLabel(days)}. Try switching to "All" or "1 Year".`, 'info');
      intervalsActivityList.style.display = 'block';
      intervalsActivityList.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          No workouts in selected range (${daysLabel(days)}).
          <div style="margin-top: 6px; color: var(--accent-cyan); font-weight: 600;">Switch to <strong>1 Year</strong> or <strong>All</strong> above to view your full history!</div>
        </div>
      `;
      return true;
    }

    intervalsActivityList.style.display = 'flex';
    intervalsActivityList.innerHTML = '';

    activities.forEach((act, idx) => {
      const item = document.createElement('div');
      item.className = `activity-item ${idx === 0 ? 'active' : ''}`;
      item.innerHTML = `
        <div class="act-info">
          <h4>${act.title}</h4>
          <div class="act-meta">${formatActivityMeta(act)}</div>
        </div>
        <span class="act-badge" style="background: rgba(0, 240, 255, 0.15); color: #00f0ff;">${getSportIcon(act.sportType)} ${act.sportType}</span>
      `;
      item.addEventListener('click', async () => {
        document.querySelectorAll('#intervalsActivityList .activity-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        currentActivity = { ...act };
        syncEditorInputs();
        triggerRender();

        // Lazy fetch GPS route streams if not yet loaded
        if (!currentActivity.points || currentActivity.points.length === 0) {
          try {
            const streamRes = await fetch(`/api/intervals/activities/${act.id}/streams`, {
              headers: { Authorization: `Bearer ${cleanKey}` },
            });
            if (streamRes.ok) {
              const streamData = await streamRes.json();
              if (streamData.points && streamData.points.length > 0) {
                act.points = streamData.points;
                currentActivity.points = streamData.points;
              }
              if (streamData.splits && streamData.splits.length > 0) {
                act.splits = streamData.splits;
                currentActivity.splits = streamData.splits;
              }
              if (streamData.elevationGainMeters !== undefined) {
                act.elevationGainMeters = streamData.elevationGainMeters;
                currentActivity.elevationGainMeters = streamData.elevationGainMeters;
                if (editEleInput) editEleInput.value = currentActivity.elevationGainMeters.toString();
              }
              if (streamData.gearName && !act.gearName) {
                act.gearName = streamData.gearName;
                currentActivity.gearName = streamData.gearName;
                syncEditorInputs();
              }
              triggerRender();
            }
          } catch {}
        }
      });
      intervalsActivityList.appendChild(item);
    });

    // Select first activity
    currentActivity = { ...activities[0] };
    syncEditorInputs();
    triggerRender();

    // Fetch GPS stream for the first activity immediately
    fetch(`/api/intervals/activities/${activities[0].id}/streams`, {
      headers: { Authorization: `Bearer ${cleanKey}` },
    })
      .then((r) => r.json())
      .then((s) => {
        if (s.points && s.points.length > 0) {
          activities[0].points = s.points;
          currentActivity.points = s.points;
        }
        if (s.splits && s.splits.length > 0) {
          activities[0].splits = s.splits;
          currentActivity.splits = s.splits;
        }
        if (s.elevationGainMeters !== undefined) {
          activities[0].elevationGainMeters = s.elevationGainMeters;
          currentActivity.elevationGainMeters = s.elevationGainMeters;
          if (editEleInput) editEleInput.value = currentActivity.elevationGainMeters.toString();
        }
        if (s.gearName && !activities[0].gearName) {
          activities[0].gearName = s.gearName;
          currentActivity.gearName = s.gearName;
          syncEditorInputs();
        }
        triggerRender();
      })
      .catch(() => {});

    if (!silent) {
      showIntervalsAlert(`Successfully loaded ${activities.length} workouts from Garmin!`, 'success');
      showToast(`⚡ Synced ${activities.length} Garmin workouts!`);
      setTimeout(() => {
        intervalsModal.classList.remove('open');
      }, 1200);
    }

    return true;
  } catch (err: any) {
    if (intervalsCountBadge) intervalsCountBadge.textContent = 'Error loading';
    if (!silent) {
      showIntervalsAlert(`Intervals.icu Error: ${err.message}`, 'error');
    }
    return false;
  }
}

function setupIntervalsModal() {
  const savedKey = localStorage.getItem('intervals_api_key');
  if (savedKey && intervalsApiKeyInput) intervalsApiKeyInput.value = savedKey;

  const openModal = () => {
    intervalsModal.classList.add('open');
    if (intervalsStatusAlert) intervalsStatusAlert.style.display = 'none';
  };

  if (intervalsConnectBtn) intervalsConnectBtn.addEventListener('click', openModal);
  if (openIntervalsModalFromSidebarBtn) openIntervalsModalFromSidebarBtn.addEventListener('click', openModal);
  if (intervalsKeyChangeBtn) intervalsKeyChangeBtn.addEventListener('click', openModal);

  // Date Filter click handlers (30D, 90D, 1 Year, All)
  if (intervalsDateFilters) {
    intervalsDateFilters.querySelectorAll<HTMLButtonElement>('.segment-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const days = btn.dataset.days || '365';
        const key = localStorage.getItem('intervals_api_key') || intervalsApiKeyInput.value.trim();
        if (key) {
          showToast(`Fetching ${daysLabel(days)} workouts...`);
          await loadIntervalsActivities(key, false, days);
        } else {
          openModal();
        }
      });
    });
  }

  // Refresh Sync Button
  if (intervalsRefreshBtn) {
    intervalsRefreshBtn.addEventListener('click', async () => {
      const key = localStorage.getItem('intervals_api_key') || intervalsApiKeyInput.value.trim();
      if (key) {
        showToast('🔄 Syncing latest Garmin workouts...');
        intervalsRefreshBtn.classList.add('is-syncing');
        try {
          await loadIntervalsActivities(key, false, intervalsSelectedDays);
        } finally {
          intervalsRefreshBtn.classList.remove('is-syncing');
        }
      } else {
        openModal();
      }
    });
  }

  if (closeIntervalsModalBtn) {
    closeIntervalsModalBtn.addEventListener('click', () => {
      intervalsModal.classList.remove('open');
    });
  }

  intervalsModal.addEventListener('click', (e) => {
    if (e.target === intervalsModal) intervalsModal.classList.remove('open');
  });

  if (intervalsKeySubmitBtn) {
    intervalsKeySubmitBtn.addEventListener('click', async () => {
      const key = intervalsApiKeyInput.value.trim();
      if (!key) {
        showIntervalsAlert('Please paste your Intervals.icu API key', 'error');
        intervalsApiKeyInput.focus();
        return;
      }
      await loadIntervalsActivities(key, false, intervalsSelectedDays);
    });
  }
}

// Start Application on Load
window.addEventListener('DOMContentLoaded', initApp);
