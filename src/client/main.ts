/**
 * RunCraft Application Orchestrator
 * Connects CanvasEngine, parsers, and UI controls
 */

import { CanvasEngine } from './studio/canvasEngine.js';
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

  // Initial Render
  triggerRender();

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

function renderPresetsList() {
  viewPresets.innerHTML = '';
  MOCK_ACTIVITIES.forEach((act, idx) => {
    const item = document.createElement('div');
    item.className = `activity-item ${act.id === currentActivity.id ? 'active' : ''}`;
    item.innerHTML = `
      <div class="act-info">
        <h4>${act.title}</h4>
        <div class="act-meta">${(act.distanceMeters / 1000).toFixed(1)} km • ${act.date}</div>
      </div>
      <span class="act-badge">${act.sportType}</span>
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
      <div class="act-meta">${(act.distanceMeters / 1000).toFixed(1)} km • ${act.date}</div>
    </div>
    <span class="act-badge">${act.sportType}</span>
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
    showToast(`⚡ Loaded ${(act.distanceMeters / 1000).toFixed(1)}km Garmin workout: ${act.title}`);
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
    alert('Please choose an image file (JPEG, PNG, WEBP).');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    document.querySelectorAll('.sample-thumb').forEach((t) => t.classList.remove('active'));
    loadBackdropImage(dataUrl);
  };
  reader.readAsDataURL(file);
}

function setupSliders() {
  vignetteSlider.addEventListener('input', () => {
    const v = parseFloat(vignetteSlider.value);
    currentConfig.photoFilters.vignette = v;
    vignetteVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
  });

  brightnessSlider.addEventListener('input', () => {
    const v = parseFloat(brightnessSlider.value);
    currentConfig.photoFilters.brightness = v;
    brightnessVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
  });

  contrastSlider.addEventListener('input', () => {
    const v = parseFloat(contrastSlider.value);
    currentConfig.photoFilters.contrast = v;
    contrastVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
  });

  saturationSlider.addEventListener('input', () => {
    const v = parseFloat(saturationSlider.value);
    currentConfig.photoFilters.saturation = v;
    saturationVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
  });

  opacitySlider.addEventListener('input', () => {
    const v = parseFloat(opacitySlider.value);
    currentConfig.cardOpacity = v;
    opacityVal.textContent = `${Math.round(v * 100)}%`;
    triggerRender();
  });

  if (glowSlider && glowVal) {
    glowSlider.addEventListener('input', () => {
      const v = parseFloat(glowSlider.value);
      currentConfig.glowIntensity = v;
      glowVal.textContent = `${Math.round(v * 100)}%`;
      triggerRender();
    });
  }
}

function setupToggles() {
  togglePolyline.addEventListener('change', () => {
    currentConfig.showPolyline = togglePolyline.checked;
    triggerRender();
  });
  toggleGlow.addEventListener('change', () => {
    currentConfig.showGlow = toggleGlow.checked;
    if (glowSliderGroup) {
      glowSliderGroup.style.display = toggleGlow.checked ? 'block' : 'none';
    }
    triggerRender();
  });
  togglePins.addEventListener('change', () => {
    currentConfig.showStartFinishPins = togglePins.checked;
    triggerRender();
  });
  toggleHeader.addEventListener('change', () => {
    currentConfig.showTitleHeader = toggleHeader.checked;
    triggerRender();
  });
  toggleHeroStats.addEventListener('change', () => {
    currentConfig.showHeroStats = toggleHeroStats.checked;
    triggerRender();
  });
  if (toggleSecondaryStats) {
    toggleSecondaryStats.addEventListener('change', () => {
      currentConfig.showSecondaryStats = toggleSecondaryStats.checked;
      triggerRender();
    });
  }
  toggleHrZones.addEventListener('change', () => {
    currentConfig.showHrZones = toggleHrZones.checked;
    triggerRender();
  });
  toggleWatermark.addEventListener('change', () => {
    currentConfig.showWatermark = toggleWatermark.checked;
    triggerRender();
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
    });
  }
  if (toggleMetricTime) {
    toggleMetricTime.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.time = toggleMetricTime.checked;
      triggerRender();
    });
  }
  if (toggleMetricPace) {
    toggleMetricPace.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.pace = toggleMetricPace.checked;
      triggerRender();
    });
  }
  if (toggleMetricEle) {
    toggleMetricEle.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.elevation = toggleMetricEle.checked;
      triggerRender();
    });
  }
  if (toggleMetricHr) {
    toggleMetricHr.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.heartRate = toggleMetricHr.checked;
      triggerRender();
    });
  }
  if (toggleMetricCadence) {
    toggleMetricCadence.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.cadence = toggleMetricCadence.checked;
      triggerRender();
    });
  }
  if (toggleMetricCalories) {
    toggleMetricCalories.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.calories = toggleMetricCalories.checked;
      triggerRender();
    });
  }
  if (toggleMetricPower) {
    toggleMetricPower.addEventListener('change', () => {
      ensureMetrics();
      currentConfig.metrics.power = toggleMetricPower.checked;
      triggerRender();
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
    });
  });

  const routeBtns = document.querySelectorAll('[data-routemode]');
  routeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      routeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentConfig.routeColorMode = (btn.getAttribute('data-routemode') || 'elevation') as any;
      triggerRender();
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
    });
    chipsContainer.appendChild(chip);
  });
}

function setupTextEditor() {
  renderGearChips();
  editTitleInput.addEventListener('input', () => {
    currentActivity.title = editTitleInput.value;
    triggerRender();
  });
  editDistInput.addEventListener('input', () => {
    const km = parseFloat(editDistInput.value) || 0;
    currentActivity.distanceMeters = Math.round(km * 1000);
    if (km > 0 && currentActivity.movingTimeSec > 0) {
      currentActivity.avgPaceSecPerKm = Math.round(currentActivity.movingTimeSec / km);
    }
    triggerRender();
  });
  editEleInput.addEventListener('input', () => {
    currentActivity.elevationGainMeters = parseInt(editEleInput.value, 10) || 0;
    triggerRender();
  });
  editLocationInput.addEventListener('input', () => {
    currentActivity.locationCity = editLocationInput.value;
    triggerRender();
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
        alert('Image downloaded! You can now upload it directly to Instagram Stories or your feed.');
      }
    }, 'image/png', 0.95);
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
          <div class="act-meta">${(act.distanceMeters / 1000).toFixed(1)} km • ${act.date}</div>
        </div>
        <span class="act-badge" style="background: rgba(252, 76, 2, 0.2); color: #fc4c02;">${act.sportType}</span>
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
    alert('Connected demo workouts! You can now customize overlays.');
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
          <div class="act-meta">${(act.distanceMeters / 1000).toFixed(1)} km • ${act.date}</div>
        </div>
        <span class="act-badge" style="background: rgba(0, 240, 255, 0.15); color: #00f0ff;">${act.sportType}</span>
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
