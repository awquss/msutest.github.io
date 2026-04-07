import {
  FALLBACK_THREAT_SCHEMA,
  FALLBACK_THREAT_PLATFORMS,
  FALLBACK_THREAT_WEAPONS,
  FALLBACK_THREAT_BALLISTICS
} from "./threat-fallback-data.js?v=20260322";

const DATA_ROOT_URL = new URL("../data/", import.meta.url);
const HSS_DATA_URL = new URL("HSS/", DATA_ROOT_URL);
const THREAT_DATA_URL = new URL("tehdit/", DATA_ROOT_URL);

const MAP_SCALE_METERS_PER_PIXEL = 100;
const DEFAULT_ZOOM = 0.5;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 25;
const PAN_STEP_PX = 60;
const COMPONENT_EDITOR_PAN_STEP_PX = 30;
const SHARED_DEFENDED_ASSETS_KEY = "msu:defended_assets:v1";
const SHARED_THREAT_CATALOGS_KEY = "msu:threat_catalogs:v1";
const DEFENSE_REGIONS_STATE_KEY = "msu:defense_regions:v1";
const EIRS_STATE_KEY = "msu:eirs:v1";
const EDIT_SCENARIO_IMPORT_KEY = "msu:edit_scenario_import:v1";
const EDIT_THREAT_IMPORT_KEY = "msu:edit_threat_import:v1";
const WINDOW_NAME_SHARED_STATE_KEY = "msuSharedDefendedAssets";
const WINDOW_NAME_THREAT_CATALOGS_KEY = "msuSharedThreatCatalogs";
const FRESH_SESSION_PARAM = "freshSession";

const FALLBACK_SYSTEMS = [
  { code: "HSS-N", role: "Alçak İrtifa Namlulu Nokta Hava Savunma", radarRangeKm: 35, wezRangeKm: 4 },
  { code: "HSS-A", role: "Alçak irtifa nokta hava savunma", radarRangeKm: 35, wezRangeKm: 15 },
  { code: "HSS-O", role: "Orta irtifa nokta hava savunma", radarRangeKm: 55, wezRangeKm: 25 },
  { code: "HSS-U", role: "Yüksek irtifa bölge hava savunma", radarRangeKm: 400, wezRangeKm: 150 },
  { code: "HSS-F", role: "Yüksek irtifa bölge füze savunma", radarRangeKm: 400, wezRangeKm: 50 }
];

const SYSTEM_COLORS = {
  "HSS-N": "#66d9a3",
  "HSS-A": "#5cc8ff",
  "HSS-O": "#f4d35e",
  "HSS-U": "#f08a5d",
  "HSS-F": "#e56bff"
};

const state = {
  activeTab: "areas",
  savedRegions: [],
  savedEirs: [],
  draft: null,
  eirsDraft: null,
  areaStatusMessage: "",
  areaStatusMode: "info",
  highlightedRegionId: null,
  regionCounter: 1,
  eirsCounter: 1,
  zoom: DEFAULT_ZOOM,
  panX: 0,
  panY: 0,
  eirsZoom: DEFAULT_ZOOM,
  eirsPanX: 0,
  eirsPanY: 0,

  availableSystems: [],
  systemCatalogByCode: {},
  availableMunitions: [],
  munitionCatalogByCode: {},
  criteriaByCode: {},

  selectedDeploymentRegionId: "",
  scenarioThreatDirection: "none",
  deployments: [],
  visibleDeploymentPlanIds: [],
  deploymentCounter: 1,
  deploymentDraftByRegion: {},
  deploymentAssignmentCounter: 1,
  deploymentAssignmentModal: {
    open: false,
    regionId: "",
    systemCode: "",
    assignmentId: null,
    count: 0,
    ffsCountPerUnit: 0
  },
  componentLayoutsByUnitKey: {},
  coverageLayers: {
    radar: true,
    wez: false,
    minCriteria: false,
    maxCriteria: false
  },
  deploymentView: {
    baseBounds: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedUnitKey: null,
    lastRender: null
  },
  componentEditor: {
    open: false,
    unitKey: null,
    planId: null,
    regionName: "",
    systemCode: "",
    componentSpec: null,
    radarBase: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    constraints: null,
    layout: null,
    defaultLayout: null,
    dragTarget: null,
    blindTarget: "radar",
    viewScale: 1,
    viewRangeM: 1200,
    viewZoom: 1,
    panX: 0,
    panY: 0,
    hoverError: "",
    blindError: ""
  }
};

const refs = {
  tabButtons: Array.from(document.querySelectorAll("[data-tab-btn]")),
  tabPanes: Array.from(document.querySelectorAll("[data-tab-pane]")),
  tabEirsBtn: document.getElementById("tabEirsBtn"),
  tabDeploymentBtn: document.getElementById("tabDeploymentBtn"),
  tabThreatBtn: document.getElementById("tabThreatBtn"),
  tabJsonBtn: document.getElementById("tabJsonBtn"),
  threatPlanningFrame: document.getElementById("threatPlanningFrame"),
  sharedMapCard: document.getElementById("sharedMapCard"),
  sharedMapStorage: document.getElementById("sharedMapStorage"),
  sharedMapCanvas: document.getElementById("sharedMapCanvas"),
  sharedMapTitle: document.getElementById("sharedMapTitle"),
  sharedMapHint: document.getElementById("sharedMapHint"),
  sharedMapInfo: document.getElementById("sharedMapInfo"),
  sharedLayerControls: document.getElementById("sharedLayerControls"),
  sharedThreatActions: document.getElementById("sharedThreatActions"),
  sharedThreatPointCard: document.getElementById("sharedThreatPointCard"),
  sharedThreatPayloadCard: document.getElementById("sharedThreatPayloadCard"),
  sharedThreatBallisticCard: document.getElementById("sharedThreatBallisticCard"),
  sharedMapHosts: {
    areas: document.getElementById("sharedMapHostAreas"),
    eirs: document.getElementById("sharedMapHostEirs"),
    deployment: document.getElementById("sharedMapHostDeployment"),
    threat: document.getElementById("sharedMapHostThreat")
  },

  status: document.getElementById("status"),
  regionName: document.getElementById("regionName"),
  hvaValue: document.getElementById("hvaValue"),
  defenseTypeRadios: Array.from(document.querySelectorAll("input[name='defenseType']")),
  startRegionBtn: document.getElementById("startRegionBtn"),
  saveRegionBtn: document.getElementById("saveRegionBtn"),
  cancelDraftBtn: document.getElementById("cancelDraftBtn"),
  savedList: document.getElementById("savedList"),
  savedEmpty: document.getElementById("savedEmpty"),
  eirsStatus: document.getElementById("eirsStatus"),
  eirsName: document.getElementById("eirsName"),
  eirsHvaValue: document.getElementById("eirsHvaValue"),
  startEirsBtn: document.getElementById("startEirsBtn"),
  saveEirsBtn: document.getElementById("saveEirsBtn"),
  cancelEirsDraftBtn: document.getElementById("cancelEirsDraftBtn"),
  eirsSavedList: document.getElementById("eirsSavedList"),
  eirsSavedEmpty: document.getElementById("eirsSavedEmpty"),
  eirsCanvas: document.getElementById("sharedMapCanvas"),
  eirsCoordTableBody: document.getElementById("eirsCoordTableBody"),
  eirsCoordEmpty: document.getElementById("eirsCoordEmpty"),
  eirsPanLeftBtn: document.getElementById("panLeftBtn"),
  eirsPanRightBtn: document.getElementById("panRightBtn"),
  eirsPanUpBtn: document.getElementById("panUpBtn"),
  eirsPanDownBtn: document.getElementById("panDownBtn"),
  eirsPanResetBtn: document.getElementById("panResetBtn"),
  eirsZoomOutBtn: document.getElementById("zoomOutBtn"),
  eirsZoomInBtn: document.getElementById("zoomInBtn"),
  eirsZoomResetBtn: document.getElementById("zoomResetBtn"),

  defenseCanvas: document.getElementById("sharedMapCanvas"),
  coordTableBody: document.getElementById("coordTableBody"),
  coordEmpty: document.getElementById("coordEmpty"),
  panLeftBtn: document.getElementById("panLeftBtn"),
  panRightBtn: document.getElementById("panRightBtn"),
  panUpBtn: document.getElementById("panUpBtn"),
  panDownBtn: document.getElementById("panDownBtn"),
  panResetBtn: document.getElementById("panResetBtn"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  zoomInBtn: document.getElementById("zoomInBtn"),
  zoomResetBtn: document.getElementById("zoomResetBtn"),

  deploymentStatus: document.getElementById("deploymentStatus"),
  threatDirectionSelect: document.getElementById("threatDirectionSelect"),
  defendedRegionSelect: document.getElementById("defendedRegionSelect"),
  systemPickBody: document.getElementById("systemPickBody"),
  deploymentAssignmentModal: document.getElementById("deploymentAssignmentModal"),
  deploymentAssignmentTitle: document.getElementById("deploymentAssignmentTitle"),
  deploymentAssignmentStatus: document.getElementById("deploymentAssignmentStatus"),
  deploymentAssignmentSummary: document.getElementById("deploymentAssignmentSummary"),
  deploymentAssignmentLoadoutRows: document.getElementById("deploymentAssignmentLoadoutRows"),
  deploymentAssignmentInfo: document.getElementById("deploymentAssignmentInfo"),
  deploymentAssignmentSaveBtn: document.getElementById("deploymentAssignmentSaveBtn"),
  deploymentAssignmentCancelBtn: document.getElementById("deploymentAssignmentCancelBtn"),
  deploymentAssignmentCloseBtn: document.getElementById("deploymentAssignmentCloseBtn"),
  deploymentList: document.getElementById("deploymentList"),
  deploymentEmpty: document.getElementById("deploymentEmpty"),
  layerRadarChk: document.getElementById("layerRadarChk"),
  layerWezChk: document.getElementById("layerWezChk"),
  layerMinRangeChk: document.getElementById("layerMinRangeChk"),
  layerMaxRangeChk: document.getElementById("layerMaxRangeChk"),
  deploymentPanLeftBtn: document.getElementById("panLeftBtn"),
  deploymentPanRightBtn: document.getElementById("panRightBtn"),
  deploymentPanUpBtn: document.getElementById("panUpBtn"),
  deploymentPanDownBtn: document.getElementById("panDownBtn"),
  deploymentPanResetBtn: document.getElementById("panResetBtn"),
  deploymentZoomOutBtn: document.getElementById("zoomOutBtn"),
  deploymentZoomInBtn: document.getElementById("zoomInBtn"),
  deploymentZoomResetBtn: document.getElementById("zoomResetBtn"),
  deploymentCanvas: document.getElementById("sharedMapCanvas"),
  deploymentMapInfo: document.getElementById("sharedMapInfo"),
  jsonStatus: document.getElementById("jsonStatus"),
  defenseScenarioName: document.getElementById("defenseScenarioName"),
  downloadDefenseJsonBtn: document.getElementById("downloadDefenseJsonBtn"),
  defenseJsonOutput: document.getElementById("defenseJsonOutput"),

  componentEditorModal: document.getElementById("componentEditorModal"),
  componentEditorTitle: document.getElementById("componentEditorTitle"),
  componentEditorInfo: document.getElementById("componentEditorInfo"),
  componentEditorCanvas: document.getElementById("componentEditorCanvas"),
  componentEditorSaveBtn: document.getElementById("componentEditorSaveBtn"),
  componentEditorResetBtn: document.getElementById("componentEditorResetBtn"),
  componentEditorCloseBtn: document.getElementById("componentEditorCloseBtn"),
  componentEditorCancelBtn: document.getElementById("componentEditorCancelBtn"),
  componentPanLeftBtn: document.getElementById("componentPanLeftBtn"),
  componentPanRightBtn: document.getElementById("componentPanRightBtn"),
  componentPanUpBtn: document.getElementById("componentPanUpBtn"),
  componentPanDownBtn: document.getElementById("componentPanDownBtn"),
  componentPanResetBtn: document.getElementById("componentPanResetBtn"),
  componentZoomOutBtn: document.getElementById("componentZoomOutBtn"),
  componentZoomInBtn: document.getElementById("componentZoomInBtn"),
  componentZoomResetBtn: document.getElementById("componentZoomResetBtn"),
  componentRadarX: document.getElementById("componentRadarX"),
  componentRadarY: document.getElementById("componentRadarY"),
  blindSectorTargetSelect: document.getElementById("blindSectorTargetSelect"),
  blindSectorAddBtn: document.getElementById("blindSectorAddBtn"),
  blindSectorList: document.getElementById("blindSectorList")
};

function buildDataUrl(path) {
  return new URL(path, DATA_ROOT_URL).toString();
}

function buildHssDataUrl(path) {
  return new URL(path, HSS_DATA_URL).toString();
}

function buildThreatDataUrl(path) {
  return new URL(path, THREAT_DATA_URL).toString();
}

const canvas = refs.defenseCanvas;
const ctx = canvas.getContext("2d");
const eirsCanvas = refs.eirsCanvas;
const eirsCtx = eirsCanvas.getContext("2d");
const deploymentCanvas = refs.deploymentCanvas;
const deploymentCtx = deploymentCanvas.getContext("2d");
const componentEditorCanvas = refs.componentEditorCanvas;
const componentEditorCtx = componentEditorCanvas.getContext("2d");
const hatchPattern = createHatchPattern(ctx);

init();

async function init() {
  resetPlanningStateIfRequested();
  clearLegacyPersistentStorage();
  bindEvents();
  loadPersistedRegionsState();
  loadPersistedEirsState();
  await loadDefenseData();
  applyImportedScenarioIfPresent();
  await preloadThreatCatalogs();
  onCoverageLayerChange();
  syncSharedDefendedAssetsStorage();
  setStatus("Adımları sırayla tamamlayın.", "info");
  setEirsStatus("Önce yeni bir EİRS ekleyin.", "info");
  setDeploymentStatus("Önce en az bir korunacak varlık veya EİRS kaydı oluşturun.", "warn");
  renderAll();
}

function bindEvents() {
  for (const button of refs.tabButtons) {
    button.addEventListener("click", () => requestTab(button.dataset.tabBtn));
  }

  refs.startRegionBtn.addEventListener("click", startDraft);
  refs.saveRegionBtn.addEventListener("click", saveDraft);
  refs.cancelDraftBtn.addEventListener("click", cancelDraft);
  refs.regionName.addEventListener("input", renderAreaGuide);
  refs.hvaValue.addEventListener("input", renderAreaGuide);
  refs.hvaValue.addEventListener("change", renderAreaGuide);
  for (const radio of refs.defenseTypeRadios) {
    radio.addEventListener("change", renderAreaGuide);
  }
  refs.defenseCanvas.addEventListener("click", onSharedCanvasClick);
  refs.startEirsBtn.addEventListener("click", startEirsDraft);
  refs.saveEirsBtn.addEventListener("click", saveEirsDraft);
  refs.cancelEirsDraftBtn.addEventListener("click", cancelEirsDraft);
  refs.eirsHvaValue.addEventListener("change", syncEirsActionButtons);
  refs.panLeftBtn.addEventListener("click", () => onSharedPan(PAN_STEP_PX, 0));
  refs.panRightBtn.addEventListener("click", () => onSharedPan(-PAN_STEP_PX, 0));
  refs.panUpBtn.addEventListener("click", () => onSharedPan(0, PAN_STEP_PX));
  refs.panDownBtn.addEventListener("click", () => onSharedPan(0, -PAN_STEP_PX));
  refs.panResetBtn.addEventListener("click", onSharedPanReset);

  refs.zoomInBtn.addEventListener("click", () => onSharedZoom(1.25));
  refs.zoomOutBtn.addEventListener("click", () => onSharedZoom(0.8));
  refs.zoomResetBtn.addEventListener("click", onSharedZoomReset);
  refs.defenseCanvas.addEventListener("wheel", onSharedCanvasWheel, { passive: false });

  refs.threatDirectionSelect.addEventListener("change", onThreatDirectionChange);
  refs.defendedRegionSelect.addEventListener("change", onDeploymentRegionChange);
  refs.downloadDefenseJsonBtn.addEventListener("click", exportDefenseScenario);
  refs.defenseScenarioName.addEventListener("input", syncDefenseJsonView);
  refs.layerRadarChk.addEventListener("change", onCoverageLayerChange);
  refs.layerWezChk.addEventListener("change", onCoverageLayerChange);
  refs.layerMinRangeChk.addEventListener("change", onCoverageLayerChange);
  refs.layerMaxRangeChk.addEventListener("change", onCoverageLayerChange);
  refs.deploymentAssignmentSaveBtn.addEventListener("click", saveDeploymentAssignmentFromModal);
  refs.deploymentAssignmentCancelBtn.addEventListener("click", closeDeploymentAssignmentModal);
  refs.deploymentAssignmentCloseBtn.addEventListener("click", closeDeploymentAssignmentModal);
  refs.deploymentAssignmentLoadoutRows.addEventListener("change", updateDeploymentAssignmentModalInfo);
  refs.deploymentAssignmentModal.addEventListener("click", (event) => {
    if (event.target === refs.deploymentAssignmentModal) {
      closeDeploymentAssignmentModal();
    }
  });

  refs.threatPlanningFrame?.addEventListener("load", () => {
    if (state.activeTab === "threat") {
      requestThreatSharedMapRender();
    }
  });

  refs.componentEditorSaveBtn.addEventListener("click", saveComponentEditorLayout);
  refs.componentEditorResetBtn.addEventListener("click", resetComponentEditorLayout);
  refs.componentEditorCloseBtn.addEventListener("click", closeComponentEditor);
  refs.componentEditorCancelBtn.addEventListener("click", closeComponentEditor);
  refs.componentPanLeftBtn.addEventListener("click", () => nudgeComponentEditorPan(COMPONENT_EDITOR_PAN_STEP_PX, 0));
  refs.componentPanRightBtn.addEventListener("click", () => nudgeComponentEditorPan(-COMPONENT_EDITOR_PAN_STEP_PX, 0));
  refs.componentPanUpBtn.addEventListener("click", () => nudgeComponentEditorPan(0, COMPONENT_EDITOR_PAN_STEP_PX));
  refs.componentPanDownBtn.addEventListener("click", () => nudgeComponentEditorPan(0, -COMPONENT_EDITOR_PAN_STEP_PX));
  refs.componentPanResetBtn.addEventListener("click", resetComponentEditorView);
  refs.componentZoomInBtn.addEventListener("click", () => changeComponentEditorZoom(1.2));
  refs.componentZoomOutBtn.addEventListener("click", () => changeComponentEditorZoom(0.84));
  refs.componentZoomResetBtn.addEventListener("click", resetComponentEditorView);
  refs.componentEditorModal.addEventListener("click", (event) => {
    if (event.target === refs.componentEditorModal) {
      closeComponentEditor();
    }
  });
  refs.componentEditorCanvas.addEventListener("mousedown", onComponentEditorMouseDown);
  refs.componentEditorCanvas.addEventListener("mousemove", onComponentEditorMouseMove);
  refs.componentEditorCanvas.addEventListener("wheel", onComponentEditorWheel, { passive: false });
  refs.componentRadarX.addEventListener("change", onRadarCoordinateInputChange);
  refs.componentRadarY.addEventListener("change", onRadarCoordinateInputChange);
  refs.blindSectorTargetSelect.addEventListener("change", onBlindSectorTargetChange);
  refs.blindSectorAddBtn.addEventListener("click", addBlindSectorRow);
  refs.blindSectorList.addEventListener("change", onBlindSectorListChange);
  refs.blindSectorList.addEventListener("click", onBlindSectorListClick);
  window.addEventListener("mouseup", onComponentEditorMouseUp);
}

function onSharedCanvasClick(event) {
  if (state.activeTab === "areas") {
    onCanvasClick(event);
  } else if (state.activeTab === "eirs") {
    onEirsCanvasClick(event);
  } else if (state.activeTab === "deployment") {
    onDeploymentCanvasClick(event);
  }
}

function onSharedCanvasWheel(event) {
  if (state.activeTab === "areas") {
    onCanvasWheel(event);
  } else if (state.activeTab === "eirs") {
    onEirsCanvasWheel(event);
  } else if (state.activeTab === "deployment") {
    onDeploymentCanvasWheel(event);
  }
}

function onSharedPan(dx, dy) {
  if (state.activeTab === "areas") {
    nudgePan(dx, dy);
  } else if (state.activeTab === "eirs") {
    nudgeEirsPan(dx, dy);
  } else if (state.activeTab === "deployment") {
    nudgeDeploymentPan(dx, dy);
  }
}

function onSharedPanReset() {
  if (state.activeTab === "areas") {
    resetPan();
  } else if (state.activeTab === "eirs") {
    resetEirsPan();
  } else if (state.activeTab === "deployment") {
    resetDeploymentPan();
  }
}

function onSharedZoom(multiplier) {
  if (state.activeTab === "areas") {
    changeZoom(multiplier);
  } else if (state.activeTab === "eirs") {
    changeEirsZoom(multiplier);
  } else if (state.activeTab === "deployment") {
    changeDeploymentZoom(multiplier);
  }
}

function onSharedZoomReset() {
  if (state.activeTab === "areas") {
    setZoom(DEFAULT_ZOOM);
  } else if (state.activeTab === "eirs") {
    setEirsZoom(DEFAULT_ZOOM);
  } else if (state.activeTab === "deployment") {
    setDeploymentZoom(1);
  }
}

function syncSharedMapForActiveTab() {
  const host = refs.sharedMapHosts[state.activeTab] || null;
  if (!host) {
    refs.sharedMapCard.hidden = true;
    refs.sharedMapStorage.appendChild(refs.sharedMapCard);
    return;
  }

  refs.sharedMapCard.hidden = false;
  if (refs.sharedMapCard.parentElement !== host) {
    host.appendChild(refs.sharedMapCard);
  }

  const config = getSharedMapPresentation(state.activeTab);
  refs.sharedMapTitle.textContent = config.title;
  refs.sharedMapHint.textContent = config.hint || "";
  refs.sharedMapHint.hidden = !config.hint;
  refs.sharedMapInfo.textContent = config.info || "";
  refs.sharedMapInfo.hidden = !config.info;
  refs.sharedLayerControls.hidden = !config.showLayers;
  refs.sharedLayerControls.style.display = config.showLayers ? "" : "none";
  refs.sharedThreatActions.hidden = !config.showThreatActions;
  refs.sharedThreatActions.style.display = config.showThreatActions ? "" : "none";
  if (refs.sharedThreatPointCard) {
    refs.sharedThreatPointCard.hidden = !config.showThreatPointTable;
    refs.sharedThreatPointCard.style.display = config.showThreatPointTable ? "" : "none";
  }
  if (refs.sharedThreatPayloadCard) {
    refs.sharedThreatPayloadCard.hidden = !config.showThreatPayloadTable;
    refs.sharedThreatPayloadCard.style.display = config.showThreatPayloadTable ? "" : "none";
  }
  if (refs.sharedThreatBallisticCard) {
    refs.sharedThreatBallisticCard.hidden = !config.showThreatBallisticTable;
    refs.sharedThreatBallisticCard.style.display = config.showThreatBallisticTable ? "" : "none";
  }
  refs.sharedMapCanvas.style.cursor = config.cursor || "crosshair";
}

function getSharedMapPresentation(tabName) {
  if (tabName === "eirs") {
    return {
      title: "Harekât Haritası",
      hint: "",
      info: "",
      showLayers: false,
      showThreatActions: false,
      cursor: "crosshair"
    };
  }

  if (tabName === "deployment") {
    return {
      title: "Konuşlanma ve Kaplama Önizleme",
      hint: "",
      info: "",
      showLayers: true,
      showThreatActions: false,
      cursor: "pointer"
    };
  }

  if (tabName === "threat") {
    return {
      title: "Harekât Haritası",
      hint: "",
      info: "",
      showLayers: false,
      showThreatActions: true,
      showThreatPointTable: false,
      showThreatPayloadTable: false,
      showThreatBallisticTable: false,
      cursor: "crosshair"
    };
  }

  return {
    title: "Harekât Haritası",
    hint: "",
    info: "",
    showLayers: false,
    showThreatActions: false,
    showThreatPointTable: false,
    cursor: "crosshair"
  };
}

function requestThreatSharedMapRender() {
  try {
    refs.threatPlanningFrame?.contentWindow?.requestSharedThreatMapRender?.();
    refs.threatPlanningFrame?.contentWindow?.requestThreatSharedLayoutSync?.();
  } catch (_err) {
    // Ignore iframe render bridge errors.
  }
}

async function loadDefenseData() {
  const systemsPromise = fetch(`${buildHssDataUrl("air_defense_systems.json")}?v=${Date.now()}`, { cache: "no-store" });
  const criteriaPromise = fetch(`${buildHssDataUrl("air_defense_deployment_criteria.json")}?v=${Date.now()}`, { cache: "no-store" });
  const munitionsPromise = fetch(`${buildHssDataUrl("air_defense_munitions.json")}?v=${Date.now()}`, { cache: "no-store" });

  const [systemsRes, criteriaRes, munitionsRes] = await Promise.allSettled([systemsPromise, criteriaPromise, munitionsPromise]);

  if (systemsRes.status === "fulfilled" && systemsRes.value.ok) {
    try {
      const json = await systemsRes.value.json();
      const systems = Array.isArray(json?.systems) ? json.systems : [];
      state.systemCatalogByCode = {};
      for (const item of systems) {
        const code = String(item?.code || "").trim();
        if (code) {
          state.systemCatalogByCode[code] = item;
        }
      }
      state.availableSystems = systems
        .map((s) => ({
          code: String(s.code || "").trim(),
          role: String(s.role || "").trim(),
          radarRangeKm: numberOrNull(s?.technical?.radar?.trackRange?.rangeKm),
          wezRangeKm: numberOrNull(s?.technical?.engagement?.effectiveRangeKm)
        }))
        .filter((s) => s.code);
    } catch (_err) {
      state.systemCatalogByCode = {};
      state.availableSystems = [...FALLBACK_SYSTEMS];
      setDeploymentStatus("HSS JSON okunamadı, varsayılan sistem listesi kullanılıyor.", "warn");
    }
  } else {
    state.systemCatalogByCode = {};
    state.availableSystems = [...FALLBACK_SYSTEMS];
    setDeploymentStatus("HSS JSON okunamadı, varsayılan sistem listesi kullanılıyor.", "warn");
  }

  if (criteriaRes.status === "fulfilled" && criteriaRes.value.ok) {
    try {
      const json = await criteriaRes.value.json();
      const criteria = Array.isArray(json?.deploymentCriteria) ? json.deploymentCriteria : [];
      state.criteriaByCode = {};

      for (const item of criteria) {
        const code = String(item.systemCode || "").trim();
        if (!code) {
          continue;
        }

        const distanceObj = item.distanceFromProtectedCenterKm || {};
        const narrative = distanceObj.narrative || {};
        const summary = distanceObj.summaryTable || {};

        const minKm =
          numberOrNull(distanceObj.min) ??
          numberOrNull(narrative.min) ??
          numberOrNull(summary.min);

        const maxKm =
          numberOrNull(distanceObj.max) ??
          numberOrNull(narrative.max) ??
          numberOrNull(summary.max);

        const pairConstraints = parsePairConstraints(item);

        state.criteriaByCode[code] = {
          recommendedCount: numberOrNull(item.minimumSuggestedSystemCount),
          centerMinKm: minKm,
          centerMaxKm: maxKm,
          pairConstraints
        };
      }
    } catch (_err) {
      setDeploymentStatus("Kriter JSON okunamadı, tavsiye değerleri gösterilemeyebilir.", "warn");
      state.criteriaByCode = {};
    }
  } else {
    state.criteriaByCode = {};
  }

  if (munitionsRes.status === "fulfilled" && munitionsRes.value.ok) {
    try {
      const json = await munitionsRes.value.json();
      const munitions = Array.isArray(json?.munitions) ? json.munitions : [];
      state.availableMunitions = munitions;
      state.munitionCatalogByCode = {};
      for (const item of munitions) {
        const code = String(item?.code || "").trim();
        if (code) {
          state.munitionCatalogByCode[code] = item;
        }
      }
    } catch (_err) {
      state.availableMunitions = [];
      state.munitionCatalogByCode = {};
      setDeploymentStatus("Mühimmat JSON okunamadı, export içeriği eksik olabilir.", "warn");
    }
  } else {
    state.availableMunitions = [];
    state.munitionCatalogByCode = {};
  }

  if (!state.availableSystems.length) {
    state.availableSystems = [...FALLBACK_SYSTEMS];
  }
}

async function preloadThreatCatalogs() {
  const results = await Promise.allSettled([
    fetch(`${buildThreatDataUrl("schema/scenario.schema.json")}?v=${Date.now()}`, { cache: "no-store" }),
    fetch(`${buildThreatDataUrl("platforms.json")}?v=${Date.now()}`, { cache: "no-store" }),
    fetch(`${buildThreatDataUrl("weapons.json")}?v=${Date.now()}`, { cache: "no-store" }),
    fetch(`${buildThreatDataUrl("ballistic.json")}?v=${Date.now()}`, { cache: "no-store" })
  ]);

  const [schemaRes, platformsRes, weaponsRes, ballisticsRes] = results;
  const warnings = [];

  const schema = await readThreatCatalogPart(
    schemaRes,
    "tehdit şeması",
    FALLBACK_THREAT_SCHEMA,
    (value) => value && typeof value === "object" && !Array.isArray(value)
  ).catch((message) => {
    warnings.push(message);
    return FALLBACK_THREAT_SCHEMA;
  });

  const platforms = await readThreatCatalogPart(
    platformsRes,
    "tehdit platformları",
    FALLBACK_THREAT_PLATFORMS,
    (value) => Array.isArray(value?.platforms)
  ).catch((message) => {
    warnings.push(message);
    return FALLBACK_THREAT_PLATFORMS;
  });

  const weapons = await readThreatCatalogPart(
    weaponsRes,
    "tehdit silahları",
    FALLBACK_THREAT_WEAPONS,
    (value) => Array.isArray(value?.weapons)
  ).catch((message) => {
    warnings.push(message);
    return FALLBACK_THREAT_WEAPONS;
  });

  const ballistics = await readThreatCatalogPart(
    ballisticsRes,
    "tehdit balistik katalogu",
    FALLBACK_THREAT_BALLISTICS,
    (value) => Array.isArray(value?.ballistics)
  ).catch((message) => {
    warnings.push(message);
    return FALLBACK_THREAT_BALLISTICS;
  });

  persistSharedThreatCatalogs({
    version: 1,
    generatedAt: new Date().toISOString(),
    schema,
    platforms: platforms?.platforms || [],
    weapons: weapons?.weapons || [],
    ballistics: ballistics?.ballistics || []
  });

  if (warnings.length > 0) {
    showMiniPopup(`Tehdit katalog preload uyarısı: ${warnings.join(" | ")}`, "warn");
  }
}

async function readThreatCatalogPart(result, label, fallbackValue, isValid) {
  if (result?.status !== "fulfilled") {
    throw `${label} okunamadi, fallback kullaniliyor.`;
  }
  if (!result.value?.ok) {
    throw `${label} HTTP ${result.value?.status || "hata"}, fallback kullaniliyor.`;
  }
  try {
    const json = await result.value.json();
    if (!isValid(json)) {
      throw new Error("beklenen formatta degil");
    }
    return json;
  } catch (_err) {
    if (fallbackValue) {
      throw `${label} parse edilemedi, fallback kullaniliyor.`;
    }
    throw `${label} parse edilemedi.`;
  }
}

function persistSharedThreatCatalogs(payload) {
  try {
    window.sessionStorage.setItem(SHARED_THREAT_CATALOGS_KEY, JSON.stringify(payload));
  } catch (_err) {
    // Ignore storage issues.
  }

  try {
    const base = readWindowNameState();
    base[WINDOW_NAME_THREAT_CATALOGS_KEY] = payload;
    window.name = JSON.stringify(base);
  } catch (_err) {
    // Ignore window.name write issues.
  }
}

function showMiniPopup(message, mode = "warn") {
  const popup = document.createElement("div");
  popup.textContent = String(message || "");
  popup.setAttribute("role", "alert");
  popup.style.position = "fixed";
  popup.style.right = "18px";
  popup.style.bottom = "18px";
  popup.style.zIndex = "9999";
  popup.style.maxWidth = "420px";
  popup.style.padding = "10px 12px";
  popup.style.border = mode === "warn" ? "1px solid #a96543" : "1px solid #2d7a5d";
  popup.style.background = mode === "warn" ? "rgba(36, 18, 12, 0.96)" : "rgba(10, 34, 24, 0.96)";
  popup.style.color = "#def6e7";
  popup.style.font = '700 12px "Space Grotesk", sans-serif';
  popup.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)";
  popup.style.borderRadius = "8px";
  popup.style.lineHeight = "1.4";
  document.body.appendChild(popup);
  window.setTimeout(() => {
    popup.style.transition = "opacity 180ms ease";
    popup.style.opacity = "0";
    window.setTimeout(() => popup.remove(), 220);
  }, 4200);
}

function requestTab(tabName) {
  closeDeploymentAssignmentModal();
  if (tabName === "deployment" && getAllProtectedAssets().length === 0) {
    setStatus("HSS konuşlandırmaya geçmek için önce en az bir korunacak varlık veya EİRS kaydı oluşturun.", "warn");
    setDeploymentStatus("HSS konuşlandırmaya geçmek için önce en az bir korunacak varlık veya EİRS kaydı oluşturulmalıdır.", "warn");
    return;
  }

  if (tabName === "threat" && state.deployments.length === 0) {
    setDeploymentStatus("Tehdit planlamaya geçmek için önce en az bir konuşlandırma planı kaydedin.", "warn");
    return;
  }

  state.activeTab = tabName;
  renderTabs();

  if (tabName === "deployment") {
    syncDeploymentViewFromMainMap();
    setDeploymentStatus("Korunacak varlığı seçin ve gerekli HSS planlarını popup ile ekleyin.", "info");
    renderDeploymentEditor();
    renderDeploymentList();
    renderDeploymentMap();
  } else if (tabName === "threat") {
    syncSharedDefendedAssetsStorage();
    requestThreatSharedMapRender();
  } else if (tabName === "json") {
    syncDefenseJsonView();
  } else {
    renderSharedMapForActiveTab();
  }
}

function renderTabs() {
  if (state.activeTab === "deployment" && getAllProtectedAssets().length === 0) {
    state.activeTab = "areas";
  }
  if (state.activeTab === "threat" && state.deployments.length === 0) {
    state.activeTab = getAllProtectedAssets().length > 0 ? "deployment" : "areas";
  }

  for (const btn of refs.tabButtons) {
    btn.classList.toggle("active", btn.dataset.tabBtn === state.activeTab);
  }

  for (const pane of refs.tabPanes) {
    pane.classList.toggle("active", pane.dataset.tabPane === state.activeTab);
  }

  refs.tabDeploymentBtn.disabled = getAllProtectedAssets().length === 0;
  refs.tabThreatBtn.disabled = state.deployments.length === 0;
  refs.tabJsonBtn.disabled = false;
  syncSharedMapForActiveTab();
}

function onCoverageLayerChange() {
  state.coverageLayers.radar = Boolean(refs.layerRadarChk.checked);
  state.coverageLayers.wez = Boolean(refs.layerWezChk.checked);
  state.coverageLayers.minCriteria = Boolean(refs.layerMinRangeChk.checked);
  state.coverageLayers.maxCriteria = Boolean(refs.layerMaxRangeChk.checked);
  state.deploymentView.selectedUnitKey = null;
  renderCanvas();
  renderDeploymentMap();
}

function onDeploymentCanvasWheel(event) {
  event.preventDefault();
  if (event.deltaY < 0) {
    changeDeploymentZoom(1.12);
  } else {
    changeDeploymentZoom(0.89);
  }
}

function changeDeploymentZoom(multiplier) {
  setDeploymentZoom(state.deploymentView.zoom * multiplier);
}

function setDeploymentZoom(nextZoom) {
  state.deploymentView.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom) || 1));
  renderDeploymentMap();
}

function nudgeDeploymentPan(dx, dy) {
  state.deploymentView.panX += dx;
  state.deploymentView.panY += dy;
  renderDeploymentMap();
}

function resetDeploymentPan() {
  state.deploymentView.panX = 0;
  state.deploymentView.panY = 0;
  renderDeploymentMap();
}

function onDeploymentCanvasClick(event) {
  const last = state.deploymentView.lastRender;
  if (!last || !last.unitScreens?.length) {
    return;
  }

  const screen = getCanvasScreenPoint(deploymentCanvas, event);
  const nearest = findNearestDeploymentUnit(screen.x, screen.y, last.unitScreens, 16);
  if (!nearest) {
    state.deploymentView.selectedUnitKey = null;
    renderDeploymentMap();
    return;
  }

  state.deploymentView.selectedUnitKey = nearest.key;
  renderDeploymentMap();
  openComponentEditor(nearest.unit);
}

function onCanvasWheel(event) {
  event.preventDefault();
  if (event.deltaY < 0) {
    changeZoom(1.12);
  } else {
    changeZoom(0.89);
  }
}

function changeZoom(multiplier) {
  setZoom(state.zoom * multiplier);
}

function setZoom(nextZoom) {
  state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom) || DEFAULT_ZOOM));
  renderCanvas();
}

function nudgePan(dx, dy) {
  state.panX += dx;
  state.panY += dy;
  renderCanvas();
}

function resetPan() {
  state.panX = 0;
  state.panY = 0;
  renderCanvas();
}

function pxToWorld(px) {
  return (px * MAP_SCALE_METERS_PER_PIXEL) / state.zoom;
}

function pxToWorldForZoom(px, zoom) {
  return (px * MAP_SCALE_METERS_PER_PIXEL) / zoom;
}

function screenToWorld(sx, sy) {
  return screenToWorldForView(canvas, state.panX, state.panY, state.zoom, sx, sy);
}

function screenToWorldForView(targetCanvas, panX, panY, zoom, sx, sy) {
  const cx = targetCanvas.width / 2;
  const cy = targetCanvas.height / 2;
  const tx = panX + cx;
  const ty = panY + cy;
  const scale = zoom / MAP_SCALE_METERS_PER_PIXEL;
  return {
    x: (sx - tx) / scale,
    y: (ty - sy) / scale
  };
}

function getCanvasPointForView(targetCanvas, panX, panY, zoom, event) {
  const rect = targetCanvas.getBoundingClientRect();
  const sx = (event.clientX - rect.left) * (targetCanvas.width / Math.max(1, rect.width));
  const sy = (event.clientY - rect.top) * (targetCanvas.height / Math.max(1, rect.height));
  const world = screenToWorldForView(targetCanvas, panX, panY, zoom, sx, sy);
  return {
    x: Math.round(world.x),
    y: Math.round(world.y)
  };
}

function applyViewTransformToContext(targetCtx, targetCanvas, panX, panY, zoom) {
  const cx = targetCanvas.width / 2;
  const cy = targetCanvas.height / 2;
  const tx = panX + cx;
  const ty = panY + cy;
  const scale = zoom / MAP_SCALE_METERS_PER_PIXEL;
  targetCtx.setTransform(scale, 0, 0, -scale, tx, ty);
}

function applyViewTransform() {
  applyViewTransformToContext(ctx, canvas, state.panX, state.panY, state.zoom);
}

function getVisibleWorldBounds() {
  return getVisibleWorldBoundsForView(canvas, state.panX, state.panY, state.zoom);
}

function getVisibleWorldBoundsForView(targetCanvas, panX, panY, zoom) {
  const a = screenToWorldForView(targetCanvas, panX, panY, zoom, 0, targetCanvas.height);
  const b = screenToWorldForView(targetCanvas, panX, panY, zoom, targetCanvas.width, 0);
  return {
    xMin: Math.min(a.x, b.x),
    xMax: Math.max(a.x, b.x),
    yMin: Math.min(a.y, b.y),
    yMax: Math.max(a.y, b.y)
  };
}

function getSelectedDefenseType() {
  const selected = refs.defenseTypeRadios.find((r) => r.checked);
  return selected ? selected.value : "point";
}

function startDraft() {
  if (state.draft) {
    setStatus("Aktif bir taslak var. Yeni tanım için önce kaydedin veya iptal edin.", "warn");
    return;
  }

  const name = refs.regionName.value.trim();
  if (!name) {
    setStatus("Lütfen Korunulacak Varlık ID girin.", "warn");
    return;
  }
  const hvaValue = Math.floor(Number(refs.hvaValue.value));
  if (!Number.isFinite(hvaValue) || hvaValue < 1 || hvaValue > 10) {
    setStatus("Lütfen 1 ile 10 arasında bir HVA değeri girin.", "warn");
    return;
  }

  const type = getSelectedDefenseType();
  state.draft = {
    id: `DRAFT_${Date.now()}`,
    name,
    type,
    hvaValue,
    points: []
  };

  refs.regionName.value = "";
  refs.hvaValue.value = "";
  state.highlightedRegionId = state.draft.id;

  const msg =
    type === "point"
      ? `"${name}" için nokta savunması başladı. Haritadan 1 nokta seçin.`
      : `"${name}" için bölge savunması başladı. Haritadan en az 3 nokta seçin.`;

  setStatus(msg, "info");
  renderAll();
}

function cancelDraft() {
  if (!state.draft) {
    return;
  }
  state.draft = null;
  state.highlightedRegionId = null;
  setStatus("Taslak iptal edildi. Yeni korunacak varlık ekleyebilirsiniz.", "info");
  renderAll();
}

function saveDraft() {
  if (!state.draft) {
    setStatus("Kaydedilecek aktif taslak yok.", "warn");
    return;
  }

  if (!isDraftValid(state.draft)) {
    setStatus(getDraftValidationMessage(state.draft), "warn");
    return;
  }

  const region = {
    id: `R${String(state.regionCounter).padStart(3, "0")}`,
    name: state.draft.name,
    type: state.draft.type,
    hvaValue: state.draft.hvaValue,
    points: state.draft.points.map((p) => ({ ...p }))
  };

  state.regionCounter += 1;
  state.savedRegions.push(region);
  persistRegionsState();
  syncSharedDefendedAssetsStorage();
  state.highlightedRegionId = region.id;
  state.draft = null;

  setStatus(`"${region.name}" kaydedildi. Yeni korunacak varlık tanımlayabilirsiniz.`, "info");
  renderAll();
}

function onCanvasClick(event) {
  if (!state.draft) {
    setStatus("Önce yeni bir korunacak varlık taslağı başlatın.", "warn");
    return;
  }

  const point = getCanvasPoint(event);
  if (!point) {
    return;
  }

  if (state.draft.type === "point") {
    state.draft.points = [point];
  } else {
    state.draft.points.push(point);
  }

  const base = getDraftValidationMessage(state.draft);
  setStatus(`${base} Son nokta: (${Math.round(point.x)}, ${Math.round(point.y)})`, "info");
  renderAll();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
  const sy = (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
  const world = screenToWorld(sx, sy);
  return {
    x: Math.round(world.x),
    y: Math.round(world.y)
  };
}

function setStatus(message, mode) {
  state.areaStatusMessage = String(message || "").trim();
  state.areaStatusMode = mode === "warn" ? "warn" : "info";
  renderAreaGuide();
}

function renderAreaGuide() {
  const draft = state.draft;
  const hasSavedRegion = state.savedRegions.length > 0;
  const inputName = String(refs.regionName.value || "").trim();
  const inputHva = Math.floor(Number(refs.hvaValue.value));
  const hasInputName = Boolean(inputName);
  const hasInputHva = Number.isFinite(inputHva) && inputHva >= 1 && inputHva <= 10;
  const pointCount = Array.isArray(draft?.points) ? draft.points.length : 0;
  const coordinatesReady = draft ? isDraftValid(draft) : false;
  const completedFlow = !draft && !hasInputName && !hasInputHva && hasSavedRegion;

  const guideItems = [
    {
      label: "Korunulacak Varlık ID girin.",
      done: completedFlow || Boolean(draft?.name) || hasInputName
    },
    {
      label: "HVA değeri girin ve savunma tipini seçin.",
      done: completedFlow || Number.isFinite(draft?.hvaValue) || hasInputHva
    },
    {
      label: "Yeni varlık taslağını başlatın.",
      done: completedFlow || Boolean(draft)
    },
    {
      label:
        draft?.type === "area"
          ? "Haritadan en az 3 koordinat seçin."
          : "Haritadan 1 koordinat seçin.",
      done: completedFlow || coordinatesReady
    },
    {
      label: "Taslağı kaydedin.",
      done: completedFlow || (!draft && hasSavedRegion)
    }
  ];

  const noteParts = [];
  if (draft) {
    noteParts.push(
      draft.type === "area"
        ? `Taslak koordinatı: ${pointCount}/3+`
        : `Taslak koordinatı: ${pointCount}/1`
    );
  } else if (hasSavedRegion) {
    noteParts.push(`Kayıtlı korunacak varlık: ${state.savedRegions.length}`);
  }
  if (state.areaStatusMessage) {
    noteParts.push(state.areaStatusMessage);
  }

  refs.status.className = state.areaStatusMode === "warn" ? "status warn" : "status";
  refs.status.innerHTML = `
    <ul class="guide-list">
      ${guideItems
        .map(
          (item) =>
            `<li class="guide-item${item.done ? " done" : ""}">${item.done ? "[Tamam]" : "[Bekliyor]"} ${escapeHtml(
              item.label
            )}</li>`
        )
        .join("")}
    </ul>
    <div class="guide-note${state.areaStatusMode === "warn" ? " warn" : ""}">${escapeHtml(noteParts.join(" "))}</div>
  `;
}

function setDeploymentStatus(message, mode) {
  refs.deploymentStatus.textContent = message;
  refs.deploymentStatus.className = mode === "warn" ? "status warn" : "status";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isDraftValid(draft) {
  if (!draft) {
    return false;
  }
  if (draft.type === "point") {
    return draft.points.length === 1;
  }
  return draft.points.length >= 3;
}

function getDraftValidationMessage(draft) {
  if (!draft) {
    return "Korunacak varlık oluşturmak için adımları sırayla tamamlayın.";
  }

  if (draft.type === "point") {
    return draft.points.length === 1
      ? "Nokta seçimi tamam. Kaydedebilirsiniz."
      : "Nokta savunması için 1 nokta seçin.";
  }

  if (draft.points.length < 3) {
    return `Bölge savunması için en az 3 nokta gerekli. Mevcut: ${draft.points.length}`;
  }

  return `Bölge seçiminde ${draft.points.length} nokta var. Kaydedebilirsiniz.`;
}

function renderAll() {
  renderAreaGuide();
  renderTabs();
  renderCanvas();
  renderEirsCanvas();
  renderDraftTable();
  renderEirsDraftTable();
  renderSavedList();
  renderEirsSavedList();
  syncAreaActionButtons();
  syncEirsActionButtons();
  renderDeploymentEditor();
  renderDeploymentList();
  renderDeploymentMap();
  syncDefenseJsonView();
}

function renderSharedMapForActiveTab() {
  if (state.activeTab === "areas") {
    renderCanvas();
  } else if (state.activeTab === "eirs") {
    renderEirsCanvas();
  } else if (state.activeTab === "deployment") {
    renderDeploymentMap();
  } else if (state.activeTab === "threat") {
    requestThreatSharedMapRender();
  }
}

function syncAreaActionButtons() {
  const hasDraft = Boolean(state.draft);
  refs.saveRegionBtn.disabled = !hasDraft || !isDraftValid(state.draft);
  refs.cancelDraftBtn.disabled = !hasDraft;
}

function renderSavedList() {
  refs.savedList.innerHTML = "";

  if (state.savedRegions.length === 0) {
    refs.savedEmpty.style.display = "block";
    return;
  }

  refs.savedEmpty.style.display = "none";

  for (const region of state.savedRegions) {
    const item = document.createElement("div");
    item.className = "saved-item";

    const info = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${region.id} - ${region.name}`;

    const small = document.createElement("small");
    const typeText = region.type === "point" ? "Nokta Savunması" : "Bölge Savunması";
    small.textContent = `${typeText} | Nokta Sayısı: ${region.points.length} | HVA: ${Math.round(numberOrZero(region.hvaValue))}`;

    info.append(strong, small);

    const actions = document.createElement("div");
    actions.className = "saved-actions";

    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = "ghost";
    focusBtn.textContent = "Odakla";
    focusBtn.addEventListener("click", () => {
      state.highlightedRegionId = region.id;
      focusRegionOnMainMap(region);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "warn";
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => {
      removeSavedRegion(region.id);
    });

    actions.append(focusBtn, deleteBtn);
    item.append(info, actions);
    refs.savedList.append(item);
  }
}

function renderEirsSavedList() {
  refs.eirsSavedList.innerHTML = "";

  if (state.savedEirs.length === 0) {
    refs.eirsSavedEmpty.style.display = "block";
    return;
  }

  refs.eirsSavedEmpty.style.display = "none";

  for (const radar of state.savedEirs) {
    const item = document.createElement("div");
    item.className = "saved-item";

    const info = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${radar.id} - ${radar.name}`;

    const small = document.createElement("small");
    small.textContent = `EİRS | HVA: ${Math.round(numberOrZero(radar.hvaValue))} | Koord: (${Math.round(
      radar.points[0]?.x || 0
    )}, ${Math.round(radar.points[0]?.y || 0)})`;

    info.append(strong, small);

    const actions = document.createElement("div");
    actions.className = "saved-actions";

    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = "ghost";
    focusBtn.textContent = "Odakla";
    focusBtn.addEventListener("click", () => {
      state.highlightedRegionId = radar.id;
      focusEirsOnMap(radar);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "warn";
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => {
      removeSavedEirs(radar.id);
    });

    actions.append(focusBtn, deleteBtn);
    item.append(info, actions);
    refs.eirsSavedList.append(item);
  }
}

function syncEirsActionButtons() {
  refs.saveEirsBtn.disabled = !state.eirsDraft || !isEirsDraftValid(state.eirsDraft);
  refs.cancelEirsDraftBtn.disabled = !state.eirsDraft;
}

function startEirsDraft() {
  if (state.eirsDraft) {
    setEirsStatus("Aktif bir EİRS taslağı var. Önce kaydedin veya iptal edin.", "warn");
    return;
  }

  const name = String(refs.eirsName.value || "").trim();
  if (!name) {
    setEirsStatus("Lütfen EİRS ID girin.", "warn");
    return;
  }

  const hvaValue = Math.floor(Number(refs.eirsHvaValue.value));
  if (!Number.isFinite(hvaValue) || hvaValue < 1 || hvaValue > 10) {
    setEirsStatus("Lütfen 1 ile 10 arasında bir HVA değeri girin.", "warn");
    return;
  }

  state.eirsDraft = {
    id: `EIRS_DRAFT_${Date.now()}`,
    name,
    type: "point",
    hvaValue,
    points: []
  };
  refs.eirsName.value = "";
  refs.eirsHvaValue.value = "";
  state.highlightedRegionId = state.eirsDraft.id;
  setEirsStatus(`"${name}" için EİRS taslağı başladı. Haritadan 1 nokta seçin.`, "info");
  renderAll();
}

function cancelEirsDraft() {
  if (!state.eirsDraft) {
    return;
  }
  state.eirsDraft = null;
  setEirsStatus("EİRS taslağı iptal edildi.", "info");
  renderAll();
}

function saveEirsDraft() {
  if (!state.eirsDraft) {
    setEirsStatus("Kaydedilecek aktif EİRS taslağı yok.", "warn");
    return;
  }

  if (!isEirsDraftValid(state.eirsDraft)) {
    setEirsStatus("EİRS için haritadan 1 nokta seçin.", "warn");
    return;
  }

  const radar = {
    id: `E${String(state.eirsCounter).padStart(3, "0")}`,
    name: state.eirsDraft.name,
    type: "point",
    hvaValue: state.eirsDraft.hvaValue,
    points: state.eirsDraft.points.map((point) => ({ ...point }))
  };

  state.eirsCounter += 1;
  state.savedEirs.push(radar);
  persistEirsState();
  syncSharedDefendedAssetsStorage();
  state.eirsDraft = null;
  state.highlightedRegionId = radar.id;
  setEirsStatus(`"${radar.name}" EİRS kaydedildi.`, "info");
  renderAll();
}

function isEirsDraftValid(draft) {
  return Boolean(draft && Array.isArray(draft.points) && draft.points.length === 1);
}

function onEirsCanvasClick(event) {
  if (!state.eirsDraft) {
    setEirsStatus("Önce yeni bir EİRS taslağı başlatın.", "warn");
    return;
  }
  const point = getCanvasPointForView(eirsCanvas, state.eirsPanX, state.eirsPanY, state.eirsZoom, event);
  if (!point) {
    return;
  }
  state.eirsDraft.points = [point];
  setEirsStatus(`EİRS noktası seçildi: (${Math.round(point.x)}, ${Math.round(point.y)})`, "info");
  renderAll();
}

function renderEirsDraftTable() {
  refs.eirsCoordTableBody.innerHTML = "";
  if (!state.eirsDraft?.points?.length) {
    refs.eirsCoordEmpty.style.display = "block";
    return;
  }
  refs.eirsCoordEmpty.style.display = "none";
  const point = state.eirsDraft.points[0];
  const tr = document.createElement("tr");
  const indexCell = document.createElement("td");
  indexCell.textContent = "1";

  const xCell = document.createElement("td");
  const xInput = document.createElement("input");
  xInput.type = "text";
  xInput.inputMode = "numeric";
  xInput.value = String(Math.round(numberOrZero(point.x)));
  xInput.addEventListener("change", () => {
    updateEirsDraftPoint("x", xInput.value);
  });
  xInput.addEventListener("blur", () => {
    updateEirsDraftPoint("x", xInput.value);
  });
  xCell.append(xInput);

  const yCell = document.createElement("td");
  const yInput = document.createElement("input");
  yInput.type = "text";
  yInput.inputMode = "numeric";
  yInput.value = String(Math.round(numberOrZero(point.y)));
  yInput.addEventListener("change", () => {
    updateEirsDraftPoint("y", yInput.value);
  });
  yInput.addEventListener("blur", () => {
    updateEirsDraftPoint("y", yInput.value);
  });
  yCell.append(yInput);

  const actionCell = document.createElement("td");
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "table-actions warn";
  clearBtn.textContent = "Sil";
  clearBtn.addEventListener("click", () => {
    clearEirsDraftPoint();
  });
  actionCell.append(clearBtn);

  tr.append(indexCell, xCell, yCell, actionCell);
  refs.eirsCoordTableBody.append(tr);
}

function updateEirsDraftPoint(axis, rawValue) {
  if (!state.eirsDraft?.points?.length) {
    return;
  }

  const normalized = String(rawValue ?? "").trim().replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return;
  }

  state.eirsDraft.points[0][axis] = Math.round(num);
  syncEirsActionButtons();
  setEirsStatus(
    `EİRS koordinatı güncellendi: (${Math.round(numberOrZero(state.eirsDraft.points[0].x))}, ${Math.round(
      numberOrZero(state.eirsDraft.points[0].y)
    )})`,
    "info"
  );
  renderEirsCanvas();
}

function clearEirsDraftPoint() {
  if (!state.eirsDraft) {
    return;
  }

  state.eirsDraft.points = [];
  syncEirsActionButtons();
  setEirsStatus("EİRS noktası temizlendi.", "info");
  renderEirsCanvas();
  renderEirsDraftTable();
}

function removeSavedEirs(eirsId) {
  const removedPlanIds = state.deployments.filter((plan) => plan.regionId === eirsId).map((plan) => plan.id);
  state.savedEirs = state.savedEirs.filter((item) => item.id !== eirsId);
  state.deployments = state.deployments.filter((plan) => plan.regionId !== eirsId);
  state.visibleDeploymentPlanIds = state.visibleDeploymentPlanIds.filter((id) => !removedPlanIds.includes(id));
  purgeComponentLayoutsByPlanIds(removedPlanIds);
  delete state.deploymentDraftByRegion[eirsId];
  if (state.selectedDeploymentRegionId === eirsId) {
    state.selectedDeploymentRegionId = "";
  }
  persistEirsState();
  syncSharedDefendedAssetsStorage();
  setEirsStatus("EİRS kaydı silindi.", "info");
  renderAll();
}

function loadPersistedEirsState() {
  try {
    const raw = window.sessionStorage.getItem(EIRS_STATE_KEY);
    if (!raw) {
      state.savedEirs = [];
      state.eirsCounter = 1;
      return;
    }
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.eirs) ? parsed.eirs : [];
    state.savedEirs = items.map(normalizePersistedRegion).filter(Boolean);
    state.eirsCounter = getNextRegionCounter(state.savedEirs, "E");
  } catch (_err) {
    state.savedEirs = [];
    state.eirsCounter = 1;
  }
}

function persistEirsState() {
  try {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      eirs: state.savedEirs.map((item) => ({
        id: item.id,
        name: item.name,
        type: "point",
        hvaValue: item.hvaValue,
        points: item.points.map((point) => ({ x: point.x, y: point.y }))
      }))
    };
    window.sessionStorage.setItem(EIRS_STATE_KEY, JSON.stringify(payload));
  } catch (_err) {
    // Ignore EIRS persistence issues.
  }
}

function removeSavedRegion(regionId) {
  const removedPlanIds = state.deployments.filter((p) => p.regionId === regionId).map((p) => p.id);
  state.savedRegions = state.savedRegions.filter((r) => r.id !== regionId);
  state.deployments = state.deployments.filter((p) => p.regionId !== regionId);
  state.visibleDeploymentPlanIds = state.visibleDeploymentPlanIds.filter((id) => !removedPlanIds.includes(id));
  purgeComponentLayoutsByPlanIds(removedPlanIds);
  delete state.deploymentDraftByRegion[regionId];
  if (state.highlightedRegionId === regionId) {
    state.highlightedRegionId = null;
  }

  if (state.selectedDeploymentRegionId === regionId) {
    state.selectedDeploymentRegionId = "";
  }

  if (getAllProtectedAssets().length === 0 && state.activeTab === "deployment") {
    state.activeTab = "areas";
  }

  if (state.componentEditor.open && removedPlanIds.includes(state.componentEditor.planId)) {
    closeComponentEditor();
  }

  persistRegionsState();
  syncSharedDefendedAssetsStorage();
  setStatus("Tesis/bölge kaydı silindi.", "info");
  renderAll();
}

function loadPersistedRegionsState() {
  try {
    const raw = window.sessionStorage.getItem(DEFENSE_REGIONS_STATE_KEY);
    if (!raw) {
      state.savedRegions = [];
      state.regionCounter = 1;
      return;
    }

    const parsed = JSON.parse(raw);
    const regions = Array.isArray(parsed?.regions) ? parsed.regions : [];
    state.savedRegions = regions
      .map(normalizePersistedRegion)
      .filter(Boolean);
    state.regionCounter = getNextRegionCounter(state.savedRegions);
  } catch (_err) {
    state.savedRegions = [];
    state.regionCounter = 1;
  }
}

function persistRegionsState() {
  try {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      regions: state.savedRegions.map((region) => ({
        id: region.id,
        name: region.name,
        type: region.type,
        hvaValue: Math.max(1, Math.min(10, Math.round(numberOrZero(region.hvaValue) || 1))),
        points: Array.isArray(region.points)
          ? region.points.map((point) => ({
              x: Math.round(numberOrZero(point.x)),
              y: Math.round(numberOrZero(point.y))
            }))
          : []
      }))
    };
    window.sessionStorage.setItem(DEFENSE_REGIONS_STATE_KEY, JSON.stringify(payload));
  } catch (_err) {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function normalizePersistedRegion(region) {
  const id = String(region?.id || "").trim();
  const name = String(region?.name || "").trim();
  const type = region?.type === "area" ? "area" : "point";
  const points = Array.isArray(region?.points)
    ? region.points
        .map((point) => ({
          x: Math.round(numberOrZero(point?.x)),
          y: Math.round(numberOrZero(point?.y))
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];

  if (!id || !name || points.length === 0) {
    return null;
  }

  return {
    id,
    name,
    type,
    hvaValue: Math.max(1, Math.min(10, Math.round(numberOrZero(region?.hvaValue) || 1))),
    points
  };
}

function getNextRegionCounter(regions, prefix = "R") {
  let maxCounter = 0;
  for (const region of regions) {
    const match = new RegExp(`^${String(prefix)}(\\d+)$`, "i").exec(String(region?.id || "").trim());
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > maxCounter) {
      maxCounter = value;
    }
  }
  return maxCounter + 1;
}

function getAllProtectedAssets() {
  return [...state.savedRegions, ...state.savedEirs];
}

function syncSharedDefendedAssetsStorage() {
  const payload = buildSharedDefendedAssetsPayload();

  try {
    window.sessionStorage.setItem(SHARED_DEFENDED_ASSETS_KEY, JSON.stringify(payload));
  } catch (_err) {
    // Storage may be unavailable in restricted browser contexts.
  }
  writeSharedAssetsToWindowName(payload);
}

function buildSharedDefendedAssetsPayload() {
  const assets = getAllProtectedAssets().map((region) => {
    const center = computeRegionCenter(region);
    return {
      id: region.id,
      name: region.name,
      type: region.type,
      HVA_value: Math.max(1, Math.min(10, Math.round(numberOrZero(region.hvaValue) || 1))),
      center: {
        x: Math.round(numberOrZero(center.x)),
        y: Math.round(numberOrZero(center.y))
      },
      points: region.points.map((point) => ({
        x: Math.round(numberOrZero(point.x)),
        y: Math.round(numberOrZero(point.y))
      }))
    };
  });

  for (const plan of state.deployments) {
    const preview = buildDeploymentPreviewByPlanId(plan.id);
    if (!preview) {
      continue;
    }

    for (const unit of preview.units) {
      const assignmentToken = sanitizeSystemCode(unit.assignmentId || unit.munitionCode || "ASSIGN");
      const radarCenter = {
        x: Math.round(numberOrZero(unit.components?.radar?.x)),
        y: Math.round(numberOrZero(unit.components?.radar?.y))
      };
      assets.push({
        id: `${unit.planId}_${sanitizeSystemCode(unit.code)}_${assignmentToken}${String(unit.sequence).padStart(2, "0")}_RADAR`,
        name: `${unit.regionName} | ${getDeploymentUnitLabel(unit)} Radar`,
        type: "point",
        HVA_value: Math.max(1, Math.min(10, Math.round(numberOrZero(unit.componentSpec?.radarHVAValue) || 1))),
        center: radarCenter,
        points: [radarCenter]
      });

      const unitFfsLoadout = Array.isArray(unit?.ffsLoadout) ? unit.ffsLoadout : [];
      const unitFfsComponents = Array.isArray(unit?.components?.ffs) ? unit.components.ffs : [];
      unitFfsComponents.forEach((ffs, index) => {
        const ffsCenter = {
          x: Math.round(numberOrZero(ffs?.x)),
          y: Math.round(numberOrZero(ffs?.y))
        };
        const loadoutRow = unitFfsLoadout[index] || {};
        const munitionLabel = String(loadoutRow?.munitionCode || "").trim()
          ? ` (${getMunitionShortLabel(loadoutRow.munitionCode)})`
          : "";
        assets.push({
          id: `${unit.planId}_${sanitizeSystemCode(unit.code)}_${assignmentToken}${String(unit.sequence).padStart(2, "0")}_FFS${index + 1}`,
          name: `${unit.regionName} | ${getDeploymentUnitLabel(unit)} FFS-${index + 1}${munitionLabel}`,
          type: "point",
          HVA_value: 1,
          center: ffsCenter,
          points: [ffsCenter]
        });
      });
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    assets
  };
}

function writeSharedAssetsToWindowName(payload) {
  try {
    const base = readWindowNameState();
    base[WINDOW_NAME_SHARED_STATE_KEY] = payload;
    window.name = JSON.stringify(base);
  } catch (_err) {
    // Ignore window.name write issues.
  }
}

function readWindowNameState() {
  try {
    if (!window.name) {
      return {};
    }
    const parsed = JSON.parse(window.name);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function resetPlanningStateIfRequested() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(FRESH_SESSION_PARAM) !== "1") {
      return;
    }
    window.sessionStorage.removeItem(DEFENSE_REGIONS_STATE_KEY);
    window.sessionStorage.removeItem(EIRS_STATE_KEY);
    window.sessionStorage.removeItem(SHARED_DEFENDED_ASSETS_KEY);
    window.sessionStorage.removeItem(SHARED_THREAT_CATALOGS_KEY);
    window.sessionStorage.removeItem(EDIT_SCENARIO_IMPORT_KEY);
    window.sessionStorage.removeItem(EDIT_THREAT_IMPORT_KEY);
    const base = readWindowNameState();
    delete base[WINDOW_NAME_SHARED_STATE_KEY];
    delete base[WINDOW_NAME_THREAT_CATALOGS_KEY];
    window.name = JSON.stringify(base);
    url.searchParams.delete(FRESH_SESSION_PARAM);
    window.history.replaceState({}, document.title, url.toString());
  } catch (_err) {
    // Ignore reset issues and continue with a clean in-memory state.
  }
}

function clearLegacyPersistentStorage() {
  try {
    window.localStorage.removeItem(DEFENSE_REGIONS_STATE_KEY);
    window.localStorage.removeItem(EIRS_STATE_KEY);
    window.localStorage.removeItem(SHARED_DEFENDED_ASSETS_KEY);
    window.localStorage.removeItem(SHARED_THREAT_CATALOGS_KEY);
  } catch (_err) {
    // Ignore storage cleanup issues.
  }
}

function applyImportedScenarioIfPresent() {
  let parsed;
  try {
    const raw = window.sessionStorage.getItem(EDIT_SCENARIO_IMPORT_KEY);
    if (!raw) {
      return;
    }
    parsed = JSON.parse(raw);
  } catch (_err) {
    return;
  }

  if (!parsed || typeof parsed !== "object") {
    return;
  }

  const importedAssets = Array.isArray(parsed.protectedAssets) ? parsed.protectedAssets : [];
  const importedPlans = Array.isArray(parsed.deploymentPlans) ? parsed.deploymentPlans : [];
  const importedUnits = Array.isArray(parsed.deployedUnits) ? parsed.deployedUnits : [];
  const importedScenarioThreatDirection = normalizeThreatDirection(
    parsed.scenarioThreatDirection ||
    importedPlans[0]?.threatDirection ||
    "none"
  );
  const importedThreatScenario =
    parsed.threatScenario && typeof parsed.threatScenario === "object" && !Array.isArray(parsed.threatScenario)
      ? parsed.threatScenario
      : null;

  state.savedRegions = [];
  state.savedEirs = [];
  state.deployments = [];
  state.visibleDeploymentPlanIds = [];
  state.deploymentDraftByRegion = {};
  state.componentLayoutsByUnitKey = {};
  state.selectedDeploymentRegionId = "";
  state.highlightedRegionId = null;
  state.scenarioThreatDirection = importedScenarioThreatDirection;

  for (const asset of importedAssets) {
    const normalized = normalizeImportedProtectedAsset(asset);
    if (!normalized) {
      continue;
    }
    if (normalized.id.startsWith("E")) {
      state.savedEirs.push(normalized);
    } else {
      state.savedRegions.push(normalized);
    }
  }

  state.regionCounter = getNextRegionCounter(state.savedRegions, "R");
  state.eirsCounter = getNextRegionCounter(state.savedEirs, "E");

  state.deployments = importedPlans
    .map((plan) => normalizeImportedDeploymentPlan(plan))
    .filter(Boolean);
  state.deployments.forEach((plan) => {
    plan.threatDirection = importedScenarioThreatDirection;
  });
  state.visibleDeploymentPlanIds = state.deployments.map((plan) => plan.id);
  state.deploymentCounter = getNextDeploymentCounter(state.deployments);
  state.deploymentAssignmentCounter = getNextDeploymentAssignmentCounter(state.deployments);

  for (const unit of importedUnits) {
    const normalized = normalizeImportedUnitLayout(unit);
    if (!normalized) {
      continue;
    }
    state.componentLayoutsByUnitKey[normalized.unitKey] = normalized.layout;
  }

  const firstAsset = getAllProtectedAssets()[0] || null;
  state.selectedDeploymentRegionId = firstAsset?.id || "";
  state.highlightedRegionId = firstAsset?.id || null;
  refs.defenseScenarioName.value = String(parsed.scenarioName || "Birlesik Senaryo").trim() || "Birlesik Senaryo";

  try {
    if (importedThreatScenario) {
      window.sessionStorage.setItem(EDIT_THREAT_IMPORT_KEY, JSON.stringify(importedThreatScenario));
    } else {
      window.sessionStorage.removeItem(EDIT_THREAT_IMPORT_KEY);
    }
  } catch (_err) {
    // Ignore threat import persistence issues.
  }

  persistRegionsState();
  persistEirsState();
  try {
    window.sessionStorage.removeItem(EDIT_SCENARIO_IMPORT_KEY);
  } catch (_err) {
    // Ignore cleanup issues.
  }
}

function normalizeImportedProtectedAsset(asset) {
  const id = String(asset?.id || "").trim();
  const name = String(asset?.name || id).trim();
  const geometryType = String(asset?.geometry?.type || "").trim().toLowerCase();
  const defenseType = String(asset?.defenseType || "").trim().toLowerCase();
  const hvaValue = Math.max(1, Math.min(10, Math.round(numberOrZero(asset?.HVA_value) || 1)));

  let type = defenseType === "area" || geometryType === "polygon" ? "area" : "point";
  let points = [];

  if (type === "point") {
    const coords = asset?.geometry?.coordinates;
    const x = Math.round(numberOrZero(coords?.x));
    const y = Math.round(numberOrZero(coords?.y));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points = [{ x, y }];
    }
  } else {
    const coords = Array.isArray(asset?.geometry?.coordinates) ? asset.geometry.coordinates : [];
    points = coords
      .map((point) => ({
        x: Math.round(numberOrZero(point?.x)),
        y: Math.round(numberOrZero(point?.y))
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  if (!id || !name || points.length === 0) {
    return null;
  }

  return { id, name, type, hvaValue, points };
}

function normalizeImportedDeploymentPlan(plan) {
  const id = String(plan?.id || "").trim();
  const regionId = String(plan?.protectedAssetId || "").trim();
  const region = getAllProtectedAssets().find((item) => item.id === regionId);
  const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
  const systems = assignments
    .map((item, index) => {
      const code = String(item?.systemCode || "").trim();
      if (!code || !state.systemCatalogByCode[code]) {
        return null;
      }
      const count = Math.max(0, Math.floor(Number(item?.count) || 0));
      const ffsCountPerUnit = Math.max(1, Math.floor(Number(item?.ffsCountPerUnit) || getSystemComponentSpec(code).ffsCount || 1));
      const assignmentSeed = {
        munitionCode: String(item?.munitionCode || getPreferredMunitionCode(code) || "").trim(),
        ffsMunitionCodes: Array.isArray(item?.ffsMunitionCodes) ? item.ffsMunitionCodes : [],
        ffsLoadout: Array.isArray(item?.ffsLoadout) ? item.ffsLoadout : [],
        ffsCountPerUnit
      };
      return {
        id: String(item?.id || `ASG${String(index + 1).padStart(4, "0")}`).trim(),
        code,
        munitionCode: assignmentSeed.munitionCode,
        ffsLoadout: getAssignmentFfsLoadout(code, assignmentSeed, ffsCountPerUnit),
        ffsMunitionCodes: getAssignmentMunitionCodes(code, assignmentSeed, ffsCountPerUnit),
        count,
        ffsCountPerUnit,
        totalReadyMissilePerUnit: Math.max(0, Math.floor(Number(item?.totalReadyMissilePerUnit) || 0))
      };
    })
    .filter((item) => item && item.count > 0);

  if (!id || !regionId || !region || systems.length === 0) {
    return null;
  }

  return {
    id,
    regionId,
    regionName: region.name,
    threatDirection: normalizeThreatDirection(plan?.threatDirection || "none"),
    systems,
    createdAt: new Date().toISOString()
  };
}

function getNextDeploymentCounter(plans) {
  let maxCounter = 0;
  for (const plan of plans) {
    const match = /^DP(\d+)$/i.exec(String(plan?.id || "").trim());
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > maxCounter) {
      maxCounter = value;
    }
  }
  return maxCounter + 1;
}

function getNextDeploymentAssignmentCounter(plans) {
  let maxCounter = 0;
  for (const plan of plans) {
    const systems = Array.isArray(plan?.systems) ? plan.systems : [];
    for (const item of systems) {
      const match = /^ASG(\d+)$/i.exec(String(item?.id || "").trim());
      if (!match) {
        continue;
      }
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > maxCounter) {
        maxCounter = value;
      }
    }
  }
  return maxCounter + 1;
}

function buildComponentLayoutUnitKey(planId, assignmentId, systemCode, unitOrdinal) {
  return `${planId}:${assignmentId}:${systemCode}-U${Math.max(1, Math.floor(Number(unitOrdinal) || 1))}`;
}

function normalizeImportedUnitLayout(unit) {
  const planId = String(unit?.planId || "").trim();
  const systemCode = String(unit?.systemCode || "").trim();
  const assignmentId = String(unit?.assignmentId || "").trim() || String(unit?.munitionCode || "").trim() || systemCode;
  const unitOrdinal = Math.max(1, Math.floor(Number(unit?.assignmentUnitIndex) + 1 || Number(unit?.sequence) || 1));
  const radar = unit?.components?.radar;
  const kkm = unit?.components?.kkm;
  const ffs = Array.isArray(unit?.components?.ffs) ? unit.components.ffs : [];

  if (!planId || !systemCode || !radar?.position || !kkm?.position || ffs.length === 0) {
    return null;
  }

  const layout = {
    radar: {
      x: Math.round(numberOrZero(radar.position.x)),
      y: Math.round(numberOrZero(radar.position.y)),
      blindSectors: normalizeBlindSectors(radar.blindSectors)
    },
    kkm: {
      x: Math.round(numberOrZero(kkm.position.x)),
      y: Math.round(numberOrZero(kkm.position.y))
    },
    ffs: ffs.map((item) => ({
      x: Math.round(numberOrZero(item?.position?.x)),
      y: Math.round(numberOrZero(item?.position?.y)),
      blindSectors: normalizeBlindSectors(item?.blindSectors)
    }))
  };

  if (unit?.components?.akr?.position) {
    layout.akr = {
      x: Math.round(numberOrZero(unit.components.akr.position.x)),
      y: Math.round(numberOrZero(unit.components.akr.position.y))
    };
  }
  if (unit?.components?.eo?.position) {
    layout.eo = {
      x: Math.round(numberOrZero(unit.components.eo.position.x)),
      y: Math.round(numberOrZero(unit.components.eo.position.y))
    };
  }

  return {
    unitKey: buildComponentLayoutUnitKey(planId, assignmentId, systemCode, unitOrdinal),
    layout
  };
}

function focusRegionOnMainMap(region) {
  if (!region?.points?.length) {
    renderCanvas();
    return;
  }

  const bounds = getRegionBounds(region);
  const center = computeRegionCenter(region);
  const marginPx = 120;

  const worldWidth = Math.max(bounds.xMax - bounds.xMin, region.type === "point" ? 800 : 200);
  const worldHeight = Math.max(bounds.yMax - bounds.yMin, region.type === "point" ? 800 : 200);

  const usableWidth = Math.max(1, canvas.width - marginPx * 2);
  const usableHeight = Math.max(1, canvas.height - marginPx * 2);
  const fitScale = Math.min(usableWidth / worldWidth, usableHeight / worldHeight);
  const targetZoom = clampNumber(fitScale * MAP_SCALE_METERS_PER_PIXEL, MIN_ZOOM, MAX_ZOOM);

  state.zoom = targetZoom;

  const scale = state.zoom / MAP_SCALE_METERS_PER_PIXEL;
  state.panX = -center.x * scale;
  state.panY = center.y * scale;

  renderCanvas();
}

function focusEirsOnMap(region) {
  if (!region?.points?.length) {
    renderEirsCanvas();
    return;
  }

  const bounds = getRegionBounds(region);
  const center = computeRegionCenter(region);
  const marginPx = 120;
  const worldWidth = Math.max(bounds.xMax - bounds.xMin, 800);
  const worldHeight = Math.max(bounds.yMax - bounds.yMin, 800);
  const usableWidth = Math.max(1, eirsCanvas.width - marginPx * 2);
  const usableHeight = Math.max(1, eirsCanvas.height - marginPx * 2);
  const fitScale = Math.min(usableWidth / worldWidth, usableHeight / worldHeight);
  state.eirsZoom = clampNumber(fitScale * MAP_SCALE_METERS_PER_PIXEL, MIN_ZOOM, MAX_ZOOM);

  const scale = state.eirsZoom / MAP_SCALE_METERS_PER_PIXEL;
  state.eirsPanX = -center.x * scale;
  state.eirsPanY = center.y * scale;
  renderEirsCanvas();
}

function setEirsStatus(message, mode) {
  refs.eirsStatus.textContent = message;
  refs.eirsStatus.className = mode === "warn" ? "status warn" : "status";
}

function setEirsZoom(nextZoom) {
  state.eirsZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom) || DEFAULT_ZOOM));
  renderEirsCanvas();
}

function changeEirsZoom(multiplier) {
  setEirsZoom(state.eirsZoom * multiplier);
}

function nudgeEirsPan(dx, dy) {
  state.eirsPanX += dx;
  state.eirsPanY += dy;
  renderEirsCanvas();
}

function resetEirsPan() {
  state.eirsPanX = 0;
  state.eirsPanY = 0;
  renderEirsCanvas();
}

function onEirsCanvasWheel(event) {
  event.preventDefault();
  if (event.deltaY < 0) {
    changeEirsZoom(1.12);
  } else {
    changeEirsZoom(0.89);
  }
}

function renderDraftTable() {
  refs.coordTableBody.innerHTML = "";

  if (!state.draft) {
    refs.coordEmpty.style.display = "block";
    return;
  }

  refs.coordEmpty.style.display = "none";

  state.draft.points.forEach((point, index) => {
    const tr = document.createElement("tr");

    const indexCell = document.createElement("td");
    indexCell.textContent = String(index + 1);

    const xCell = document.createElement("td");
    const xInput = document.createElement("input");
    xInput.type = "number";
    xInput.step = "1";
    xInput.value = String(point.x);
    xInput.addEventListener("input", () => {
      updateDraftPoint(index, "x", xInput.value);
    });
    xCell.append(xInput);

    const yCell = document.createElement("td");
    const yInput = document.createElement("input");
    yInput.type = "number";
    yInput.step = "1";
    yInput.value = String(point.y);
    yInput.addEventListener("input", () => {
      updateDraftPoint(index, "y", yInput.value);
    });
    yCell.append(yInput);

    const actionCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "table-actions warn";
    removeBtn.textContent = "Sil";
    removeBtn.disabled = state.draft.type === "point";
    removeBtn.addEventListener("click", () => {
      removeDraftPoint(index);
    });

    actionCell.append(removeBtn);
    tr.append(indexCell, xCell, yCell, actionCell);
    refs.coordTableBody.append(tr);
  });
}

function updateDraftPoint(index, axis, rawValue) {
  if (!state.draft) {
    return;
  }

  const num = Number(rawValue);
  if (!Number.isFinite(num)) {
    return;
  }

  state.draft.points[index][axis] = Math.round(num);
  syncAreaActionButtons();
  renderAreaGuide();
  renderCanvas();
}

function removeDraftPoint(index) {
  if (!state.draft || state.draft.type === "point") {
    return;
  }

  state.draft.points.splice(index, 1);
  setStatus(getDraftValidationMessage(state.draft), "info");
  renderAll();
}

function renderCanvas() {
  if (state.activeTab !== "areas") {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyViewTransform();
  drawWorldGrid();
  drawOriginAxes();

  for (const region of getAllProtectedAssets()) {
    const highlighted = state.highlightedRegionId === region.id;
    drawRegion(ctx, region, highlighted ? "savedActive" : "saved", pxToWorld, getAssetStyleMode(region));
  }

  if (state.draft) {
    drawRegion(ctx, state.draft, "draft", pxToWorld);
  }

  drawMainMapDeploymentOverlay();

  ctx.restore();

  drawAxisValueOverlay();
  drawLegendOverlay();
}

function renderEirsCanvas() {
  if (state.activeTab !== "eirs") {
    return;
  }
  eirsCtx.clearRect(0, 0, eirsCanvas.width, eirsCanvas.height);

  eirsCtx.save();
  applyViewTransformToContext(eirsCtx, eirsCanvas, state.eirsPanX, state.eirsPanY, state.eirsZoom);
  drawWorldGridOnContext(eirsCtx, eirsCanvas, state.eirsPanX, state.eirsPanY, state.eirsZoom);
  drawOriginAxesOnContext(eirsCtx, eirsCanvas, state.eirsPanX, state.eirsPanY, state.eirsZoom);

  for (const region of state.savedRegions) {
    drawRegion(eirsCtx, region, "saved", (px) => pxToWorldForZoom(px, state.eirsZoom), getAssetStyleMode(region));
  }

  for (const radar of state.savedEirs) {
    drawRegion(eirsCtx, radar, "saved", (px) => pxToWorldForZoom(px, state.eirsZoom), getAssetStyleMode(radar));
    const point = radar.points?.[0];
    if (point) {
      drawCoverageCircleWorld(
        eirsCtx,
        point.x,
        point.y,
        getEirsRadarRangeMeters(),
        "#7fd8ff",
        "radar",
        pxToWorldForZoom(1.3, state.eirsZoom)
      );
    }
  }

  if (state.eirsDraft) {
    drawRegion(eirsCtx, state.eirsDraft, "draft", (px) => pxToWorldForZoom(px, state.eirsZoom), "eirsActive");
    const point = state.eirsDraft.points?.[0];
    if (point) {
      drawCoverageCircleWorld(
        eirsCtx,
        point.x,
        point.y,
        getEirsRadarRangeMeters(),
        "#7fd8ff",
        "radar",
        pxToWorldForZoom(1.3, state.eirsZoom)
      );
    }
  }

  eirsCtx.restore();
  drawAxisValueOverlayForContext(eirsCtx, eirsCanvas, state.eirsPanX, state.eirsPanY, state.eirsZoom);
}

function drawWorldGridOnContext(targetCtx, targetCanvas, panX, panY, zoom) {
  const bounds = getVisibleWorldBoundsForView(targetCanvas, panX, panY, zoom);
  const gridStep = niceStep(pxToWorldForZoom(90, zoom));

  targetCtx.strokeStyle = "rgba(90, 142, 115, 0.32)";
  targetCtx.lineWidth = pxToWorldForZoom(1, zoom);

  const xStart = Math.floor(bounds.xMin / gridStep) * gridStep;
  for (let x = xStart; x <= bounds.xMax; x += gridStep) {
    targetCtx.beginPath();
    targetCtx.moveTo(x, bounds.yMin);
    targetCtx.lineTo(x, bounds.yMax);
    targetCtx.stroke();
  }

  const yStart = Math.floor(bounds.yMin / gridStep) * gridStep;
  for (let y = yStart; y <= bounds.yMax; y += gridStep) {
    targetCtx.beginPath();
    targetCtx.moveTo(bounds.xMin, y);
    targetCtx.lineTo(bounds.xMax, y);
    targetCtx.stroke();
  }
}

function drawOriginAxesOnContext(targetCtx, targetCanvas, panX, panY, zoom) {
  const bounds = getVisibleWorldBoundsForView(targetCanvas, panX, panY, zoom);

  targetCtx.strokeStyle = "rgba(109, 216, 255, 0.6)";
  targetCtx.lineWidth = pxToWorldForZoom(2, zoom);

  targetCtx.beginPath();
  targetCtx.moveTo(bounds.xMin, 0);
  targetCtx.lineTo(bounds.xMax, 0);
  targetCtx.moveTo(0, bounds.yMin);
  targetCtx.lineTo(0, bounds.yMax);
  targetCtx.stroke();

  targetCtx.beginPath();
  targetCtx.fillStyle = "#9fe6ff";
  targetCtx.arc(0, 0, pxToWorldForZoom(4, zoom), 0, Math.PI * 2);
  targetCtx.fill();
}

function drawAxisValueOverlayForContext(targetCtx, targetCanvas, panX, panY, zoom) {
  const xTicks = 6;
  const yTicks = 5;

  targetCtx.save();
  targetCtx.font = "700 11px Space Grotesk";
  targetCtx.fillStyle = "#bdeed7";
  targetCtx.strokeStyle = "rgba(189, 238, 215, 0.35)";
  targetCtx.lineWidth = 1;

  for (let i = 0; i <= xTicks; i += 1) {
    const sx = (i / xTicks) * targetCanvas.width;
    const world = screenToWorldForView(targetCanvas, panX, panY, zoom, sx, targetCanvas.height / 2);
    const label = formatMeters(world.x);
    const textWidth = targetCtx.measureText(label).width;
    const textX = clampNumber(sx - textWidth / 2, 2, targetCanvas.width - textWidth - 2);

    targetCtx.beginPath();
    targetCtx.moveTo(sx, targetCanvas.height - 15);
    targetCtx.lineTo(sx, targetCanvas.height);
    targetCtx.stroke();

    targetCtx.fillText(label, textX, targetCanvas.height - 18);
  }

  for (let i = 0; i <= yTicks; i += 1) {
    const sy = (i / yTicks) * targetCanvas.height;
    const world = screenToWorldForView(targetCanvas, panX, panY, zoom, targetCanvas.width / 2, sy);
    const label = formatMeters(world.y);

    targetCtx.beginPath();
    targetCtx.moveTo(0, sy);
    targetCtx.lineTo(15, sy);
    targetCtx.stroke();

    targetCtx.fillText(label, 18, sy + 3);
  }

  targetCtx.fillStyle = "#9fe6ff";
  targetCtx.fillText("X ekseni (m)", targetCanvas.width - 110, targetCanvas.height - 4);
  targetCtx.fillText("Y ekseni (m)", 18, 14);
  targetCtx.restore();
}

function drawMainMapDeploymentOverlay() {
  drawMainMapEirsCoverageOverlay();
  const previews = getVisibleDeploymentPreviews();
  if (previews.length === 0) {
    return;
  }

  for (const preview of previews) {
    const criteriaRings = getCriteriaRingsForPreview(preview);
    if (state.coverageLayers.minCriteria) {
      for (const ring of criteriaRings) {
        drawCriteriaRingWorld(ctx, preview.center.x, preview.center.y, ring.minM, ring.color, "min", pxToWorld(1.2));
      }
    }
    if (state.coverageLayers.maxCriteria) {
      for (const ring of criteriaRings) {
        drawCriteriaRingWorld(ctx, preview.center.x, preview.center.y, ring.maxM, ring.color, "max", pxToWorld(1.2));
      }
    }

    for (const unit of preview.units) {
      const coverageItems = getCoverageItemsForUnit(unit);
      for (const coverage of coverageItems) {
        drawCoverageCircleWorld(
          ctx,
          coverage.cx,
          coverage.cy,
          coverage.radiusM,
          coverage.type === "radar" ? unit.color : "#ffb27d",
          coverage.type,
          pxToWorld(1.5),
          coverage.blindSectors
        );
      }
    }

    drawCenterMarkerWorld(ctx, preview.center.x, preview.center.y, pxToWorld(6));

    for (const unit of preview.units) {
      drawSystemMarkerWorld(ctx, unit, pxToWorld(5));
    }
  }
}

function drawMainMapEirsCoverageOverlay() {
  for (const eirs of state.savedEirs) {
    const point = eirs.points?.[0];
    if (!point) {
      continue;
    }
    drawCoverageCircleWorld(ctx, point.x, point.y, getEirsRadarRangeMeters(), "#7fd8ff", "radar", pxToWorld(1.2));
    drawCenterMarkerWorld(ctx, point.x, point.y, pxToWorld(5));
  }
}

function drawWorldGrid() {
  const bounds = getVisibleWorldBounds();
  const gridStep = niceStep(pxToWorld(90));

  ctx.strokeStyle = "rgba(90, 142, 115, 0.32)";
  ctx.lineWidth = pxToWorld(1);

  const xStart = Math.floor(bounds.xMin / gridStep) * gridStep;
  for (let x = xStart; x <= bounds.xMax; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, bounds.yMin);
    ctx.lineTo(x, bounds.yMax);
    ctx.stroke();
  }

  const yStart = Math.floor(bounds.yMin / gridStep) * gridStep;
  for (let y = yStart; y <= bounds.yMax; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(bounds.xMin, y);
    ctx.lineTo(bounds.xMax, y);
    ctx.stroke();
  }
}

function drawOriginAxes() {
  const bounds = getVisibleWorldBounds();

  ctx.strokeStyle = "rgba(109, 216, 255, 0.6)";
  ctx.lineWidth = pxToWorld(2);

  ctx.beginPath();
  ctx.moveTo(bounds.xMin, 0);
  ctx.lineTo(bounds.xMax, 0);
  ctx.moveTo(0, bounds.yMin);
  ctx.lineTo(0, bounds.yMax);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = "#9fe6ff";
  ctx.arc(0, 0, pxToWorld(4), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9fe6ff";
  ctx.font = `${pxToWorld(12)}px Space Grotesk`;
  drawWorldLabel(ctx, "(0,0)", pxToWorld(7), -pxToWorld(10));
}

function drawRegion(targetCtx, region, mode, worldSize, explicitMode = "") {
  const points = region.points;
  if (!points || points.length === 0) {
    return;
  }

  const style = getRegionStyle(explicitMode || mode);

  if (region.type === "point") {
    const p = points[0];

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, worldSize(24), 0, Math.PI * 2);
    targetCtx.fillStyle = hatchPattern;
    targetCtx.fill();
    targetCtx.fillStyle = style.fill;
    targetCtx.fill();
    targetCtx.lineWidth = worldSize(2);
    targetCtx.strokeStyle = style.stroke;
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, worldSize(4), 0, Math.PI * 2);
    targetCtx.fillStyle = style.stroke;
    targetCtx.fill();
    targetCtx.restore();

    drawRegionLabelWorld(targetCtx, region, p.x, p.y - worldSize(30), style.stroke, worldSize);
    return;
  }

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    targetCtx.lineTo(points[i].x, points[i].y);
  }

  if (points.length >= 3) {
    targetCtx.closePath();
    targetCtx.fillStyle = hatchPattern;
    targetCtx.fill();
    targetCtx.fillStyle = style.fill;
    targetCtx.fill();
  }

  targetCtx.lineWidth = worldSize(2);
  targetCtx.strokeStyle = style.stroke;
  targetCtx.stroke();

  for (const p of points) {
    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, worldSize(4), 0, Math.PI * 2);
    targetCtx.fillStyle = style.stroke;
    targetCtx.fill();
  }

  const center = computeRegionCenter(region);
  drawRegionLabelWorld(targetCtx, region, center.x, center.y, style.stroke, worldSize);
  targetCtx.restore();
}

function getRegionStyle(mode) {
  if (mode === "eirs" || mode === "eirsActive") {
    return {
      stroke: mode === "eirsActive" ? "#8fd6ff" : "#5ab8f0",
      fill: mode === "eirsActive" ? "rgba(92, 200, 255, 0.22)" : "rgba(59, 154, 214, 0.16)"
    };
  }
  if (mode === "draft") {
    return {
      stroke: "#ffc38d",
      fill: "rgba(255, 143, 83, 0.18)"
    };
  }

  if (mode === "savedActive") {
    return {
      stroke: "#65e3ac",
      fill: "rgba(70, 191, 143, 0.22)"
    };
  }

  return {
    stroke: "#41ba89",
    fill: "rgba(46, 163, 117, 0.14)"
  };
}

function getAssetStyleMode(asset) {
  const isEirs = String(asset?.id || "").startsWith("E");
  if (isEirs) {
    return state.highlightedRegionId === asset.id ? "eirsActive" : "eirs";
  }
  return state.highlightedRegionId === asset.id ? "savedActive" : "saved";
}

function drawRegionLabelWorld(targetCtx, region, x, y, color, worldSize) {
  const kind = String(region?.id || "").startsWith("E")
    ? "E"
    : (region.type === "point" ? "N" : "B");
  const text = `${region.name} (${kind})`;

  targetCtx.save();
  targetCtx.font = `${worldSize(12)}px Space Grotesk`;
  const boxW = worldSize(Math.max(60, text.length * 7.2));
  const boxH = worldSize(18);

  targetCtx.fillStyle = "rgba(6, 14, 10, 0.88)";
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = worldSize(1);

  targetCtx.beginPath();
  targetCtx.rect(x - boxW / 2, y - boxH, boxW, boxH);
  targetCtx.fill();
  targetCtx.stroke();

  targetCtx.fillStyle = color;
  drawWorldLabel(targetCtx, text, x - boxW / 2 + worldSize(6), y - boxH / 2);
  targetCtx.restore();
}

function drawWorldLabel(targetCtx, text, x, y) {
  targetCtx.save();
  targetCtx.scale(1, -1);
  targetCtx.fillText(text, x, -y);
  targetCtx.restore();
}

function drawAxisValueOverlay() {
  const xTicks = 6;
  const yTicks = 5;

  ctx.save();
  ctx.font = "700 11px Space Grotesk";
  ctx.fillStyle = "#bdeed7";
  ctx.strokeStyle = "rgba(189, 238, 215, 0.35)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= xTicks; i += 1) {
    const sx = (i / xTicks) * canvas.width;
    const world = screenToWorld(sx, canvas.height / 2);
    const label = formatMeters(world.x);
    const textWidth = ctx.measureText(label).width;
    const textX = clampNumber(sx - textWidth / 2, 2, canvas.width - textWidth - 2);

    ctx.beginPath();
    ctx.moveTo(sx, canvas.height - 15);
    ctx.lineTo(sx, canvas.height);
    ctx.stroke();

    ctx.fillText(label, textX, canvas.height - 18);
  }

  for (let i = 0; i <= yTicks; i += 1) {
    const sy = (i / yTicks) * canvas.height;
    const world = screenToWorld(canvas.width / 2, sy);
    const label = formatMeters(world.y);

    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(15, sy);
    ctx.stroke();

    ctx.fillText(label, 18, sy + 3);
  }

  ctx.fillStyle = "#9fe6ff";
  ctx.fillText("X ekseni (m)", canvas.width - 110, canvas.height - 4);
  ctx.fillText("Y ekseni (m)", 18, 14);
  ctx.restore();
}

function drawLegendOverlay() {
  const visibleCount = getVisibleDeploymentPreviews().length;
  const coverageLabel = getActiveLayerLabel();

  ctx.save();
  ctx.fillStyle = "rgba(4, 10, 8, 0.8)";
  ctx.fillRect(12, 10, 390, 64);
  ctx.strokeStyle = "#355746";
  ctx.strokeRect(12, 10, 390, 64);

  ctx.font = "700 12px Space Grotesk";
  ctx.fillStyle = "#65e3ac";
  ctx.fillText("Korunacak Varlık / EİRS", 20, 30);
  ctx.fillStyle = "#ffc38d";
  ctx.fillText("Aktif Taslak", 20, 48);

  ctx.fillStyle = "#bdeed7";
  ctx.fillText(`Merkez: (0,0) | Zoom: x${state.zoom.toFixed(2)}`, 150, 30);
  const previewText =
    visibleCount > 0
      ? `${coverageLabel} | Gösterilen Plan: ${visibleCount}`
      : `${coverageLabel} | Plan seçili değil`;
  ctx.fillText(previewText, 150, 48);
  ctx.restore();
}

function onDeploymentRegionChange() {
  state.selectedDeploymentRegionId = refs.defendedRegionSelect.value;
  state.highlightedRegionId = state.selectedDeploymentRegionId || null;
  state.deploymentView.selectedUnitKey = null;
  closeComponentEditor();
  closeDeploymentAssignmentModal();
  const selectedRegion = getAllProtectedAssets().find((region) => region.id === state.selectedDeploymentRegionId);
  centerDeploymentViewOnRegion(selectedRegion);
  renderDeploymentEditor();
  renderCanvas();
  renderDeploymentMap();
}

function onThreatDirectionChange() {
  state.scenarioThreatDirection = normalizeThreatDirection(refs.threatDirectionSelect.value);
  refs.threatDirectionSelect.value = state.scenarioThreatDirection;
  for (const plan of state.deployments) {
    plan.threatDirection = state.scenarioThreatDirection;
    plan.updatedAt = new Date().toISOString();
  }
  closeComponentEditor();
  state.deploymentView.selectedUnitKey = null;
  syncSharedDefendedAssetsStorage();
  syncDefenseJsonView();
  renderCanvas();
  renderDeploymentMap();
}

function ensureDeploymentDraftEntry(draftCounts, code) {
  const current = draftCounts[code];
  const spec = getSystemComponentSpec(code, current);

  if (!current || typeof current !== "object") {
    const next = {
      count: 0,
      ffsCountPerUnit: spec.ffsCount
    };
    draftCounts[code] = next;
    return next;
  }

  current.count = Math.max(0, Math.floor(Number(current.count) || 0));
  current.ffsCountPerUnit = clampNumber(
    Math.max(1, Math.floor(Number(current.ffsCountPerUnit) || spec.ffsCount || 1)),
    Math.max(1, spec.ffsMinCount || 1),
    Math.max(1, spec.ffsMaxCount || spec.ffsCount || 1)
  );
  return current;
}

function ensureDeploymentDraftForRegion(regionId) {
  if (!regionId) {
    return {};
  }
  if (!state.deploymentDraftByRegion[regionId]) {
    state.deploymentDraftByRegion[regionId] = {};
  }
  const draftCounts = state.deploymentDraftByRegion[regionId];
  for (const system of state.availableSystems) {
    ensureDeploymentDraftEntry(draftCounts, system.code);
  }
  return draftCounts;
}

function renderDeploymentEditor() {
  refs.defendedRegionSelect.innerHTML = "";

  const protectedAssets = getAllProtectedAssets();
  if (protectedAssets.length === 0) {
    refs.systemPickBody.innerHTML =
      `<tr><td colspan="2" class="empty">Önce korunacak varlık veya EİRS kaydı oluşturun.</td></tr>`;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Kayıt yok";
    refs.defendedRegionSelect.append(option);
    refs.defendedRegionSelect.disabled = true;
    refs.threatDirectionSelect.disabled = true;
    refs.threatDirectionSelect.value = getScenarioThreatDirection();
    return;
  }

  refs.defendedRegionSelect.disabled = false;
  refs.threatDirectionSelect.disabled = false;
  refs.threatDirectionSelect.value = getScenarioThreatDirection();

  for (const region of protectedAssets) {
    const option = document.createElement("option");
    option.value = region.id;
    const labelType = String(region.id).startsWith("E") ? "EİRS" : (region.type === "point" ? "Nokta" : "Bölge");
    option.textContent = `${region.id} - ${region.name} (${labelType})`;
    refs.defendedRegionSelect.append(option);
  }

  if (!state.selectedDeploymentRegionId || !protectedAssets.some((r) => r.id === state.selectedDeploymentRegionId)) {
    state.selectedDeploymentRegionId = protectedAssets[0].id;
  }

  refs.defendedRegionSelect.value = state.selectedDeploymentRegionId;
  state.highlightedRegionId = state.selectedDeploymentRegionId;
  const draftCounts = ensureDeploymentDraftForRegion(state.selectedDeploymentRegionId);

  refs.systemPickBody.innerHTML = "";

  for (const system of state.availableSystems) {
    const tr = document.createElement("tr");
    const criteria = getCriteriaByCode(system.code);
    const recommended = numberOrNull(criteria?.recommendedCount);
    const assignments = getAssignmentsForRegionSystem(state.selectedDeploymentRegionId, system.code);

    const codeTd = document.createElement("td");
    codeTd.textContent = system.code;

    const draftEntry = ensureDeploymentDraftEntry(draftCounts, system.code);
    const countTd = document.createElement("td");
    const countInput = document.createElement("input");
    countInput.type = "number";
    countInput.min = "0";
    countInput.step = "1";
    countInput.value = String(draftEntry.count);
    countInput.className = "system-count-input";
    countInput.addEventListener("change", () => {
      draftEntry.count = Math.max(0, Math.floor(Number(countInput.value) || 0));
      countInput.value = String(draftEntry.count);
      addBtn.disabled = !(draftEntry.count > 0);
    });
    countTd.append(countInput);

    const ffsTd = document.createElement("td");
    const ffsSelect = document.createElement("select");
    ffsSelect.className = "system-ffs-select";
    const spec = getSystemComponentSpec(system.code, draftEntry);
    for (let value = Math.max(1, spec.ffsMinCount || 1); value <= Math.max(1, spec.ffsMaxCount || spec.ffsCount || 1); value += 1) {
      ffsSelect.append(new Option(String(value), String(value)));
    }
    ffsSelect.value = String(draftEntry.ffsCountPerUnit);
    ffsSelect.disabled = spec.ffsMinCount === spec.ffsMaxCount;
    ffsSelect.addEventListener("change", () => {
      draftEntry.ffsCountPerUnit = Math.max(1, Math.floor(Number(ffsSelect.value) || spec.ffsCount || 1));
      ffsSelect.value = String(draftEntry.ffsCountPerUnit);
    });
    ffsTd.append(ffsSelect);

    const actionTd = document.createElement("td");
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "ghost table-actions";
    addBtn.textContent = "Ekle";
    addBtn.disabled = !(draftEntry.count > 0);
    addBtn.addEventListener("click", () => openDeploymentAssignmentModal(system.code));
    actionTd.append(addBtn);

    tr.append(codeTd, countTd, ffsTd, actionTd);
    refs.systemPickBody.append(tr);

    const detailTr = document.createElement("tr");
    detailTr.className = "system-detail-row";
    const detailTd = document.createElement("td");
    detailTd.colSpan = 4;
    const detailBox = document.createElement("div");
    detailBox.className = "system-detail-box";
    const minKm = numberOrNull(criteria?.centerMinKm);
    const maxKm = numberOrNull(criteria?.centerMaxKm);
    const summary = document.createElement("div");
    summary.textContent = recommended
      ? `${system.code} Tavsiye edilen ${recommended} Ünite | Min-Max konuşlanma: ${formatDistanceKm(minKm)} - ${formatDistanceKm(maxKm)} km`
      : `${system.code} Tavsiye bilgisi bulunmuyor.`;
    detailBox.append(summary);

    const list = document.createElement("div");
    list.className = "deployment-assignment-list";
    if (assignments.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Henüz plan tanımlanmadı.";
      list.append(empty);
    } else {
      assignments.forEach((assignment) => {
        const item = document.createElement("div");
        item.className = "deployment-assignment-item";

        const info = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = formatAssignmentMunitionSummary(system.code, assignment);
        const spec = getSystemComponentSpec(system.code, assignment);
        const totalReadyMissile = getAssignmentTotalReadyMissile(system.code, assignment);
        const meta = document.createElement("small");
        meta.textContent = `${assignment.count} Ünite | FFS/Ünite ${spec.ffsCount} | Hazır Mühimmat ${totalReadyMissile}`;
        info.append(title, meta);

        const actions = document.createElement("div");
        actions.className = "deployment-inline-actions";
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "ghost table-actions";
        editBtn.textContent = "Düzenle";
        editBtn.addEventListener("click", () => openDeploymentAssignmentModal(system.code, assignment.id));
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "warn table-actions";
        removeBtn.textContent = "Sil";
        removeBtn.addEventListener("click", () => removeDeploymentAssignment(state.selectedDeploymentRegionId, assignment.id));
        actions.append(editBtn, removeBtn);

        item.append(info, actions);
        list.append(item);
      });
    }
    detailBox.append(list);
    detailTd.append(detailBox);
    detailTr.append(detailTd);
    refs.systemPickBody.append(detailTr);
  }

}

function getDeploymentPlanByRegion(regionId) {
  return state.deployments.find((plan) => plan.regionId === regionId) || null;
}

function getOrCreateDeploymentPlan(regionId) {
  const existing = getDeploymentPlanByRegion(regionId);
  if (existing) {
    return existing;
  }

  const region = getAllProtectedAssets().find((item) => item.id === regionId);
  if (!region) {
    return null;
  }

  const plan = {
    id: `DP${String(state.deploymentCounter).padStart(3, "0")}`,
    regionId,
    regionName: region.name,
    threatDirection: getScenarioThreatDirection(),
    systems: [],
    createdAt: new Date().toISOString()
  };
  state.deployments.push(plan);
  state.visibleDeploymentPlanIds.push(plan.id);
  state.deploymentCounter += 1;
  return plan;
}

function getAssignmentsForRegionSystem(regionId, code) {
  const plan = getDeploymentPlanByRegion(regionId);
  const systems = Array.isArray(plan?.systems) ? plan.systems : [];
  return systems.filter((item) => String(item?.code || "").trim() === code);
}

function getCompatibleMunitionsForSystem(code) {
  const system = state.systemCatalogByCode[code] || {};
  const compatibleCodes = Array.isArray(system.compatibleMunitions) ? system.compatibleMunitions : [];
  const uniqueCodes = compatibleCodes.length
    ? [...new Set(compatibleCodes.map((item) => String(item || "").trim()).filter(Boolean))]
    : [String(system?.interceptor?.primaryMunitionCode || "").trim()].filter(Boolean);
  return uniqueCodes
    .map((munitionCode) => state.munitionCatalogByCode[munitionCode])
    .filter(Boolean);
}

function getAssignmentTotalFfsCount(systemCode, assignment = null, targetFfsCount = null, targetUnitCount = null) {
  const componentSpec = getSystemComponentSpec(systemCode, assignment);
  const ffsPerUnit = Math.max(1, Number(targetFfsCount) || componentSpec.ffsCount || 1);
  const unitCount = Math.max(1, Number(targetUnitCount) || Number(assignment?.count) || 1);
  return unitCount * ffsPerUnit;
}

function getAssignmentFfsLoadout(systemCode, assignment = null, targetFfsCount = null, targetUnitCount = null) {
  const componentSpec = getSystemComponentSpec(systemCode, assignment);
  const ffsCount = getAssignmentTotalFfsCount(systemCode, assignment, targetFfsCount, targetUnitCount);
  const fallbackCode = getPreferredMunitionCode(systemCode, assignment);
  const importedLoadout = Array.isArray(assignment?.ffsLoadout) ? assignment.ffsLoadout : [];
  const importedCodes = Array.isArray(assignment?.ffsMunitionCodes) ? assignment.ffsMunitionCodes : [];
  const singleCode = String(assignment?.munitionCode || fallbackCode || "").trim() || String(fallbackCode || "").trim();
  const rows = [];
  for (let index = 0; index < ffsCount; index += 1) {
    const rawRow = importedLoadout[index];
    const munitionCode = String(
      rawRow?.munitionCode ||
      importedCodes[index] ||
      singleCode ||
      fallbackCode ||
      ""
    ).trim();
    const maxCount = getMunitionMissilePerFfs(systemCode, munitionCode, assignment);
    const requestedMissileCount = numberOrNull(rawRow?.missileCount);
    const missileCount = clampNumber(
      requestedMissileCount === null ? maxCount : Math.max(0, Math.floor(requestedMissileCount)),
      0,
      Math.max(0, maxCount)
    );
    rows.push({ munitionCode, missileCount });
  }
  return rows;
}

function getUnitFfsLoadout(systemCode, assignment, unitIndex = 0, targetFfsCount = null) {
  const componentSpec = getSystemComponentSpec(systemCode, assignment);
  const ffsPerUnit = Math.max(1, Number(targetFfsCount) || componentSpec.ffsCount || 1);
  const assignmentLoadout = getAssignmentFfsLoadout(systemCode, assignment, ffsPerUnit, assignment?.count);
  const startIndex = Math.max(0, Math.floor(Number(unitIndex) || 0)) * ffsPerUnit;
  const unitSlice = assignmentLoadout.slice(startIndex, startIndex + ffsPerUnit);
  if (unitSlice.length === ffsPerUnit) {
    return unitSlice;
  }
  return getAssignmentFfsLoadout(systemCode, assignment, ffsPerUnit, 1);
}

function getAssignmentMunitionCodes(systemCode, assignment = null, targetFfsCount = null) {
  return getAssignmentFfsLoadout(systemCode, assignment, targetFfsCount).map((item) => item.munitionCode);
}

function getPreferredMunitionCode(code, assignment = null) {
  const compatible = getCompatibleMunitionsForSystem(code);
  const preferred = String(
    assignment?.ffsLoadout?.[0]?.munitionCode ||
    assignment?.ffsMunitionCodes?.[0] ||
    assignment?.munitionCode ||
    state.systemCatalogByCode[code]?.interceptor?.primaryMunitionCode ||
    compatible[0]?.code ||
    ""
  ).trim();
  return preferred;
}

function getMunitionDisplayLabel(munitionCode) {
  const item = state.munitionCatalogByCode[munitionCode];
  if (!item) {
    return String(munitionCode || "-");
  }
  return `${item.code} - ${item.name}`;
}

function getMunitionShortLabel(munitionCode) {
  const code = String(munitionCode || "").trim().toUpperCase();
  if (!code) {
    return "-";
  }
  if (code.includes("BLK1")) {
    return "Block-1";
  }
  if (code.includes("BLK2") || code === "MIS_HSS_U") {
    return "Block-2";
  }
  const item = state.munitionCatalogByCode[munitionCode];
  return String(item?.name || code);
}

function formatAssignmentMunitionSummary(systemCode, assignment) {
  const loadout = getAssignmentFfsLoadout(systemCode, assignment);
  const codes = loadout.map((item) => item.munitionCode);
  const uniqueCodes = [...new Set(codes.filter(Boolean))];
  if (uniqueCodes.length <= 1) {
    return getMunitionDisplayLabel(uniqueCodes[0] || getPreferredMunitionCode(systemCode, assignment));
  }
  const ffsPerUnit = Math.max(1, Math.floor(Number(assignment?.ffsCountPerUnit) || getSystemComponentSpec(systemCode, assignment).ffsCount || 1));
  return loadout
    .map((item, index) => {
      const unitNo = Math.floor(index / ffsPerUnit) + 1;
      const ffsNo = (index % ffsPerUnit) + 1;
      return `B${unitNo}/F${ffsNo}:${getMunitionShortLabel(item.munitionCode)}x${item.missileCount}`;
    })
    .join(" | ");
}

function getAssignmentWezRangeKm(assignment) {
  const loadout = getAssignmentFfsLoadout(assignment?.code, assignment);
  let best = null;
  for (const row of loadout) {
    if (!(Number(row?.missileCount) > 0)) {
      continue;
    }
    const code = row.munitionCode;
    const munition = state.munitionCatalogByCode[String(code || "").trim()];
    if (!munition) {
      continue;
    }
    const maxEff = numberOrNull(munition?.engagementEnvelope?.maxEffRangeKm);
    const maxRange = numberOrNull(munition?.engagementEnvelope?.maxRangeKm);
    const candidate = maxEff ?? maxRange;
    if (candidate !== null) {
      best = best === null ? candidate : Math.max(best, candidate);
    }
  }
  if (best !== null) {
    return best;
  }
  return numberOrZero(getSystemInfo(assignment?.code)?.wezRangeKm);
}

function getMunitionWezRangeKm(munitionCode) {
  const munition = state.munitionCatalogByCode[String(munitionCode || "").trim()];
  if (!munition) {
    return 0;
  }
  return numberOrNull(munition?.engagementEnvelope?.maxEffRangeKm)
    ?? numberOrNull(munition?.engagementEnvelope?.maxRangeKm)
    ?? 0;
}

function getUnitLoadoutReachProfile(systemCode, assignment, unitIndex = 0, targetFfsCount = null) {
  const loadout = getUnitFfsLoadout(systemCode, assignment, unitIndex, targetFfsCount);
  const activeRanges = loadout
    .filter((row) => Math.max(0, Math.floor(Number(row?.missileCount) || 0)) > 0)
    .map((row) => numberOrZero(getMunitionWezRangeKm(row?.munitionCode)))
    .filter((value) => value > 0);

  if (!activeRanges.length) {
    const fallback = numberOrZero(getAssignmentWezRangeKm(assignment));
    return {
      minKm: fallback,
      avgKm: fallback,
      maxKm: fallback
    };
  }

  const total = activeRanges.reduce((sum, value) => sum + value, 0);
  return {
    minKm: Math.min(...activeRanges),
    avgKm: total / activeRanges.length,
    maxKm: Math.max(...activeRanges)
  };
}

function getMunitionMissilePerFfs(systemCode, munitionCode, assignment = null) {
  const munition = state.munitionCatalogByCode[String(munitionCode || "").trim()];
  const munitionLoadout = numberOrNull(munition?.loadout?.missilePerFfs);
  if (munitionLoadout !== null) {
    return Math.max(0, Math.floor(munitionLoadout));
  }
  return Math.max(0, Math.floor(getSystemComponentSpec(systemCode, assignment).missilePerFfs));
}

function getAssignmentTotalReadyMissile(systemCode, assignment) {
  const loadout = getAssignmentFfsLoadout(systemCode, assignment);
  return loadout.reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row?.missileCount) || 0)),
    0
  );
}

function collectDeploymentAssignmentLoadoutSelections() {
  if (!refs.deploymentAssignmentLoadoutRows) {
    return [];
  }
  const rows = [];
  const wrappers = Array.from(refs.deploymentAssignmentLoadoutRows.querySelectorAll("tr[data-ffs-loadout-row]"));
  wrappers.forEach((wrapper) => {
    const munitionSelect = wrapper.querySelector("select[data-role='munition']");
    const countSelect = wrapper.querySelector("select[data-role='count']");
    rows.push({
      munitionCode: String(munitionSelect?.value || "").trim(),
      missileCount: Math.max(0, Math.floor(Number(countSelect?.value) || 0))
    });
  });
  return rows;
}

function renderDeploymentAssignmentLoadoutRows(selectedLoadout = []) {
  const systemCode = state.deploymentAssignmentModal.systemCode;
  const compatibleMunitions = getCompatibleMunitionsForSystem(systemCode);
  const ffsPerUnit = Math.max(1, Math.floor(Number(state.deploymentAssignmentModal.ffsCountPerUnit) || 1));
  const unitCount = Math.max(1, Math.floor(Number(state.deploymentAssignmentModal.count) || 1));
  const totalFfsCount = unitCount * ffsPerUnit;
  refs.deploymentAssignmentLoadoutRows.innerHTML = "";

  for (let index = 0; index < totalFfsCount; index += 1) {
    const wrapper = document.createElement("tr");
    wrapper.dataset.ffsLoadoutRow = String(index);
    const unitNo = Math.floor(index / ffsPerUnit) + 1;
    const ffsNo = (index % ffsPerUnit) + 1;
    const labelCell = document.createElement("td");
    labelCell.textContent = `Batarya ${unitNo} / FFS ${ffsNo}`;

    const munitionCell = document.createElement("td");
    const munitionSelect = document.createElement("select");
    munitionSelect.dataset.role = "munition";
    compatibleMunitions.forEach((munition) => {
      const option = document.createElement("option");
      option.value = munition.code;
      option.textContent = getMunitionDisplayLabel(munition.code);
      munitionSelect.append(option);
    });
    const row = selectedLoadout[index] || {};
    const fallbackCode = String(row?.munitionCode || compatibleMunitions[0]?.code || "").trim();
    munitionSelect.value = fallbackCode;

    munitionCell.append(munitionSelect);

    const countCell = document.createElement("td");
    const countSelect = document.createElement("select");
    countSelect.dataset.role = "count";
    const renderCountOptions = () => {
      const selectedCode = String(munitionSelect.value || fallbackCode).trim();
      const maxCount = getMunitionMissilePerFfs(systemCode, selectedCode, { ffsCountPerUnit: ffsPerUnit });
      const currentValue = numberOrNull(countSelect.value);
      const rowValue = numberOrNull(row?.missileCount);
      const previousValue = currentValue ?? rowValue ?? maxCount;
      countSelect.innerHTML = "";
      for (let value = 0; value <= maxCount; value += 1) {
        countSelect.append(new Option(String(value), String(value)));
      }
      countSelect.value = String(clampNumber(previousValue, 0, maxCount));
    };
    munitionSelect.addEventListener("change", () => {
      renderCountOptions();
      updateDeploymentAssignmentModalInfo();
    });
    renderCountOptions();
    countCell.append(countSelect);
    wrapper.append(labelCell, munitionCell, countCell);
    refs.deploymentAssignmentLoadoutRows.append(wrapper);
  }
}

function formatDistanceKm(value) {
  const numeric = numberOrNull(value);
  if (numeric === null) {
    return "-";
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
}

function openDeploymentAssignmentModal(systemCode, assignmentId = null) {
  const regionId = state.selectedDeploymentRegionId;
  if (!regionId) {
    setDeploymentStatus("Önce korunacak varlık seçin.", "warn");
    return;
  }

  const draftCounts = ensureDeploymentDraftForRegion(regionId);
  const draftEntry = ensureDeploymentDraftEntry(draftCounts, systemCode);
  if (!assignmentId && !(draftEntry.count > 0)) {
    setDeploymentStatus(`${systemCode} için önce Tk/Bt/Fl adedini 1 veya daha büyük girin.`, "warn");
    return;
  }
  const plan = getDeploymentPlanByRegion(regionId);
  const assignment = Array.isArray(plan?.systems)
    ? plan.systems.find((item) => String(item?.id || "") === String(assignmentId || ""))
    : null;
  const baseConfig = assignment || draftEntry;
  const componentSpec = getSystemComponentSpec(systemCode, baseConfig);

  state.deploymentAssignmentModal.open = true;
  state.deploymentAssignmentModal.regionId = regionId;
  state.deploymentAssignmentModal.systemCode = systemCode;
  state.deploymentAssignmentModal.assignmentId = assignment?.id || null;
  state.deploymentAssignmentModal.count = Math.max(1, Math.floor(Number(baseConfig?.count) || 1));
  state.deploymentAssignmentModal.ffsCountPerUnit = componentSpec.ffsCount;

  refs.deploymentAssignmentTitle.textContent = `${systemCode} Konuşlandırma Planı`;
  refs.deploymentAssignmentSummary.textContent =
    `${state.deploymentAssignmentModal.count} Ünite | FFS/Ünite ${componentSpec.ffsCount} | Toplam FFS ${state.deploymentAssignmentModal.count * componentSpec.ffsCount}`;
  renderDeploymentAssignmentLoadoutRows(getAssignmentFfsLoadout(systemCode, assignment, componentSpec.ffsCount, state.deploymentAssignmentModal.count));
  refs.deploymentAssignmentStatus.textContent = assignment ? "Kaydı güncelleyebilirsiniz." : "Yeni atama bilgilerini girin.";
  refs.deploymentAssignmentStatus.className = "status";
  updateDeploymentAssignmentModalInfo();
  refs.deploymentAssignmentModal.classList.add("open");
  refs.deploymentAssignmentModal.setAttribute("aria-hidden", "false");
}

function updateDeploymentAssignmentModalInfo() {
  const systemCode = state.deploymentAssignmentModal.systemCode;
  if (!systemCode) {
    refs.deploymentAssignmentInfo.textContent = "Mühimmat seçimi yapın.";
    return;
  }
  const componentSpec = getSystemComponentSpec(systemCode, {
    ffsCountPerUnit: Math.max(1, Math.floor(Number(state.deploymentAssignmentModal.ffsCountPerUnit) || 1))
  });
  const selectedLoadout = collectDeploymentAssignmentLoadoutSelections();
  if (!selectedLoadout.length) {
    refs.deploymentAssignmentInfo.textContent = "FFS mühimmat dağılımı seçin.";
    return;
  }
  const missileSummary = selectedLoadout
    .map((row, index) => {
      const unitNo = Math.floor(index / componentSpec.ffsCount) + 1;
      const ffsNo = (index % componentSpec.ffsCount) + 1;
      return `B${unitNo}/F${ffsNo}:${getMunitionShortLabel(row.munitionCode)}x${row.missileCount}`;
    })
    .join(" | ");
  const totalReadyMissile = selectedLoadout.reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row?.missileCount) || 0)),
    0
  );
  const maxWez = selectedLoadout.reduce((best, row) => {
    if (!(Number(row?.missileCount) > 0)) {
      return best;
    }
    const munition = state.munitionCatalogByCode[String(row.munitionCode || "").trim()];
    const candidate = numberOrNull(munition?.engagementEnvelope?.maxEffRangeKm) ?? numberOrNull(munition?.engagementEnvelope?.maxRangeKm);
    return candidate === null ? best : Math.max(best, candidate);
  }, 0);
  const maxAltitude = selectedLoadout.reduce((best, row) => {
    if (!(Number(row?.missileCount) > 0)) {
      return best;
    }
    const munition = state.munitionCatalogByCode[String(row.munitionCode || "").trim()];
    const candidate = numberOrNull(munition?.engagementEnvelope?.maxAltitudeKm);
    return candidate === null ? best : Math.max(best, candidate);
  }, 0);
  refs.deploymentAssignmentInfo.textContent =
    `${missileSummary} | Hazır mühimmat: ${totalReadyMissile} | WEZ: ${formatDistanceKm(maxWez)} km | İrtifa: ${formatDistanceKm(maxAltitude)} km`;
}

function closeDeploymentAssignmentModal() {
  state.deploymentAssignmentModal.open = false;
  state.deploymentAssignmentModal.regionId = "";
  state.deploymentAssignmentModal.systemCode = "";
  state.deploymentAssignmentModal.assignmentId = null;
  state.deploymentAssignmentModal.count = 0;
  state.deploymentAssignmentModal.ffsCountPerUnit = 0;
  refs.deploymentAssignmentModal.classList.remove("open");
  refs.deploymentAssignmentModal.setAttribute("aria-hidden", "true");
}

function saveDeploymentAssignmentFromModal() {
  const regionId = state.deploymentAssignmentModal.regionId;
  const systemCode = state.deploymentAssignmentModal.systemCode;
  if (!regionId || !systemCode) {
    closeDeploymentAssignmentModal();
    return;
  }

  const plan = getOrCreateDeploymentPlan(regionId);
  if (!plan) {
    refs.deploymentAssignmentStatus.textContent = "Korunacak varlık bulunamadı.";
    refs.deploymentAssignmentStatus.className = "status warn";
    return;
  }

  const count = Math.max(1, Math.floor(Number(state.deploymentAssignmentModal.count) || 0));
  const componentSpec = getSystemComponentSpec(systemCode, {
    ffsCountPerUnit: Math.max(1, Math.floor(Number(state.deploymentAssignmentModal.ffsCountPerUnit) || 1))
  });
  const ffsLoadout = getAssignmentFfsLoadout(
    systemCode,
    { ffsLoadout: collectDeploymentAssignmentLoadoutSelections() },
    componentSpec.ffsCount,
    count
  );
  const invalidMunition = ffsLoadout.find((row) => !state.munitionCatalogByCode[String(row?.munitionCode || "").trim()]);
  if (invalidMunition || !ffsLoadout.length) {
    refs.deploymentAssignmentStatus.textContent = "Her FFS için mühimmat seçin.";
    refs.deploymentAssignmentStatus.className = "status warn";
    return;
  }
  const primaryMunitionCode = String(ffsLoadout[0]?.munitionCode || getPreferredMunitionCode(systemCode) || "").trim();
  const totalReadyMissilePerUnit = getUnitFfsLoadout(
    systemCode,
    { ffsLoadout, count, ffsCountPerUnit: componentSpec.ffsCount },
    0,
    componentSpec.ffsCount
  ).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row?.missileCount) || 0)),
    0
  );

  const nextAssignment = {
    id: state.deploymentAssignmentModal.assignmentId || `ASG${String(state.deploymentAssignmentCounter).padStart(4, "0")}`,
    code: systemCode,
    munitionCode: primaryMunitionCode,
    ffsMunitionCodes: ffsLoadout.map((row) => row.munitionCode),
    ffsLoadout,
    count,
    ffsCountPerUnit: componentSpec.ffsCount,
    totalReadyMissilePerUnit
  };

  const existingIndex = plan.systems.findIndex((item) => String(item?.id || "") === String(nextAssignment.id));
  if (existingIndex >= 0) {
    purgeComponentLayoutsByAssignmentIds([nextAssignment.id]);
    plan.systems[existingIndex] = nextAssignment;
  } else {
    plan.systems.push(nextAssignment);
    state.deploymentAssignmentCounter += 1;
  }

  plan.threatDirection = getScenarioThreatDirection();
  plan.updatedAt = new Date().toISOString();
  if (!isDeploymentPlanVisible(plan.id)) {
    state.visibleDeploymentPlanIds.push(plan.id);
  }

  state.highlightedRegionId = regionId;
  closeDeploymentAssignmentModal();
  syncSharedDefendedAssetsStorage();
  renderTabs();
  renderDeploymentEditor();
  renderDeploymentList();
  syncDefenseJsonView();
  renderCanvas();
  renderDeploymentMap();
  setDeploymentStatus(`"${plan.regionName}" için ${systemCode} ataması kaydedildi.`, "info");
}

function removeDeploymentAssignment(regionId, assignmentId) {
  const plan = getDeploymentPlanByRegion(regionId);
  if (!plan) {
    return;
  }
  const before = plan.systems.length;
  plan.systems = plan.systems.filter((item) => String(item?.id || "") !== String(assignmentId));
  purgeComponentLayoutsByAssignmentIds([assignmentId]);
  if (plan.systems.length === before) {
    return;
  }
  if (plan.systems.length === 0) {
    removeDeploymentPlan(plan.id);
    return;
  }
  plan.updatedAt = new Date().toISOString();
  syncSharedDefendedAssetsStorage();
  renderDeploymentEditor();
  renderDeploymentList();
  syncDefenseJsonView();
  renderCanvas();
  renderDeploymentMap();
  setDeploymentStatus(`"${plan.regionName}" içindeki atama silindi.`, "info");
}

function getScenarioThreatDirection() {
  return normalizeThreatDirection(state.scenarioThreatDirection);
}

function syncDefenseJsonView() {
  const hasAssets = getAllProtectedAssets().length > 0;
  const hasDeployments = state.deployments.length > 0;
  const scenarioName = String(refs.defenseScenarioName.value || "").trim() || "Birlesik Senaryo";
  const summaryHtml = getJsonScenarioSummaryHtml();

  refs.downloadDefenseJsonBtn.disabled = !hasAssets || !hasDeployments;

  if (!hasAssets) {
    refs.defenseJsonOutput.value = "";
    refs.jsonStatus.innerHTML = `${summaryHtml}<br>Once en az bir korunacak varlik veya EIRS kaydi olusturun.`;
    refs.jsonStatus.className = "status warn";
    return;
  }

  if (!hasDeployments) {
    refs.defenseJsonOutput.value = "";
    refs.jsonStatus.innerHTML = `${summaryHtml}<br>Once en az bir konuslandirma plani kaydedin.`;
    refs.jsonStatus.className = "status warn";
    return;
  }

  const payload = buildUnifiedScenarioExport(scenarioName);
  refs.defenseJsonOutput.value = JSON.stringify(payload, null, 2);
  refs.jsonStatus.innerHTML = `${summaryHtml}<br>JSON ve PDF hazir. Senaryo ismini guncelleyebilir veya dogrudan indirebilirsiniz.`;
  refs.jsonStatus.className = "status ok";
}

function getJsonScenarioSummaryHtml() {
  const protectedIds = state.savedRegions.map((item) => item.id);
  const eirsIds = state.savedEirs.map((item) => item.id);
  const hssPlanIds = state.deployments.map((item) => item.id);
  const threatSummary = getThreatScenarioSummary();

  const lines = [
    `Korunacak Varlik: ${protectedIds.length} (${formatIdList(protectedIds)})`,
    `EIRS: ${eirsIds.length} (${formatIdList(eirsIds)})`,
    `HSS: ${getTotalDeployedHssUnitCount()} (${formatIdList(hssPlanIds)})`,
    `Tehdit - Platform: ${threatSummary.platformOnly.length} (${formatIdList(threatSummary.platformOnly)})`,
    `Tehdit - Payloadlu Platform: ${threatSummary.payloadPlatforms.length} (${formatPayloadPlatformList(threatSummary.payloadPlatforms)})`,
    `Tehdit - Balistik: ${threatSummary.ballistic.length} (${formatIdList(threatSummary.ballistic)})`
  ];

  return lines.join("<br>");
}

function getTotalDeployedHssUnitCount() {
  let total = 0;
  for (const plan of state.deployments) {
    const systems = Array.isArray(plan?.systems) ? plan.systems : [];
    for (const system of systems) {
      total += Math.max(0, Number(system?.count) || 0);
    }
  }
  return total;
}

function getThreatScenarioSummary() {
  try {
    const summary = refs.threatPlanningFrame?.contentWindow?.requestThreatScenarioSummary?.();
    if (summary && typeof summary === "object") {
      const platformOnly = Array.isArray(summary.platformOnly) ? summary.platformOnly : [];
      const payloadPlatforms = Array.isArray(summary.payloadPlatforms) ? summary.payloadPlatforms : [];
      const ballistic = Array.isArray(summary.ballistic) ? summary.ballistic : [];
      return {
        platformOnly,
        payloadPlatforms,
        ballistic,
        total: Math.max(0, Number(summary.total) || (platformOnly.length + payloadPlatforms.length + ballistic.length))
      };
    }
  } catch (_err) {
    // Ignore iframe bridge errors.
  }
  return { platformOnly: [], payloadPlatforms: [], ballistic: [], total: 0 };
}

function getThreatScenarioPayload() {
  try {
    const scenario = refs.threatPlanningFrame?.contentWindow?.requestThreatScenario?.();
    if (scenario && typeof scenario === "object" && !Array.isArray(scenario)) {
      return scenario;
    }
  } catch (_err) {
    // Ignore iframe bridge errors.
  }
  try {
    const exportScenario = refs.threatPlanningFrame?.contentWindow?.requestThreatScenarioForExport?.();
    if (exportScenario && typeof exportScenario === "object" && !Array.isArray(exportScenario)) {
      return exportScenario;
    }
  } catch (_err) {
    // Ignore iframe bridge errors.
  }
  try {
    const importedRaw = window.sessionStorage.getItem(EDIT_THREAT_IMPORT_KEY);
    if (importedRaw) {
      const importedScenario = JSON.parse(importedRaw);
      if (importedScenario && typeof importedScenario === "object" && !Array.isArray(importedScenario)) {
        return importedScenario;
      }
    }
  } catch (_err) {
    // Ignore fallback storage errors.
  }
  return null;
}

function formatIdList(ids) {
  return ids.length ? ids.join(", ") : "-";
}

function formatPayloadPlatformList(items) {
  if (!items.length) {
    return "-";
  }
  return items
    .map((item) => `${item.id}:${Math.max(0, Number(item.payloadCount) || 0)} payload`)
    .join(", ");
}

function exportDefenseScenario() {
  if (!getAllProtectedAssets().length) {
    setDeploymentStatus("Dışa aktarım için önce en az bir korunacak varlık veya EİRS kaydı oluşturun.", "warn");
    return;
  }
  if (!state.deployments.length) {
    setDeploymentStatus("Dışa aktarım için önce en az bir konuşlandırma planı kaydedin.", "warn");
    return;
  }

  const scenarioName = String(refs.defenseScenarioName.value || "").trim();
  if (!scenarioName) {
    setDeploymentStatus("Senaryo adı boş bırakılamaz.", "warn");
    refs.jsonStatus.textContent = "Senaryo adı boş bırakılamaz.";
    refs.jsonStatus.className = "status warn";
    return;
  }

  const payload = buildUnifiedScenarioExport(scenarioName);
  const baseFilename = `${sanitizeFilename(scenarioName) || "msu_senaryo"}`;
  const jsonFilename = `${baseFilename}.json`;
  const pdfFilename = `${baseFilename}.pdf`;
  refs.jsonStatus.textContent = `JSON indiriliyor: ${jsonFilename}`;
  refs.jsonStatus.className = "status ok";

  Promise.resolve()
    .then(() => downloadJsonFile(payload, jsonFilename))
    .then(() => waitMs(300))
    .then(() => downloadScenarioPdfFile(payload, pdfFilename))
    .then(() => {
      setDeploymentStatus(`Senaryo JSON ve PDF olarak dışa aktarıldı: ${jsonFilename}, ${pdfFilename}`, "info");
      refs.jsonStatus.textContent = `JSON ve PDF indirildi: ${jsonFilename}, ${pdfFilename}`;
      refs.jsonStatus.className = "status ok";
    })
    .catch((error) => {
      console.error("PDF export failed", error);
      setDeploymentStatus(`Senaryo JSON olarak dışa aktarıldı ancak PDF üretilemedi: ${jsonFilename}`, "warn");
      refs.jsonStatus.textContent = `JSON indirildi: ${jsonFilename} | PDF üretilemedi.`;
      refs.jsonStatus.className = "status warn";
    });
}

window.syncDefenseJsonView = syncDefenseJsonView;

function renderDeploymentList() {
  refs.deploymentList.innerHTML = "";

  if (state.deployments.length === 0) {
    refs.deploymentEmpty.style.display = "block";
    return;
  }

  refs.deploymentEmpty.style.display = "none";

  for (const plan of state.deployments) {
    const item = document.createElement("div");
    item.className = "deployment-item";

    const info = document.createElement("div");
    const visibilityRow = document.createElement("div");
    visibilityRow.style.display = "flex";
    visibilityRow.style.alignItems = "center";
    visibilityRow.style.gap = "8px";
    visibilityRow.style.marginBottom = "2px";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = isDeploymentPlanVisible(plan.id);
    check.style.width = "16px";
    check.style.height = "16px";
    check.style.accentColor = "#46bf8f";
    check.title = "Haritada göster";
    check.addEventListener("change", () => {
      setDeploymentPlanVisibility(plan.id, check.checked);
    });

    const strong = document.createElement("strong");
    strong.textContent = `${plan.id} - ${plan.regionName}`;
    visibilityRow.append(check, strong);

    const small = document.createElement("small");
    const list = plan.systems.map(formatDeploymentAssignmentSummary).join(", ");
    small.textContent = `${list || "Sistem seçimi yok"} | ${check.checked ? "Gösteriliyor" : "Gizli"}`;

    info.append(visibilityRow, small);

    const actions = document.createElement("div");
    actions.className = "deployment-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost";
    editBtn.textContent = "Düzenle";
    editBtn.addEventListener("click", () => {
      state.selectedDeploymentRegionId = plan.regionId;
      requestTab("deployment");
      renderDeploymentEditor();
      renderDeploymentMap();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "warn";
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => {
      removeDeploymentPlan(plan.id);
    });

    actions.append(editBtn, deleteBtn);
    item.append(info, actions);
    refs.deploymentList.append(item);
  }
}

function buildUnifiedScenarioExport(scenarioName = "MSÜ Senaryo Plani") {
  const scenarioId = `DEF-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
  const usedSystemCodes = new Set();
  const threatScenario = getThreatScenarioPayload();
  const deploymentPlans = state.deployments.map((plan) => ({
    id: plan.id,
    protectedAssetId: plan.regionId,
    threatDirection: getScenarioThreatDirection(),
    assignments: plan.systems
      .filter((item) => Number(item.count) > 0)
      .map((item) => {
        usedSystemCodes.add(item.code);
        const ffsLoadout = getAssignmentFfsLoadout(item.code, item);
        const ffsMunitionCodes = getAssignmentMunitionCodes(item.code, item);
        const assignmentMunitionCode = String(ffsMunitionCodes[0] || item?.munitionCode || getPreferredMunitionCode(item.code, item)).trim();
        return {
          id: String(item?.id || "").trim(),
          systemCode: item.code,
          munitionCode: assignmentMunitionCode,
          ffsLoadout,
          ffsMunitionCodes,
          count: Math.max(0, Math.floor(Number(item.count) || 0)),
          ffsCountPerUnit: Math.max(1, Math.floor(Number(item.ffsCountPerUnit) || 1)),
          totalReadyMissilePerUnit: Math.max(0, Math.floor(Number(item.totalReadyMissilePerUnit) || 0))
        };
      })
  }));

  const protectedAssets = getAllProtectedAssets().map((region) => buildProtectedAssetExport(region));
  const systemCatalog = Array.from(usedSystemCodes)
    .map((code) => buildSystemCatalogExport(code))
    .filter(Boolean);

  const usedMunitionCodes = new Set();
  for (const plan of deploymentPlans) {
    const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
    for (const assignment of assignments) {
      const munitionCodes = Array.isArray(assignment?.ffsMunitionCodes) && assignment.ffsMunitionCodes.length
        ? assignment.ffsMunitionCodes
        : [assignment?.munitionCode];
      for (const munitionCode of munitionCodes) {
        const code = String(munitionCode || "").trim();
        if (code) {
          usedMunitionCodes.add(code);
        }
      }
    }
  }

  const munitionCatalog = Array.from(usedMunitionCodes)
    .map((code) => buildMunitionCatalogExport(code))
    .filter(Boolean);

  const deployedUnits = [];
  for (const plan of state.deployments) {
    const preview = buildDeploymentPreviewByPlanId(plan.id);
    if (!preview) {
      continue;
    }
    for (const unit of preview.units) {
      deployedUnits.push(buildDeployedUnitExport(unit));
    }
  }

  return {
    scenarioId,
    scenarioName,
    scenarioThreatDirection: getScenarioThreatDirection(),
    referenceFrame: {
      origin: { x: 0, y: 0 },
      distanceUnit: "m",
      altitudeUnit: "m",
      speedUnit: "m/s",
      angleUnit: "deg",
      angleZero: "true_north",
      positiveAngleDirection: "clockwise"
    },
    protectedAssets,
    systemCatalog,
    munitionCatalog,
    deploymentPlans,
    deployedUnits,
    threatScenario,
    notes: "Tek senaryo cikti dosyasi savunma ve tehdit planlama verilerini birlikte tasir."
  };
}

function buildProtectedAssetExport(region) {
  const isEirs = String(region?.id || "").trim().toUpperCase().startsWith("E");
  const commonFields = {
    id: region.id,
    name: region.name,
    HVA_value: Math.max(1, Math.min(10, Math.round(numberOrZero(region.hvaValue) || 1))),
    ...(isEirs
      ? {
          assetClass: "eirsRadar",
          technical: buildEirsTechnicalExport()
        }
      : {})
  };

  if (region.type === "point") {
    const point = region.points[0] || { x: 0, y: 0 };
    return {
      ...commonFields,
      defenseType: "point",
      geometry: {
        type: "Point",
        coordinates: {
          x: Math.round(numberOrZero(point.x)),
          y: Math.round(numberOrZero(point.y))
        }
      }
    };
  }

  return {
    ...commonFields,
    defenseType: "area",
    geometry: {
      type: "Polygon",
      coordinates: region.points.map((point) => ({
        x: Math.round(numberOrZero(point.x)),
        y: Math.round(numberOrZero(point.y))
      }))
    }
  };
}

function buildEirsTechnicalExport() {
  const source = state.systemCatalogByCode["HSS-U"] || state.systemCatalogByCode["HSS-F"] || {};
  const radar = source?.technical?.radar || {};
  return {
    radar: {
      minTrackRangeM: Math.round(numberOrZero(radar?.trackRange?.minTrackRangeM)),
      illumCapacity: 0,
      setupTimeIllTrackSec: Math.max(0, Math.round(numberOrZero(radar?.setupTimeIllTrackSec))),
      trackRangeKm: numberOrZero(radar?.trackRange?.rangeKm || getEirsRadarRangeMeters() / 1000),
      azimuthDeg: {
        min: numberOrZero(radar?.azimuthDeg?.min),
        max: numberOrZero(radar?.azimuthDeg?.max)
      },
      elevationDeg: {
        min: numberOrZero(radar?.elevationDeg?.min),
        max: numberOrZero(radar?.elevationDeg?.max)
      }
    }
  };
}

function buildSystemCatalogExport(code) {
  const item = state.systemCatalogByCode[code];
  if (!item) {
    return null;
  }
  const criteria = state.criteriaByCode[code] || {};
  const componentSpec = getSystemComponentSpec(code);
  const pair = normalizePairConstraints(criteria.pairConstraints);
  const compatibleMunitionCodes = getCompatibleMunitionsForSystem(code).map((munition) => munition.code);

  return {
    code,
    role: item.role || "",
    components: {
      radarCount: componentSpec.radarCount,
      radarHVAValue: componentSpec.radarHVAValue,
      kkmCount: componentSpec.kkmCount,
      akrCount: componentSpec.akrCount,
      eoCount: componentSpec.eoCount,
      ffsCount: componentSpec.ffsCount,
      ffsMinCount: componentSpec.ffsMinCount,
      ffsMaxCount: componentSpec.ffsMaxCount,
      missilePerFfs: componentSpec.missilePerFfs,
      totalReadyMissile: componentSpec.totalReadyMissile
    },
    technical: {
      radar: {
        minTrackRangeM: Math.round(numberOrZero(item?.technical?.radar?.trackRange?.minTrackRangeM)),
        illumCapacity: Math.max(0, Math.round(numberOrZero(item?.technical?.radar?.illumCapacity))),
        setupTimeIllTrackSec: Math.max(0, Math.round(numberOrZero(item?.technical?.radar?.setupTimeIllTrackSec))),
        trackRangeKm: numberOrZero(item?.technical?.radar?.trackRange?.rangeKm),
        azimuthDeg: {
          min: numberOrZero(item?.technical?.radar?.azimuthDeg?.min),
          max: numberOrZero(item?.technical?.radar?.azimuthDeg?.max)
        },
        elevationDeg: {
          min: numberOrZero(item?.technical?.radar?.elevationDeg?.min),
          max: numberOrZero(item?.technical?.radar?.elevationDeg?.max)
        }
      },
      ...(item?.technical?.akr
        ? {
            akr: {
              minTrackRangeM: Math.round(numberOrZero(item?.technical?.akr?.minTrackRangeM)),
              illumCapacity: Math.max(0, Math.round(numberOrZero(item?.technical?.akr?.illumCapacity))),
              setupTimeIllTrackSec: Math.max(0, Math.round(numberOrZero(item?.technical?.akr?.setupTimeIllTrackSec))),
              trackRangeKm: numberOrZero(item?.technical?.akr?.trackRangeKm),
              azimuthDeg: {
                min: numberOrZero(item?.technical?.akr?.azimuthDeg?.min),
                max: numberOrZero(item?.technical?.akr?.azimuthDeg?.max)
              },
              elevationDeg: {
                min: numberOrZero(item?.technical?.akr?.elevationDeg?.min),
                max: numberOrZero(item?.technical?.akr?.elevationDeg?.max)
              }
            }
          }
        : {}),
      engagement: {
        effectiveRangeKm: numberOrZero(item?.technical?.engagement?.effectiveRangeKm),
        effectiveAltitudeKm: numberOrZero(item?.technical?.engagement?.effectiveAltitudeKm)
      }
    },
    interceptor: {
      primaryMunitionCode: String(item?.interceptor?.primaryMunitionCode || item?.compatibleMunitions?.[0] || "").trim(),
      compatibleMunitionCodes,
      reloadTimeSec: Math.round(numberOrZero(item?.interceptor?.reloadTimeMinPerMissile) * 60),
      weaponSetupTimeSec: Math.round(numberOrZero(item?.interceptor?.weaponSetupTimeSec)),
      weaponLaunchDelaySec: Math.round(numberOrZero(item?.interceptor?.weaponLaunchDelaySec))
    },
    deploymentConstraints: {
      recommendedSystemCount: Math.max(0, Math.floor(numberOrZero(criteria.recommendedCount))),
      centerDistanceM: {
        min: Math.round(numberOrZero(criteria.centerMinKm) * 1000),
        max: Math.round(numberOrZero(criteria.centerMaxKm) * 1000)
      },
      pairDistanceM: {
        radarKkm: {
          min: Math.round(numberOrZero(pair.radarKkm.min)),
          max: Math.round(numberOrZero(pair.radarKkm.max))
        },
        kkmFfs: {
          min: Math.round(numberOrZero(pair.kkmFfs.min)),
          max: Math.round(numberOrZero(pair.kkmFfs.max))
        },
        radarAkr: {
          min: Math.round(numberOrZero(pair.radarAkr.min)),
          max: Math.round(numberOrZero(pair.radarAkr.max))
        },
        kkmAkr: {
          min: Math.round(numberOrZero(pair.kkmAkr.min)),
          max: Math.round(numberOrZero(pair.kkmAkr.max))
        },
        akrFfs: {
          min: Math.round(numberOrZero(pair.akrFfs.min)),
          max: Math.round(numberOrZero(pair.akrFfs.max))
        },
        radarFfs: {
          min: Math.round(numberOrZero(pair.radarFfs.min)),
          max: Math.round(numberOrZero(pair.radarFfs.max))
        },
        radarEo: {
          min: Math.round(numberOrZero(pair.radarEo.min)),
          max: Math.round(numberOrZero(pair.radarEo.max))
        },
        kkmEo: {
          min: Math.round(numberOrZero(pair.kkmEo.min)),
          max: Math.round(numberOrZero(pair.kkmEo.max))
        },
        eoFfs: {
          min: Math.round(numberOrZero(pair.eoFfs.min)),
          max: Math.round(numberOrZero(pair.eoFfs.max))
        },
        ffsFfs: {
          min: Math.round(numberOrZero(pair.ffsFfs.min)),
          max: Math.round(numberOrZero(pair.ffsFfs.max))
        }
      }
    }
  };
}

function buildMunitionCatalogExport(code) {
  const item = state.munitionCatalogByCode[code];
  if (!item) {
    return null;
  }
  const componentSpec = getSystemComponentSpec(item.systemCode);
  return {
    code: item.code,
    name: item.name || item.code,
    systemCode: item.systemCode || "",
    illReq: Math.max(0, Math.min(1, Math.round(numberOrZero(item?.illReq)))),
    kinematics: {
      speedMps: numberOrZero(item?.kinematics?.speedMps)
    },
    effectiveness: {
      pSuccess: numberOrZero(item?.effectiveness?.pSuccess)
    },
    loadout: {
      missilePerFfs: Math.max(0, Math.floor(numberOrZero(item?.loadout?.missilePerFfs ?? componentSpec?.missilePerFfs)))
    },
    engagementEnvelope: {
      minRangeM: Math.round(numberOrZero(item?.engagementEnvelope?.minRangeKm) * 1000),
      maxRangeM: Math.round(numberOrZero(item?.engagementEnvelope?.maxRangeKm) * 1000),
      maxEffRangeM: Math.round(numberOrZero(item?.engagementEnvelope?.maxEffRangeKm) * 1000),
      minAltitudeM: Math.round(numberOrZero(item?.engagementEnvelope?.minAltitudeKm) * 1000),
      maxAltitudeM: Math.round(numberOrZero(item?.engagementEnvelope?.maxAltitudeKm) * 1000)
    }
  };
}

function buildDeployedUnitExport(unit) {
  const ffsLoadout = Array.isArray(unit?.ffsLoadout) && unit.ffsLoadout.length
    ? unit.ffsLoadout
    : getUnitFfsLoadout(
        unit.code,
        unit.assignment || unit,
        unit.assignmentUnitIndex,
        unit.componentSpec?.ffsCount
      );
  const ffsMunitionCodes = Array.isArray(unit?.ffsMunitionCodes) && unit.ffsMunitionCodes.length
    ? unit.ffsMunitionCodes
    : ffsLoadout.map((row) => row.munitionCode);
  const munitionCode = String(ffsMunitionCodes[0] || unit.munitionCode || getPreferredMunitionCode(unit.code, unit.assignment) || "").trim();
  const assignmentToken = sanitizeSystemCode(unit.assignmentId || munitionCode || "ASSIGN");
  const unitId = `${unit.planId}_${sanitizeSystemCode(unit.code)}_${assignmentToken}${String(unit.sequence).padStart(2, "0")}`;
  const radarHvaValue = Math.max(1, Math.min(10, Math.round(numberOrZero(unit.componentSpec?.radarHVAValue) || 1)));
  const akrBlindSectors = normalizeBlindSectors(
    unit.components.ffs.flatMap((item) => normalizeBlindSectors(item?.blindSectors))
  );

  return {
    id: unitId,
    planId: unit.planId,
    assignmentId: String(unit.assignmentId || ""),
    assignmentUnitIndex: Math.max(0, Math.floor(Number(unit.assignmentUnitIndex) || 0)),
    protectedAssetId: unit.regionId,
    systemCode: unit.code,
    munitionCode,
    ffsLoadout,
    ffsMunitionCodes,
    sequence: unit.sequence,
    components: {
      radar: {
        id: `${unitId}.Radar`,
        position: {
          x: Math.round(numberOrZero(unit.components.radar.x)),
          y: Math.round(numberOrZero(unit.components.radar.y))
        },
        HVA_value: radarHvaValue,
        blindSectors: normalizeBlindSectors(unit.components.radar.blindSectors)
      },
      kkm: {
        id: `${unitId}.KKM`,
        position: {
          x: Math.round(numberOrZero(unit.components.kkm.x)),
          y: Math.round(numberOrZero(unit.components.kkm.y))
        }
      },
      ...(unit.components.akr
        ? {
            akr: {
              id: `${unitId}.AKR`,
              position: {
                x: Math.round(numberOrZero(unit.components.akr.x)),
                y: Math.round(numberOrZero(unit.components.akr.y))
              },
              HVA_value: radarHvaValue,
              blindSectors: akrBlindSectors
            }
          }
        : {}),
      ...(unit.components.eo
        ? {
            eo: {
              id: `${unitId}.EO`,
              position: {
                x: Math.round(numberOrZero(unit.components.eo.x)),
                y: Math.round(numberOrZero(unit.components.eo.y))
              }
            }
          }
        : {}),
      ffs: unit.components.ffs.map((item, index) => ({
        id: `${unitId}.FFS${index + 1}`,
        munitionCode: String(ffsMunitionCodes[index] || munitionCode || "").trim(),
        missileCount: Math.max(0, Math.floor(Number(ffsLoadout[index]?.missileCount) || 0)),
        position: {
          x: Math.round(numberOrZero(item.x)),
          y: Math.round(numberOrZero(item.y))
        },
        blindSectors: normalizeBlindSectors(item.blindSectors)
      }))
    }
  };
}

function isDeploymentPlanVisible(planId) {
  return state.visibleDeploymentPlanIds.includes(planId);
}

function setDeploymentPlanVisibility(planId, visible) {
  const exists = isDeploymentPlanVisible(planId);
  if (visible && !exists) {
    state.visibleDeploymentPlanIds.push(planId);
  }
  if (!visible && exists) {
    state.visibleDeploymentPlanIds = state.visibleDeploymentPlanIds.filter((id) => id !== planId);
  }
  state.deploymentView.selectedUnitKey = null;
  renderDeploymentList();
  renderCanvas();
  renderDeploymentMap();
}

function removeDeploymentPlan(planId) {
  const plan = state.deployments.find((p) => p.id === planId);
  state.deployments = state.deployments.filter((p) => p.id !== planId);
  state.visibleDeploymentPlanIds = state.visibleDeploymentPlanIds.filter((id) => id !== planId);
  purgeComponentLayoutsByPlanIds([planId]);
  state.deploymentView.selectedUnitKey = null;
  if (plan?.regionId) {
    delete state.deploymentDraftByRegion[plan.regionId];
  }
  setDeploymentStatus("Konuşlandırma planı silindi.", "info");
  if (state.componentEditor.open && state.componentEditor.planId === planId) {
    closeComponentEditor();
  }
  syncSharedDefendedAssetsStorage();
  renderTabs();
  renderDeploymentList();
  syncDefenseJsonView();
  renderCanvas();
  renderDeploymentMap();
}

function purgeComponentLayoutsByPlanIds(planIds) {
  if (!planIds?.length) {
    return;
  }
  const next = {};
  for (const [key, value] of Object.entries(state.componentLayoutsByUnitKey)) {
    const keep = !planIds.some((pid) => key.startsWith(`${pid}:`));
    if (keep) {
      next[key] = value;
    }
  }
  state.componentLayoutsByUnitKey = next;
}

function purgeComponentLayoutsByAssignmentIds(assignmentIds) {
  if (!assignmentIds?.length) {
    return;
  }
  const next = {};
  for (const [key, value] of Object.entries(state.componentLayoutsByUnitKey)) {
    const keep = !assignmentIds.some((assignmentId) => key.includes(`:${assignmentId}:`));
    if (keep) {
      next[key] = value;
    }
  }
  state.componentLayoutsByUnitKey = next;
}

function getOrCreateComponentLayout(unitKey, radarBase, center, constraints, componentSpec = null) {
  const defaultLayout = createDefaultComponentLayout(radarBase, center, constraints, componentSpec);
  if (!state.componentLayoutsByUnitKey[unitKey]) {
    state.componentLayoutsByUnitKey[unitKey] = defaultLayout;
  } else {
    // Keep explicit user edits at their absolute coordinates instead of snapping
    // them back to the auto-generated placement every time the preview refreshes.
    state.componentLayoutsByUnitKey[unitKey] = normalizeComponentLayout(
      state.componentLayoutsByUnitKey[unitKey],
      componentSpec,
      defaultLayout
    );
  }
  state.componentLayoutsByUnitKey[unitKey] = normalizeComponentLayout(
    state.componentLayoutsByUnitKey[unitKey],
    componentSpec,
    defaultLayout
  );
  return deepClone(state.componentLayoutsByUnitKey[unitKey]);
}

function createDefaultComponentLayout(radarBase, center, constraints, componentSpec = null) {
  const radar = { x: radarBase.x, y: radarBase.y, blindSectors: [] };
  const c = normalizePairConstraints(constraints);
  const spec = componentSpec || { akrCount: 0, eoCount: 0, ffsCount: 3 };

  const outward = normalizeVector({
    x: radar.x - center.x,
    y: radar.y - center.y
  });
  const forward = outward.x === 0 && outward.y === 0 ? { x: 1, y: 0 } : outward;
  const left = { x: -forward.y, y: forward.x };

  const kkmDist = getDefaultRearDistance(c.radarKkm);
  const kkm = {
    x: radar.x - forward.x * kkmDist,
    y: radar.y - forward.y * kkmDist,
    blindSectors: []
  };

  const eo = spec.eoCount > 0
    ? { x: 0, y: 0, blindSectors: [] }
    : null;

  const ffsCount = Math.max(1, Math.floor(numberOrZero(spec.ffsCount) || 1));
  const frontDistance = getDefaultFrontDistance(c.radarFfs);
  const frontCenter = {
    x: radar.x + forward.x * frontDistance,
    y: radar.y + forward.y * frontDistance
  };
  const akrDistance = spec.akrCount > 0
    ? resolveAuxiliaryAxisDistance(frontDistance, kkmDist, c.radarAkr, c.kkmAkr, c.akrFfs)
    : null;
  const eoDistance = eo
    ? resolveAuxiliaryAxisDistance(frontDistance, kkmDist, c.radarEo, c.kkmEo, c.eoFfs)
    : null;
  const spacing = getDefaultFfsSpacing(ffsCount, frontDistance, kkmDist, c, {
    akrDistance,
    eoDistance
  });
  const ffs = getLineOffsets(ffsCount, spacing).map((offset) => ({
    x: frontCenter.x + left.x * offset,
    y: frontCenter.y + left.y * offset,
    blindSectors: []
  }));

  const akr = akrDistance !== null
    ? {
        x: radar.x + forward.x * akrDistance,
        y: radar.y + forward.y * akrDistance,
        blindSectors: []
      }
    : null;

  if (eoDistance !== null) {
    eo.x = radar.x + forward.x * eoDistance;
    eo.y = radar.y + forward.y * eoDistance;
  }

  return { radar, kkm, akr, eo, ffs };
}

function getDefaultRearDistance(rule) {
  const min = numberOrNull(rule?.min);
  const max = numberOrNull(rule?.max);
  if (min !== null) {
    return Math.max(0, min);
  }
  if (max !== null) {
    return Math.max(0, max);
  }
  return 0;
}

function getDefaultFrontDistance(rule) {
  const min = numberOrNull(rule?.min);
  const max = numberOrNull(rule?.max);
  if (max !== null && max > 0) {
    return max / 2;
  }
  if (min !== null && min > 0) {
    return min;
  }
  return 0;
}

function getLineOffsets(count, spacing) {
  if (count <= 1 || spacing <= 0) {
    return Array.from({ length: count }, () => 0);
  }
  const centerIndex = (count - 1) / 2;
  return Array.from({ length: count }, (_, index) => (index - centerIndex) * spacing);
}

function getDefaultFfsSpacing(count, frontDistance, rearDistance, constraints, options = {}) {
  if (count <= 1) {
    return 0;
  }

  const pairMin = Math.max(0, numberOrZero(constraints.ffsFfs?.min));
  const pairMax = numberOrNull(constraints.ffsFfs?.max);
  const radarMax = numberOrNull(constraints.radarFfs?.max);
  const kkmMax = numberOrNull(constraints.kkmFfs?.max);
  const outerMultiplier = Math.max(1, (count - 1) / 2);

  const byRadar = radarMax !== null
    ? Math.sqrt(Math.max(0, radarMax ** 2 - frontDistance ** 2)) / outerMultiplier
    : Number.POSITIVE_INFINITY;
  const byKkm = kkmMax !== null
    ? Math.sqrt(Math.max(0, kkmMax ** 2 - (frontDistance + rearDistance) ** 2)) / outerMultiplier
    : Number.POSITIVE_INFINITY;
  const auxiliarySpacingCaps = [
    getAuxiliaryFfsSpacingMax(frontDistance, options.akrDistance, constraints.akrFfs, outerMultiplier),
    getAuxiliaryFfsSpacingMax(frontDistance, options.eoDistance, constraints.eoFfs, outerMultiplier)
  ];

  const maxSpacing = Math.min(
    pairMax !== null ? pairMax : Number.POSITIVE_INFINITY,
    byRadar,
    byKkm,
    ...auxiliarySpacingCaps
  );

  if (!Number.isFinite(maxSpacing)) {
    return pairMax !== null ? Math.max(pairMin, pairMax / 2) : pairMin;
  }

  const targetSpacing = pairMax !== null ? pairMax / 2 : pairMin;
  return clampNumber(targetSpacing, pairMin, Math.max(pairMin, maxSpacing));
}

function getAuxiliaryFfsSpacingMax(frontDistance, auxiliaryDistance, rule, outerMultiplier) {
  if (!Number.isFinite(auxiliaryDistance) || outerMultiplier <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const maxDistance = numberOrNull(rule?.max);
  if (maxDistance === null) {
    return Number.POSITIVE_INFINITY;
  }

  const axisDistance = Math.abs(frontDistance - auxiliaryDistance);
  if (axisDistance >= maxDistance) {
    return 0;
  }

  return Math.sqrt(Math.max(0, maxDistance ** 2 - axisDistance ** 2)) / outerMultiplier;
}

function resolveAuxiliaryAxisDistance(frontDistance, rearDistance, radarRule, kkmRule, ffsRule) {
  let minDistance = 0;
  let maxDistance = Math.max(0, frontDistance);

  const radarMin = numberOrNull(radarRule?.min);
  const radarMax = numberOrNull(radarRule?.max);
  const kkmMin = numberOrNull(kkmRule?.min);
  const kkmMax = numberOrNull(kkmRule?.max);
  const ffsMin = numberOrNull(ffsRule?.min);
  const ffsMax = numberOrNull(ffsRule?.max);

  if (radarMin !== null) {
    minDistance = Math.max(minDistance, radarMin);
  }
  if (radarMax !== null) {
    maxDistance = Math.min(maxDistance, radarMax);
  }
  if (kkmMin !== null) {
    minDistance = Math.max(minDistance, kkmMin - rearDistance);
  }
  if (kkmMax !== null) {
    maxDistance = Math.min(maxDistance, kkmMax - rearDistance);
  }
  if (ffsMin !== null) {
    maxDistance = Math.min(maxDistance, frontDistance - ffsMin);
  }
  if (ffsMax !== null) {
    minDistance = Math.max(minDistance, frontDistance - ffsMax);
  }

  const target = frontDistance / 2;
  if (maxDistance < minDistance) {
    return clampNumber(target, 0, Math.max(0, frontDistance));
  }
  return clampNumber(target, minDistance, maxDistance);
}

function normalizeComponentLayout(layout, componentSpec = null, defaultLayout = null) {
  const next = layout || {};
  const fallback = defaultLayout || {
    radar: { x: numberOrZero(next.radar?.x), y: numberOrZero(next.radar?.y), blindSectors: [] },
    kkm: { x: numberOrZero(next.kkm?.x), y: numberOrZero(next.kkm?.y), blindSectors: [] },
    akr: next.akr ? { x: numberOrZero(next.akr?.x), y: numberOrZero(next.akr?.y), blindSectors: [] } : null,
    eo: next.eo ? { x: numberOrZero(next.eo?.x), y: numberOrZero(next.eo?.y), blindSectors: [] } : null,
    ffs: Array.isArray(next.ffs) ? next.ffs : []
  };
  const desiredFfsCount = Math.max(
    1,
    Math.floor(numberOrZero(componentSpec?.ffsCount) || fallback.ffs.length || 1)
  );
  const sourceFfs = Array.isArray(next.ffs) ? next.ffs : [];
  const normalizedFfs = [];

  for (let index = 0; index < desiredFfsCount; index += 1) {
    const source = sourceFfs[index] || fallback.ffs[index] || fallback.ffs[fallback.ffs.length - 1] || fallback.radar;
    normalizedFfs.push({
      x: numberOrZero(source?.x),
      y: numberOrZero(source?.y),
      blindSectors: normalizeBlindSectors(source?.blindSectors)
    });
  }

  return {
    radar: {
      x: numberOrZero(next.radar?.x ?? fallback.radar?.x),
      y: numberOrZero(next.radar?.y ?? fallback.radar?.y),
      blindSectors: normalizeBlindSectors(next.radar?.blindSectors ?? fallback.radar?.blindSectors)
    },
    kkm: {
      x: numberOrZero(next.kkm?.x ?? fallback.kkm?.x),
      y: numberOrZero(next.kkm?.y ?? fallback.kkm?.y),
      blindSectors: []
    },
    akr: componentSpec?.akrCount > 0 || fallback.akr
      ? {
          x: numberOrZero(next.akr?.x ?? fallback.akr?.x),
          y: numberOrZero(next.akr?.y ?? fallback.akr?.y),
          blindSectors: []
        }
      : null,
    eo: componentSpec?.eoCount > 0 || fallback.eo
      ? {
          x: numberOrZero(next.eo?.x ?? fallback.eo?.x),
          y: numberOrZero(next.eo?.y ?? fallback.eo?.y),
          blindSectors: []
        }
      : null,
    ffs: normalizedFfs
  };
}

function normalizePairConstraints(raw) {
  const c = raw || {};
  return {
    radarKkm: {
      min: numberOrNull(c.radarKkm?.min),
      max: numberOrNull(c.radarKkm?.max)
    },
    radarFfs: {
      min: numberOrNull(c.radarFfs?.min),
      max: numberOrNull(c.radarFfs?.max)
    },
    kkmFfs: {
      min: numberOrNull(c.kkmFfs?.min),
      max: numberOrNull(c.kkmFfs?.max)
    },
    radarAkr: {
      min: numberOrNull(c.radarAkr?.min),
      max: numberOrNull(c.radarAkr?.max)
    },
    kkmAkr: {
      min: numberOrNull(c.kkmAkr?.min),
      max: numberOrNull(c.kkmAkr?.max)
    },
    akrFfs: {
      min: numberOrNull(c.akrFfs?.min),
      max: numberOrNull(c.akrFfs?.max)
    },
    radarEo: {
      min: numberOrNull(c.radarEo?.min),
      max: numberOrNull(c.radarEo?.max)
    },
    kkmEo: {
      min: numberOrNull(c.kkmEo?.min),
      max: numberOrNull(c.kkmEo?.max)
    },
    eoFfs: {
      min: numberOrNull(c.eoFfs?.min),
      max: numberOrNull(c.eoFfs?.max)
    },
    ffsFfs: {
      min: numberOrNull(c.ffsFfs?.min),
      max: numberOrNull(c.ffsFfs?.max)
    }
  };
}

function validateComponentLayout(layout, constraints) {
  const c = normalizePairConstraints(constraints);
  const errors = [];

  const dRadarKkm = distance2D(layout.radar, layout.kkm);
  pushDistanceError(errors, "Radar-KKM", dRadarKkm, c.radarKkm);

  if (layout.akr) {
    pushDistanceError(errors, "Radar-AKR", distance2D(layout.radar, layout.akr), c.radarAkr);
    pushDistanceError(errors, "KKM-AKR", distance2D(layout.kkm, layout.akr), c.kkmAkr);
  }

  if (layout.eo) {
    pushDistanceError(errors, "Radar-EO", distance2D(layout.radar, layout.eo), c.radarEo);
    pushDistanceError(errors, "KKM-EO", distance2D(layout.kkm, layout.eo), c.kkmEo);
  }

  for (let i = 0; i < layout.ffs.length; i += 1) {
    const dRadarFfs = distance2D(layout.radar, layout.ffs[i]);
    pushDistanceError(errors, `Radar-FFS${i + 1}`, dRadarFfs, c.radarFfs);
    const dKkmFfs = distance2D(layout.kkm, layout.ffs[i]);
    pushDistanceError(errors, `KKM-FFS${i + 1}`, dKkmFfs, c.kkmFfs);
    if (layout.akr) {
      pushDistanceError(errors, `AKR-FFS${i + 1}`, distance2D(layout.akr, layout.ffs[i]), c.akrFfs);
    }
    if (layout.eo) {
      pushDistanceError(errors, `EO-FFS${i + 1}`, distance2D(layout.eo, layout.ffs[i]), c.eoFfs);
    }
  }

  for (let i = 0; i < layout.ffs.length; i += 1) {
    for (let j = i + 1; j < layout.ffs.length; j += 1) {
      const d = distance2D(layout.ffs[i], layout.ffs[j]);
      pushDistanceError(errors, `FFS${i + 1}-FFS${j + 1}`, d, c.ffsFfs);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function pushDistanceError(errors, label, distanceM, rule) {
  const min = numberOrNull(rule?.min);
  const max = numberOrNull(rule?.max);
  if (min !== null && distanceM < min - 1e-6) {
    errors.push(`${label} < min (${Math.round(distanceM)}m < ${Math.round(min)}m)`);
    return;
  }
  if (max !== null && distanceM > max + 1e-6) {
    errors.push(`${label} > max (${Math.round(distanceM)}m > ${Math.round(max)}m)`);
  }
}

function openComponentEditor(unit) {
  if (!unit?.key || !unit.components) {
    return;
  }

  state.componentEditor.open = true;
  state.componentEditor.unitKey = unit.key;
  state.componentEditor.planId = unit.planId;
  state.componentEditor.regionName = unit.regionName || "";
  state.componentEditor.systemCode = unit.code;
  state.componentEditor.componentSpec = unit.componentSpec || null;
  state.componentEditor.radarBase = { ...unit.components.radar };
  state.componentEditor.center = unit.center || computeRegionCenter({ type: "point", points: [{ x: unit.x, y: unit.y }] });
  state.componentEditor.constraints = unit.constraints || null;
  state.componentEditor.layout = normalizeComponentLayout(deepClone(unit.components), unit.componentSpec || null);
  state.componentEditor.defaultLayout = normalizeComponentLayout(createDefaultComponentLayout(
    unit.components.radar,
    unit.center || { x: unit.x, y: unit.y },
    unit.constraints || null,
    unit.componentSpec || null
  ), unit.componentSpec || null);
  state.componentEditor.dragTarget = null;
  state.componentEditor.hoverError = "";
  state.componentEditor.blindError = "";
  state.componentEditor.blindTarget = isValidBlindTarget(state.componentEditor.layout, state.componentEditor.blindTarget)
    ? state.componentEditor.blindTarget
    : "radar";
  resetComponentEditorView();

  refs.componentEditorModal.classList.add("open");
  refs.componentEditorModal.setAttribute("aria-hidden", "false");
  refs.componentEditorTitle.textContent = `${unit.planId} | ${unit.code} Bileşen Düzenleme`;
  syncRadarCoordinateInputs();
  syncBlindSectorTargetOptions();
  renderBlindSectorEditor();
  renderComponentEditor();
}

function closeComponentEditor() {
  state.componentEditor.open = false;
  state.componentEditor.dragTarget = null;
  state.componentEditor.componentSpec = null;
  state.componentEditor.blindError = "";
  refs.componentEditorModal.classList.remove("open");
  refs.componentEditorModal.setAttribute("aria-hidden", "true");
}

function saveComponentEditorLayout() {
  if (!state.componentEditor.open || !state.componentEditor.unitKey || !state.componentEditor.layout) {
    return;
  }
  if (state.componentEditor.blindError) {
    refs.componentEditorInfo.textContent = `Kayıt yapılamadı: ${state.componentEditor.blindError}`;
    refs.componentEditorInfo.className = "status warn";
    return;
  }

  const check = validateComponentLayout(state.componentEditor.layout, state.componentEditor.constraints);
  if (!check.valid) {
    refs.componentEditorInfo.textContent = `Kayıt yapılamadı: ${check.errors[0]}`;
    refs.componentEditorInfo.className = "status warn";
    return;
  }

  state.componentLayoutsByUnitKey[state.componentEditor.unitKey] = normalizeComponentLayout(
    deepClone(state.componentEditor.layout),
    state.componentEditor.componentSpec || null
  );
  syncSharedDefendedAssetsStorage();
  refs.componentEditorInfo.textContent = "Bileşen düzeni kaydedildi.";
  refs.componentEditorInfo.className = "status";
  closeComponentEditor();
  renderCanvas();
  renderDeploymentMap();
}

function resetComponentEditorLayout() {
  if (!state.componentEditor.open || !state.componentEditor.defaultLayout) {
    return;
  }
  state.componentEditor.layout = normalizeComponentLayout(
    deepClone(state.componentEditor.defaultLayout),
    state.componentEditor.componentSpec || null
  );
  state.componentEditor.hoverError = "";
  state.componentEditor.blindError = "";
  state.componentEditor.radarBase = { ...state.componentEditor.layout.radar };
  resetComponentEditorView();
  syncRadarCoordinateInputs();
  syncBlindSectorTargetOptions();
  renderBlindSectorEditor();
  renderComponentEditor();
}

function onComponentEditorMouseDown(event) {
  if (!state.componentEditor.open || !state.componentEditor.layout) {
    return;
  }
  const world = screenToEditorWorld(event);
  const hit = hitTestEditorMarker(world, state.componentEditor.layout);
  if (!hit) {
    return;
  }
  state.componentEditor.hoverError = "";
  state.componentEditor.dragTarget = hit;
}

function onComponentEditorMouseMove(event) {
  if (!state.componentEditor.open || !state.componentEditor.layout) {
    return;
  }

  if (!state.componentEditor.dragTarget) {
    return;
  }

  const world = screenToEditorWorld(event);
  const candidate = deepClone(state.componentEditor.layout);
  applyEditorDrag(candidate, state.componentEditor.dragTarget, world);
  if (applyComponentEditorCandidateIfValid(candidate)) {
    syncRadarCoordinateInputs();
  }
  renderComponentEditor();
}

function onComponentEditorMouseUp() {
  if (!state.componentEditor.open) {
    return;
  }
  state.componentEditor.dragTarget = null;
}

function onComponentEditorWheel(event) {
  if (!state.componentEditor.open) {
    return;
  }
  event.preventDefault();
  if (event.deltaY < 0) {
    changeComponentEditorZoom(1.12);
  } else {
    changeComponentEditorZoom(0.89);
  }
}

function changeComponentEditorZoom(multiplier) {
  setComponentEditorZoom(state.componentEditor.viewZoom * multiplier);
}

function setComponentEditorZoom(nextZoom) {
  state.componentEditor.viewZoom = Math.max(0.4, Math.min(4, Number(nextZoom) || 1));
  renderComponentEditor();
}

function nudgeComponentEditorPan(dx, dy) {
  state.componentEditor.panX += dx;
  state.componentEditor.panY += dy;
  renderComponentEditor();
}

function resetComponentEditorView() {
  state.componentEditor.viewZoom = 1;
  state.componentEditor.panX = 0;
  state.componentEditor.panY = 0;
  renderComponentEditor();
}

function applyEditorDrag(layout, dragTarget, point) {
  const rounded = { x: Math.round(point.x), y: Math.round(point.y) };
  if (dragTarget.type === "kkm") {
    layout.kkm = {
      ...layout.kkm,
      ...rounded
    };
    return;
  }
  if (dragTarget.type === "akr" && layout.akr) {
    layout.akr = {
      ...layout.akr,
      ...rounded
    };
    return;
  }
  if (dragTarget.type === "eo" && layout.eo) {
    layout.eo = {
      ...layout.eo,
      ...rounded
    };
    return;
  }
  if (dragTarget.type === "ffs" && Number.isInteger(dragTarget.index) && layout.ffs[dragTarget.index]) {
    layout.ffs[dragTarget.index] = {
      ...layout.ffs[dragTarget.index],
      ...rounded
    };
  }
}

function onRadarCoordinateInputChange() {
  if (!state.componentEditor.open || !state.componentEditor.layout) {
    return;
  }

  const nextX = Number(refs.componentRadarX.value);
  const nextY = Number(refs.componentRadarY.value);
  if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
    refs.componentEditorInfo.textContent = "Radar koordinatı sayısal olmalıdır.";
    refs.componentEditorInfo.className = "status warn";
    return;
  }

  const deltaX = Math.round(nextX) - numberOrZero(state.componentEditor.layout.radar.x);
  const deltaY = Math.round(nextY) - numberOrZero(state.componentEditor.layout.radar.y);
  const shifted = shiftComponentLayout(state.componentEditor.layout, deltaX, deltaY);
  if (!applyComponentEditorCandidateIfValid(shifted)) {
    syncRadarCoordinateInputs();
    renderComponentEditor();
    return;
  }
  state.componentEditor.radarBase = { ...state.componentEditor.layout.radar };
  syncRadarCoordinateInputs();
  renderComponentEditor();
}

function applyComponentEditorCandidateIfValid(candidate) {
  const normalized = normalizeComponentLayout(candidate, state.componentEditor.componentSpec || null);
  const check = validateComponentLayout(normalized, state.componentEditor.constraints);
  if (!check.valid) {
    state.componentEditor.hoverError = "";
    return false;
  }
  state.componentEditor.layout = normalized;
  state.componentEditor.hoverError = "";
  return true;
}

function syncRadarCoordinateInputs() {
  if (!state.componentEditor.layout) {
    refs.componentRadarX.value = "";
    refs.componentRadarY.value = "";
    return;
  }
  refs.componentRadarX.value = String(Math.round(numberOrZero(state.componentEditor.layout.radar.x)));
  refs.componentRadarY.value = String(Math.round(numberOrZero(state.componentEditor.layout.radar.y)));
}

function onBlindSectorTargetChange() {
  state.componentEditor.blindTarget = refs.blindSectorTargetSelect.value || "radar";
  state.componentEditor.blindError = "";
  renderBlindSectorEditor();
  renderComponentEditor();
}

function addBlindSectorRow() {
  if (!state.componentEditor.open || !state.componentEditor.layout) {
    return;
  }
  const sectors = getBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget);
  sectors.push(getNextBlindSectorSeed(sectors));
  setBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget, sectors);
  state.componentEditor.blindError = "";
  renderBlindSectorEditor();
  renderComponentEditor();
}

function onBlindSectorListClick(event) {
  const button = event.target.closest("[data-blind-remove]");
  if (!button || !state.componentEditor.layout) {
    return;
  }
  const index = Number(button.dataset.blindRemove);
  if (!Number.isInteger(index) || index < 0) {
    return;
  }
  const sectors = getBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget)
    .filter((_, itemIndex) => itemIndex !== index);
  setBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget, sectors);
  state.componentEditor.blindError = "";
  renderBlindSectorEditor();
  renderComponentEditor();
}

function onBlindSectorListChange(event) {
  const input = event.target.closest("[data-blind-field]");
  if (!input || !state.componentEditor.layout) {
    return;
  }

  const row = input.closest("[data-blind-row]");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.blindRow);
  if (!Number.isInteger(index) || index < 0) {
    return;
  }

  const startInput = row.querySelector("[data-blind-field='start']");
  const endInput = row.querySelector("[data-blind-field='end']");
  const start = Number(startInput?.value);
  const end = Number(endInput?.value);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    state.componentEditor.blindError = "Kör sektör açıları sayısal olmalıdır.";
    renderComponentEditor();
    return;
  }
  if (start < 0 || start > 360 || end < 0 || end > 360) {
    state.componentEditor.blindError = "Kör sektör açıları 0-360 arasında olmalıdır.";
    renderComponentEditor();
    return;
  }
  if (end <= start) {
    state.componentEditor.blindError = "Bitiş açısı başlangıç açısından büyük olmalıdır.";
    renderComponentEditor();
    return;
  }

  const sectors = getBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget);
  sectors[index] = [start, end];
  setBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget, sectors);
  state.componentEditor.blindError = "";
  renderBlindSectorEditor();
  renderComponentEditor();
}

function syncBlindSectorTargetOptions() {
  if (!state.componentEditor.layout) {
    refs.blindSectorTargetSelect.innerHTML = "";
    return;
  }

  const options = [
    { value: "radar", label: "Radar" },
    ...state.componentEditor.layout.ffs.map((_, index) => ({
      value: `ffs:${index}`,
      label: `FFS${index + 1}`
    }))
  ];

  refs.blindSectorTargetSelect.innerHTML = options
    .map((item) => `<option value="${item.value}">${item.label}</option>`)
    .join("");

  if (!isValidBlindTarget(state.componentEditor.layout, state.componentEditor.blindTarget)) {
    state.componentEditor.blindTarget = "radar";
  }
  refs.blindSectorTargetSelect.value = state.componentEditor.blindTarget;
}

function renderBlindSectorEditor() {
  if (!state.componentEditor.layout) {
    refs.blindSectorList.innerHTML = "";
    return;
  }

  const sectors = getBlindSectorsForTarget(state.componentEditor.layout, state.componentEditor.blindTarget);
  if (!sectors.length) {
    refs.blindSectorList.innerHTML =
      `<div class="blind-empty">Bu bileşen için kör sektör tanımlı değil. İsterseniz yeni bir sektör ekleyin.</div>`;
    return;
  }

  refs.blindSectorList.innerHTML = sectors
    .map((sector, index) => `
      <div class="blind-sector-row" data-blind-row="${index}">
        <div>
          <span class="mini-label">Başlangıç</span>
          <input type="number" min="0" max="360" step="0.1" value="${sector[0]}" data-blind-field="start">
        </div>
        <div>
          <span class="mini-label">Bitiş</span>
          <input type="number" min="0" max="360" step="0.1" value="${sector[1]}" data-blind-field="end">
        </div>
        <button class="warn" type="button" data-blind-remove="${index}">Sil</button>
      </div>
    `)
    .join("");
}

function isValidBlindTarget(layout, target) {
  if (target === "radar") {
    return true;
  }
  const match = /^ffs:(\d+)$/.exec(String(target || ""));
  if (!match) {
    return false;
  }
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 && index < (layout?.ffs?.length || 0);
}

function getBlindSectorsForTarget(layout, target) {
  if (!layout) {
    return [];
  }
  if (target === "radar") {
    return normalizeBlindSectors(layout.radar?.blindSectors);
  }
  const match = /^ffs:(\d+)$/.exec(String(target || ""));
  if (!match) {
    return [];
  }
  const index = Number(match[1]);
  return normalizeBlindSectors(layout.ffs?.[index]?.blindSectors);
}

function setBlindSectorsForTarget(layout, target, sectors) {
  const normalized = normalizeBlindSectors(sectors);
  if (target === "radar") {
    layout.radar = {
      ...layout.radar,
      blindSectors: normalized
    };
    return;
  }
  const match = /^ffs:(\d+)$/.exec(String(target || ""));
  if (!match) {
    return;
  }
  const index = Number(match[1]);
  if (!layout.ffs?.[index]) {
    return;
  }
  layout.ffs[index] = {
    ...layout.ffs[index],
    blindSectors: normalized
  };
}

function getNextBlindSectorSeed(existingSectors) {
  const sectors = normalizeBlindSectors(existingSectors);
  const width = 10;
  const gap = 5;
  let cursor = 0;

  for (const [start, end] of sectors) {
    if (start - cursor >= width) {
      return [cursor, cursor + width];
    }
    cursor = Math.min(360, end + gap);
  }

  if (cursor + width <= 360) {
    return [cursor, cursor + width];
  }

  return [350, 360];
}

function hitTestEditorMarker(world, layout) {
  const threshold = Math.max(25, state.componentEditor.viewRangeM * 0.03);

  if (distance2D(world, layout.kkm) <= threshold) {
    return { type: "kkm" };
  }

  if (layout.akr && distance2D(world, layout.akr) <= threshold) {
    return { type: "akr" };
  }

  if (layout.eo && distance2D(world, layout.eo) <= threshold) {
    return { type: "eo" };
  }

  for (let i = 0; i < layout.ffs.length; i += 1) {
    if (distance2D(world, layout.ffs[i]) <= threshold) {
      return { type: "ffs", index: i };
    }
  }
  return null;
}

function screenToEditorWorld(event) {
  const rect = componentEditorCanvas.getBoundingClientRect();
  const sx = (event.clientX - rect.left) * (componentEditorCanvas.width / Math.max(1, rect.width));
  const sy = (event.clientY - rect.top) * (componentEditorCanvas.height / Math.max(1, rect.height));

  const r = state.componentEditor.viewRangeM;
  const cx = componentEditorCanvas.width / 2 + numberOrZero(state.componentEditor.panX);
  const cy = componentEditorCanvas.height / 2 + numberOrZero(state.componentEditor.panY);
  const scale = state.componentEditor.viewScale * Math.max(0.4, numberOrZero(state.componentEditor.viewZoom) || 1);
  return {
    x: state.componentEditor.radarBase.x + (sx - cx) / scale,
    y: state.componentEditor.radarBase.y - (sy - cy) / scale
  };
}

function renderComponentEditor() {
  if (!state.componentEditor.open || !state.componentEditor.layout) {
    return;
  }

  const c = componentEditorCtx;
  const w = componentEditorCanvas.width;
  const h = componentEditorCanvas.height;
  c.clearRect(0, 0, w, h);

  const layout = state.componentEditor.layout;
  const constraints = normalizePairConstraints(state.componentEditor.constraints);
  const allPoints = [layout.radar, layout.kkm, layout.akr, layout.eo, ...layout.ffs].filter(Boolean);
  let maxDist = 150;
  for (const p of allPoints) {
    maxDist = Math.max(maxDist, distance2D(layout.radar, p));
  }
  maxDist = Math.max(
    maxDist,
    numberOrZero(constraints.radarFfs.max),
    numberOrZero(constraints.kkmFfs.max),
    numberOrZero(constraints.radarAkr.max),
    numberOrZero(constraints.kkmAkr.max),
    numberOrZero(constraints.akrFfs.max),
    numberOrZero(constraints.radarEo.max),
    numberOrZero(constraints.kkmEo.max),
    numberOrZero(constraints.eoFfs.max),
    numberOrZero(constraints.ffsFfs.max)
  );
  const range = maxDist * 1.4;
  const baseScale = Math.min((w - 80) / (range * 2), (h - 80) / (range * 2));
  const scale = baseScale * Math.max(0.4, numberOrZero(state.componentEditor.viewZoom) || 1);
  state.componentEditor.viewRangeM = range;
  state.componentEditor.viewScale = baseScale;

  const toScreen = (p) => ({
    x: w / 2 + numberOrZero(state.componentEditor.panX) + (p.x - layout.radar.x) * scale,
    y: h / 2 + numberOrZero(state.componentEditor.panY) - (p.y - layout.radar.y) * scale
  });

  c.fillStyle = "#0d1713";
  c.fillRect(0, 0, w, h);

  c.strokeStyle = "rgba(67, 114, 91, 0.25)";
  c.lineWidth = 1;
  for (let x = 0; x <= w; x += 80) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
  for (let y = 0; y <= h; y += 80) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }

  const radarS = toScreen(layout.radar);
  const kkmS = toScreen(layout.kkm);
  const akrS = layout.akr ? toScreen(layout.akr) : null;
  const eoS = layout.eo ? toScreen(layout.eo) : null;
  const ffsS = layout.ffs.map(toScreen);

  c.save();
  c.strokeStyle = "rgba(143, 214, 255, 0.6)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, radarS.y);
  c.lineTo(w, radarS.y);
  c.moveTo(radarS.x, 0);
  c.lineTo(radarS.x, h);
  c.stroke();

  c.fillStyle = "#9fe6ff";
  c.font = "11px Space Grotesk";
  for (let x = 0; x <= w; x += 80) {
    const worldX = Math.round(layout.radar.x + (x - radarS.x) / scale);
    c.beginPath();
    c.moveTo(x, radarS.y - 6);
    c.lineTo(x, radarS.y + 6);
    c.stroke();
    c.fillText(String(worldX), x + 3, Math.min(h - 8, radarS.y + 18));
  }
  for (let y = 0; y <= h; y += 80) {
    const worldY = Math.round(layout.radar.y - (y - radarS.y) / scale);
    c.beginPath();
    c.moveTo(radarS.x - 6, y);
    c.lineTo(radarS.x + 6, y);
    c.stroke();
    c.fillText(String(worldY), Math.min(w - 46, radarS.x + 10), y - 4);
  }
  c.fillText("X ekseni (m)", w - 84, Math.max(14, radarS.y - 10));
  c.fillText("Y ekseni (m)", Math.max(8, radarS.x + 10), 14);
  c.restore();

  c.strokeStyle = "rgba(197,255,244,0.5)";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(radarS.x, radarS.y);
  c.lineTo(kkmS.x, kkmS.y);
  if (akrS) {
    c.moveTo(radarS.x, radarS.y);
    c.lineTo(akrS.x, akrS.y);
    c.moveTo(kkmS.x, kkmS.y);
    c.lineTo(akrS.x, akrS.y);
  }
  if (eoS) {
    c.moveTo(radarS.x, radarS.y);
    c.lineTo(eoS.x, eoS.y);
    c.moveTo(kkmS.x, kkmS.y);
    c.lineTo(eoS.x, eoS.y);
  }
  for (const p of ffsS) {
    c.moveTo(radarS.x, radarS.y);
    c.lineTo(p.x, p.y);
    c.moveTo(kkmS.x, kkmS.y);
    c.lineTo(p.x, p.y);
    if (akrS) {
      c.moveTo(akrS.x, akrS.y);
      c.lineTo(p.x, p.y);
    }
    if (eoS) {
      c.moveTo(eoS.x, eoS.y);
      c.lineTo(p.x, p.y);
    }
  }
  for (let i = 0; i < ffsS.length; i += 1) {
    const j = (i + 1) % ffsS.length;
    c.moveTo(ffsS[i].x, ffsS[i].y);
    c.lineTo(ffsS[j].x, ffsS[j].y);
  }
  c.stroke();

  drawEditorMarker(c, radarS, "#8fd6ff", "Radar", 6.8);
  drawEditorMarker(c, kkmS, "#ffd27a", "KKM", 6.2);
  if (akrS) {
    drawEditorMarker(c, akrS, "#7de2d1", "AKR", 6.2);
  }
  if (eoS) {
    drawEditorMarker(c, eoS, "#c58cff", "EO", 6.2);
  }
  ffsS.forEach((p, i) => drawEditorMarker(c, p, "#ff9a7d", `FFS${i + 1}`, 5.8));

  c.fillStyle = "#9fe6ff";
  c.font = "700 12px Space Grotesk";
  c.fillText("Radar referans, KKM/AKR/EO/FFS sürüklenebilir.", 12, 18);
  c.fillText(`Ölçek: 1px ≈ ${(1 / scale).toFixed(1)}m | Zoom x${state.componentEditor.viewZoom.toFixed(2)}`, 12, h - 12);

  const check = validateComponentLayout(layout, constraints);
  if (state.componentEditor.blindError) {
    refs.componentEditorInfo.textContent = `Kör sektör hatası: ${state.componentEditor.blindError}`;
    refs.componentEditorInfo.className = "status warn";
  } else if (check.valid) {
    refs.componentEditorInfo.textContent = "Kısıtlar uygun. Kaydedebilirsiniz.";
    refs.componentEditorInfo.className = "status";
  } else {
    const msg = state.componentEditor.hoverError || check.errors[0];
    refs.componentEditorInfo.textContent = `Kısıt ihlali: ${msg}`;
    refs.componentEditorInfo.className = "status warn";
  }
}

function drawEditorMarker(context, p, color, label, radius) {
  context.save();
  context.beginPath();
  context.arc(p.x, p.y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.font = "700 11px Space Grotesk";
  context.fillStyle = color;
  context.fillText(label, p.x + 8, p.y - 6);
  context.restore();
}

function renderDeploymentMap() {
  if (state.activeTab !== "deployment") {
    return;
  }
  deploymentCtx.clearRect(0, 0, deploymentCanvas.width, deploymentCanvas.height);
  state.deploymentView.lastRender = null;

  const previews = getVisibleDeploymentPreviews();
  const regions = getAllProtectedAssets().filter((region) => Array.isArray(region.points) && region.points.length > 0);
  if (previews.length === 0 && regions.length === 0) {
    drawDeploymentPlaceholder("Gösterim için korunacak varlık oluşturun.");
    refs.deploymentMapInfo.textContent = "Önce en az bir korunacak varlık kaydedin.";
    return;
  }

  const bounds = getDeploymentMapBounds(previews, regions);
  const mapper = createPreviewMapper(
    bounds,
    deploymentCanvas.width,
    deploymentCanvas.height,
    70,
    state.deploymentView.zoom,
    state.deploymentView.panX,
    state.deploymentView.panY
  );

  drawDeploymentGrid(mapper);
  drawDeploymentAxes(mapper);
  drawDeploymentAxisValueOverlay(mapper);

  for (const region of regions) {
    drawRegionScreen(region, mapper);
  }

  for (const preview of previews) {
    const criteriaRings = getCriteriaRingsForPreview(preview);
    if (state.coverageLayers.minCriteria) {
      for (const ring of criteriaRings) {
        drawCriteriaRingScreen(preview.center, ring.minM, mapper, ring.color, "min");
      }
    }
    if (state.coverageLayers.maxCriteria) {
      for (const ring of criteriaRings) {
        drawCriteriaRingScreen(preview.center, ring.maxM, mapper, ring.color, "max");
      }
    }

    for (const unit of preview.units) {
      const coverageItems = getCoverageItemsForUnit(unit);
      for (const coverage of coverageItems) {
        drawCoverageCircleScreen(
          coverage,
          coverage.radiusM,
          mapper,
          coverage.type === "radar" ? unit.color : "#ffb27d",
          coverage.type
        );
      }
    }
  }

  if (state.coverageLayers.radar) {
    for (const eirs of state.savedEirs) {
      const point = eirs.points?.[0];
      if (!point) {
        continue;
      }
      drawCoverageCircleScreen(
        { cx: point.x, cy: point.y, blindSectors: [] },
        getEirsRadarRangeMeters(),
        mapper,
        "#7fd8ff",
        "radar"
      );
    }
  }

  for (const preview of previews) {
    drawCenterMarkerScreen(preview.center, mapper);
  }

  const unitScreens = [];
  for (const preview of previews) {
    for (const unit of preview.units) {
      const isSelected = unit.key === state.deploymentView.selectedUnitKey;
      const screenPt = drawSystemMarkerScreen(unit, mapper, isSelected);
      unitScreens.push({
        key: unit.key,
        sx: screenPt.x,
        sy: screenPt.y,
        unit
      });
    }
  }

  state.deploymentView.lastRender = { previews, mapper, unitScreens };

  const coverageLabel = getActiveLayerLabel();
  const systemSummary = summarizePreviewSystems(previews);
  const selected = unitScreens.find((u) => u.key === state.deploymentView.selectedUnitKey);
  if (selected) {
    const planText = selected.unit.planId ? `Plan ${selected.unit.planId}` : "Plan";
    refs.deploymentMapInfo.textContent =
      `${coverageLabel} | ${systemSummary} | ${planText} ${getDeploymentUnitLabel(selected.unit)} ` +
      `Koord: (${Math.round(selected.unit.x)}, ${Math.round(selected.unit.y)})`;
  } else if (!previews.length) {
    refs.deploymentMapInfo.textContent = "Korunacak varlıklar gösteriliyor. Konuşlandırma kaydedildiğinde HSS yerleşimleri burada görünecek.";
  } else {
    refs.deploymentMapInfo.textContent =
      `${coverageLabel} | ${systemSummary} | Bileşen koordinatı için marker üzerine tıklayın.`;
  }
}

function computeDeploymentMapBounds(previews, regions) {
  const xs = [];
  const ys = [];

  for (const region of regions || []) {
    for (const point of region.points || []) {
      xs.push(point.x);
      ys.push(point.y);
    }
    const center = computeRegionCenter(region);
    xs.push(center.x);
    ys.push(center.y);
  }

  if (previews.length) {
    const previewBounds = computeMultiPreviewBounds(previews);
    xs.push(previewBounds.xMin, previewBounds.xMax);
    ys.push(previewBounds.yMin, previewBounds.yMax);
  }

  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !Number.isFinite(yMin) || !Number.isFinite(yMax)) {
    return { xMin: -1000, xMax: 1000, yMin: -1000, yMax: 1000 };
  }

  if (xMin === xMax) {
    xMin -= 100;
    xMax += 100;
  }
  if (yMin === yMax) {
    yMin -= 100;
    yMax += 100;
  }

  const padX = (xMax - xMin) * 0.08;
  const padY = (yMax - yMin) * 0.08;
  return {
    xMin: xMin - padX,
    xMax: xMax + padX,
    yMin: yMin - padY,
    yMax: yMax + padY
  };
}

function getDeploymentMapBounds(previews, regions) {
  if (state.deploymentView.baseBounds) {
    return state.deploymentView.baseBounds;
  }
  return computeDeploymentMapBounds(previews, regions);
}

function centerDeploymentViewOnRegion(region) {
  if (!region?.points?.length) {
    return;
  }

  const previews = getVisibleDeploymentPreviews();
  const regions = getAllProtectedAssets().filter((item) => Array.isArray(item.points) && item.points.length > 0);
  const bounds = getDeploymentMapBounds(previews, regions);
  const mapper = createPreviewMapper(
    bounds,
    deploymentCanvas.width,
    deploymentCanvas.height,
    70,
    state.deploymentView.zoom,
    state.deploymentView.panX,
    state.deploymentView.panY
  );

  const center = computeRegionCenter(region);
  const screenPoint = mapper.toScreen(center.x, center.y);
  state.deploymentView.panX += deploymentCanvas.width / 2 - screenPoint.x;
  state.deploymentView.panY += deploymentCanvas.height / 2 - screenPoint.y;
}

function syncDeploymentViewFromMainMap() {
  state.deploymentView.baseBounds = getVisibleWorldBounds();
  state.deploymentView.zoom = 1;
  state.deploymentView.panX = 0;
  state.deploymentView.panY = 0;
  state.deploymentView.selectedUnitKey = null;
}

function drawDeploymentPlaceholder(message) {
  deploymentCtx.save();
  deploymentCtx.fillStyle = "#0d1713";
  deploymentCtx.fillRect(0, 0, deploymentCanvas.width, deploymentCanvas.height);
  deploymentCtx.strokeStyle = "#355746";
  deploymentCtx.strokeRect(0.5, 0.5, deploymentCanvas.width - 1, deploymentCanvas.height - 1);
  deploymentCtx.fillStyle = "#9ec3af";
  deploymentCtx.font = "700 14px Space Grotesk";
  deploymentCtx.fillText(message, 24, 42);
  deploymentCtx.restore();
}

function drawDeploymentGrid(mapper) {
  deploymentCtx.save();
  deploymentCtx.fillStyle = "#0d1713";
  deploymentCtx.fillRect(0, 0, deploymentCanvas.width, deploymentCanvas.height);

  const step = 120;
  deploymentCtx.strokeStyle = "rgba(67, 114, 91, 0.25)";
  deploymentCtx.lineWidth = 1;
  for (let x = 0; x <= deploymentCanvas.width; x += step) {
    deploymentCtx.beginPath();
    deploymentCtx.moveTo(x, 0);
    deploymentCtx.lineTo(x, deploymentCanvas.height);
    deploymentCtx.stroke();
  }
  for (let y = 0; y <= deploymentCanvas.height; y += step) {
    deploymentCtx.beginPath();
    deploymentCtx.moveTo(0, y);
    deploymentCtx.lineTo(deploymentCanvas.width, y);
    deploymentCtx.stroke();
  }

  deploymentCtx.fillStyle = "#9fe6ff";
  deploymentCtx.font = "700 11px Space Grotesk";
  deploymentCtx.fillText(
    `Ölçek: 1 px ≈ ${mapper.worldPerPixel.toFixed(1)} m | Zoom: x${state.deploymentView.zoom.toFixed(2)}`,
    16,
    deploymentCanvas.height - 12
  );
  deploymentCtx.restore();
}

function drawDeploymentAxes(mapper) {
  deploymentCtx.save();
  deploymentCtx.strokeStyle = "rgba(109, 216, 255, 0.55)";
  deploymentCtx.lineWidth = 1.5;

  const yAxisX = mapper.toScreen(0, 0).x;
  if (yAxisX >= 0 && yAxisX <= deploymentCanvas.width) {
    deploymentCtx.beginPath();
    deploymentCtx.moveTo(yAxisX, 0);
    deploymentCtx.lineTo(yAxisX, deploymentCanvas.height);
    deploymentCtx.stroke();
  }

  const xAxisY = mapper.toScreen(0, 0).y;
  if (xAxisY >= 0 && xAxisY <= deploymentCanvas.height) {
    deploymentCtx.beginPath();
    deploymentCtx.moveTo(0, xAxisY);
    deploymentCtx.lineTo(deploymentCanvas.width, xAxisY);
    deploymentCtx.stroke();
  }

  deploymentCtx.fillStyle = "#9fe6ff";
  deploymentCtx.font = "700 11px Space Grotesk";
  deploymentCtx.fillText("(0,0)", clampNumber(yAxisX + 6, 4, deploymentCanvas.width - 40), clampNumber(xAxisY - 6, 12, deploymentCanvas.height - 8));
  deploymentCtx.restore();
}

function drawDeploymentAxisValueOverlay(mapper) {
  const xTicks = 6;
  const yTicks = 5;

  deploymentCtx.save();
  deploymentCtx.font = "700 11px Space Grotesk";
  deploymentCtx.fillStyle = "#bdeed7";
  deploymentCtx.strokeStyle = "rgba(189, 238, 215, 0.35)";
  deploymentCtx.lineWidth = 1;

  for (let i = 0; i <= xTicks; i += 1) {
    const sx = (i / xTicks) * deploymentCanvas.width;
    const world = mapper.toWorld(sx, deploymentCanvas.height / 2);
    const label = formatMeters(world.x);
    const textWidth = deploymentCtx.measureText(label).width;
    const textX = clampNumber(sx - textWidth / 2, 2, deploymentCanvas.width - textWidth - 2);

    deploymentCtx.beginPath();
    deploymentCtx.moveTo(sx, deploymentCanvas.height - 15);
    deploymentCtx.lineTo(sx, deploymentCanvas.height);
    deploymentCtx.stroke();

    deploymentCtx.fillText(label, textX, deploymentCanvas.height - 18);
  }

  for (let i = 0; i <= yTicks; i += 1) {
    const sy = (i / yTicks) * deploymentCanvas.height;
    const world = mapper.toWorld(deploymentCanvas.width / 2, sy);
    const label = formatMeters(world.y);

    deploymentCtx.beginPath();
    deploymentCtx.moveTo(0, sy);
    deploymentCtx.lineTo(15, sy);
    deploymentCtx.stroke();

    deploymentCtx.fillText(label, 18, sy + 3);
  }

  deploymentCtx.fillStyle = "#9fe6ff";
  deploymentCtx.fillText("X ekseni (m)", deploymentCanvas.width - 110, deploymentCanvas.height - 4);
  deploymentCtx.fillText("Y ekseni (m)", 18, 14);
  deploymentCtx.restore();
}

function drawRegionScreen(region, mapper) {
  if (!region.points.length) {
    return;
  }

  const isEirs = String(region?.id || "").startsWith("E");
  deploymentCtx.save();
  deploymentCtx.strokeStyle = isEirs ? "#7fd8ff" : "#65e3ac";
  deploymentCtx.fillStyle = isEirs ? "rgba(92, 200, 255, 0.18)" : "rgba(70, 191, 143, 0.18)";
  deploymentCtx.lineWidth = 2;

  if (region.type === "point") {
    const p = mapper.toScreen(region.points[0].x, region.points[0].y);
    deploymentCtx.beginPath();
    deploymentCtx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    deploymentCtx.fill();
    deploymentCtx.stroke();
  } else {
    deploymentCtx.beginPath();
    const first = mapper.toScreen(region.points[0].x, region.points[0].y);
    deploymentCtx.moveTo(first.x, first.y);
    for (let i = 1; i < region.points.length; i += 1) {
      const p = mapper.toScreen(region.points[i].x, region.points[i].y);
      deploymentCtx.lineTo(p.x, p.y);
    }
    deploymentCtx.closePath();
    deploymentCtx.fill();
    deploymentCtx.stroke();
  }

  deploymentCtx.restore();
}

function drawCoverageCircleScreen(coverage, radiusM, mapper, color, type) {
  const p = mapper.toScreen(coverage.cx, coverage.cy);
  const pxRadius = Math.max(1.5, radiusM / mapper.worldPerPixel);
  drawCoverageShape(
    deploymentCtx,
    p.x,
    p.y,
    pxRadius,
    color,
    type,
    1.5,
    coverage.blindSectors
  );
}

function drawCenterMarkerScreen(center, mapper) {
  const p = mapper.toScreen(center.x, center.y);
  deploymentCtx.save();
  deploymentCtx.strokeStyle = "#c5fff4";
  deploymentCtx.lineWidth = 1.6;
  deploymentCtx.beginPath();
  deploymentCtx.moveTo(p.x - 7, p.y);
  deploymentCtx.lineTo(p.x + 7, p.y);
  deploymentCtx.moveTo(p.x, p.y - 7);
  deploymentCtx.lineTo(p.x, p.y + 7);
  deploymentCtx.stroke();
  deploymentCtx.restore();
}

function drawSystemMarkerScreen(unit, mapper, isSelected) {
  const p = mapper.toScreen(unit.x, unit.y);

  deploymentCtx.save();
  deploymentCtx.beginPath();
  deploymentCtx.arc(p.x, p.y, isSelected ? 7.2 : 4.8, 0, Math.PI * 2);
  deploymentCtx.fillStyle = unit.color;
  deploymentCtx.fill();

  if (isSelected) {
    deploymentCtx.strokeStyle = "#ffffff";
    deploymentCtx.lineWidth = 1.6;
    deploymentCtx.stroke();
  }

  deploymentCtx.font = "700 11px Space Grotesk";
  deploymentCtx.fillStyle = unit.color;
  deploymentCtx.fillText(getDeploymentUnitLabel(unit), p.x + 7, p.y - 6);
  deploymentCtx.restore();

  return p;
}

function getDeploymentUnitLabel(unit) {
  const ffsMunitionCodes = Array.isArray(unit?.ffsMunitionCodes) && unit.ffsMunitionCodes.length
    ? unit.ffsMunitionCodes
    : [unit?.munitionCode];
  const uniqueCodes = [...new Set(ffsMunitionCodes.map((code) => String(code || "").trim()).filter(Boolean))];
  const suffix = uniqueCodes.length > 1
    ? "MIX"
    : uniqueCodes[0]?.includes("BLK1")
      ? "B1"
      : uniqueCodes[0]?.includes("HSS_U") || uniqueCodes[0]?.includes("BLK2")
        ? "B2"
        : "";
  return suffix ? `${unit.code}-${unit.sequence} ${suffix}` : `${unit.code}-${unit.sequence}`;
}

function drawCoverageCircleWorld(targetCtx, x, y, radiusM, color, type, lineWidth, blindSectors = []) {
  drawCoverageShape(targetCtx, x, y, radiusM, color, type, lineWidth, blindSectors);
}

function drawCoverageShape(targetCtx, x, y, radius, color, type, lineWidth, blindSectors = []) {
  const segments = getVisibleBearingSegments(blindSectors);
  if (!segments.length || !(radius > 0)) {
    return;
  }

  targetCtx.save();
  targetCtx.strokeStyle = color;
  targetCtx.fillStyle = type === "radar" ? hexToRgba(color, 0.08) : "rgba(255, 143, 83, 0.1)";
  targetCtx.lineWidth = lineWidth;

  for (const [startDeg, endDeg] of segments) {
    targetCtx.beginPath();
    if (endDeg - startDeg >= 359.999) {
      targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    } else {
      targetCtx.moveTo(x, y);
      targetCtx.arc(x, y, radius, bearingDegToCanvasRad(startDeg), bearingDegToCanvasRad(endDeg));
      targetCtx.closePath();
    }
    targetCtx.fill();
    targetCtx.stroke();
  }
  targetCtx.restore();
}

function drawCriteriaRingScreen(center, radiusM, mapper, color, kind) {
  if (!(radiusM > 0)) {
    return;
  }
  const p = mapper.toScreen(center.x, center.y);
  const pxRadius = Math.max(1.5, radiusM / mapper.worldPerPixel);
  deploymentCtx.save();
  deploymentCtx.beginPath();
  deploymentCtx.arc(p.x, p.y, pxRadius, 0, Math.PI * 2);
  deploymentCtx.setLineDash(kind === "min" ? [4, 4] : [8, 5]);
  deploymentCtx.strokeStyle = color;
  deploymentCtx.lineWidth = 1.4;
  deploymentCtx.stroke();
  deploymentCtx.setLineDash([]);
  deploymentCtx.restore();
}

function drawCriteriaRingWorld(targetCtx, cx, cy, radiusM, color, kind, lineWidth) {
  if (!(radiusM > 0)) {
    return;
  }
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, radiusM, 0, Math.PI * 2);
  targetCtx.setLineDash(kind === "min" ? [lineWidth * 6, lineWidth * 4] : [lineWidth * 9, lineWidth * 5]);
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = lineWidth;
  targetCtx.stroke();
  targetCtx.setLineDash([]);
  targetCtx.restore();
}

function drawCenterMarkerWorld(targetCtx, x, y, size) {
  targetCtx.save();
  targetCtx.strokeStyle = "#c5fff4";
  targetCtx.lineWidth = size * 0.32;
  targetCtx.beginPath();
  targetCtx.moveTo(x - size, y);
  targetCtx.lineTo(x + size, y);
  targetCtx.moveTo(x, y - size);
  targetCtx.lineTo(x, y + size);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawSystemMarkerWorld(targetCtx, unit, radius) {
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(unit.x, unit.y, radius, 0, Math.PI * 2);
  targetCtx.fillStyle = unit.color;
  targetCtx.fill();
  targetCtx.font = `${radius * 2.1}px Space Grotesk`;
  targetCtx.fillStyle = unit.color;
  drawWorldLabel(targetCtx, getDeploymentUnitLabel(unit), unit.x + radius * 1.6, unit.y + radius * 1.6);
  targetCtx.restore();
}

function getVisibleDeploymentPreviews() {
  if (!state.deployments.length || !state.visibleDeploymentPlanIds.length) {
    return [];
  }

  const previews = [];
  for (const planId of state.visibleDeploymentPlanIds) {
    const preview = buildDeploymentPreviewByPlanId(planId);
    if (preview) {
      previews.push(preview);
    }
  }
  return previews;
}

function buildDeploymentPreviewByPlanId(planId) {
  const plan = state.deployments.find((p) => p.id === planId);
  const region = getAllProtectedAssets().find((r) => r.id === plan?.regionId);

  if (!plan || !region) {
    return null;
  }

  const center = computeRegionCenter(region);
  const units = [];
  const threatDirection = getScenarioThreatDirection();
  const sequenceByCode = {};
  const placementBySystemCode = new Map();
  const candidatesBySystemCode = new Map();
  let insertionOrder = 0;

  for (const assignment of plan.systems) {
    const count = Math.max(0, Math.floor(Number(assignment?.count) || 0));
    if (count <= 0) {
      continue;
    }
    const code = String(assignment?.code || "").trim();
    if (!code) {
      continue;
    }
    const current = placementBySystemCode.get(code) || { totalCount: 0, nextIndex: 0 };
    current.totalCount += count;
    placementBySystemCode.set(code, current);

    const criteria = getCriteriaByCode(assignment.code);
    const componentSpec = getSystemComponentSpec(assignment.code, assignment);
    const info = getSystemInfo(assignment.code);
    const assignmentId = String(assignment?.id || `${assignment.code}-${assignment.munitionCode || "MUN"}`).trim();
    const systemCandidates = candidatesBySystemCode.get(code) || [];

    for (let i = 0; i < count; i += 1) {
      const ffsLoadout = getUnitFfsLoadout(assignment.code, assignment, i, componentSpec.ffsCount);
      const ffsMunitionCodes = ffsLoadout.map((row) => row.munitionCode);
      const reachProfile = getUnitLoadoutReachProfile(assignment.code, assignment, i, componentSpec.ffsCount);
      systemCandidates.push({
        assignment,
        assignmentId,
        assignmentUnitIndex: i,
        criteria,
        componentSpec,
        info,
        ffsLoadout,
        ffsMunitionCodes,
        reachProfile,
        insertionOrder: insertionOrder++
      });
    }
    candidatesBySystemCode.set(code, systemCandidates);
  }

  for (const [code, placement] of placementBySystemCode.entries()) {
    placement.radiusM = getPlacementRadiusMeters(code, threatDirection, placement.totalCount);
    placement.anglesDeg = getDeploymentAnglesDeg(placement.totalCount, threatDirection);
  }

  for (const [code, systemCandidates] of candidatesBySystemCode.entries()) {
    const orderedCandidates = [...systemCandidates];
    if (threatDirection !== "none") {
      orderedCandidates.sort((a, b) => {
        const minDiff = numberOrZero(b.reachProfile?.minKm) - numberOrZero(a.reachProfile?.minKm);
        if (Math.abs(minDiff) > 1e-9) {
          return minDiff;
        }
        const avgDiff = numberOrZero(b.reachProfile?.avgKm) - numberOrZero(a.reachProfile?.avgKm);
        if (Math.abs(avgDiff) > 1e-9) {
          return avgDiff;
        }
        const maxDiff = numberOrZero(b.reachProfile?.maxKm) - numberOrZero(a.reachProfile?.maxKm);
        if (Math.abs(maxDiff) > 1e-9) {
          return maxDiff;
        }
        return numberOrZero(a.insertionOrder) - numberOrZero(b.insertionOrder);
      });
    }

    const placement = placementBySystemCode.get(code) || {
      radiusM: getPlacementRadiusMeters(code, threatDirection, orderedCandidates.length),
      anglesDeg: getDeploymentAnglesDeg(orderedCandidates.length, threatDirection),
      nextIndex: 0
    };
    const radiusM = placement.radiusM;
    const anglesDeg = placement.anglesDeg;

    for (const candidate of orderedCandidates) {
      const angleIndex = placement.nextIndex || 0;
      const point = getPointOnRadius(center, radiusM, anglesDeg[angleIndex] ?? 0);
      placement.nextIndex = angleIndex + 1;
      const assignment = candidate.assignment;
      sequenceByCode[assignment.code] = (sequenceByCode[assignment.code] || 0) + 1;
      const sequence = sequenceByCode[assignment.code];
      const assignmentId = candidate.assignmentId;
      const componentSpec = candidate.componentSpec;
      const unitKey = buildComponentLayoutUnitKey(
        plan.id,
        assignmentId,
        assignment.code,
        candidate.assignmentUnitIndex + 1
      );
      const components = getOrCreateComponentLayout(
        unitKey,
        point,
        center,
        candidate.criteria?.pairConstraints || null,
        componentSpec
      );

      units.push({
        key: unitKey,
        planId: plan.id,
        regionId: region.id,
        regionName: region.name,
        center,
        threatDirection,
        assignmentId,
        assignment,
        assignmentUnitIndex: candidate.assignmentUnitIndex,
        code: assignment.code,
        munitionCode: String(candidate.ffsMunitionCodes[0] || assignment?.munitionCode || getPreferredMunitionCode(assignment.code, assignment) || "").trim(),
        ffsLoadout: candidate.ffsLoadout,
        ffsMunitionCodes: candidate.ffsMunitionCodes,
        sequence,
        x: components.radar.x,
        y: components.radar.y,
        components,
        componentSpec,
        constraints: candidate.criteria?.pairConstraints || null,
        centerMinM: numberOrZero(candidate.criteria?.centerMinKm) * 1000,
        centerMaxM: numberOrZero(candidate.criteria?.centerMaxKm) * 1000,
        radarRangeM: numberOrZero(candidate.info.radarRangeKm) * 1000,
        color: getSystemColor(assignment.code)
      });
    }
  }

  return {
    plan,
    region,
    center,
    units
  };
}

function computeRegionCenter(region) {
  if (!region?.points?.length) {
    return { x: 0, y: 0 };
  }
  if (region.type === "point") {
    return { x: region.points[0].x, y: region.points[0].y };
  }

  let sx = 0;
  let sy = 0;
  for (const p of region.points) {
    sx += p.x;
    sy += p.y;
  }
  return {
    x: sx / region.points.length,
    y: sy / region.points.length
  };
}

function getRegionBounds(region) {
  if (!region?.points?.length) {
    return { xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
  }

  let xMin = region.points[0].x;
  let xMax = region.points[0].x;
  let yMin = region.points[0].y;
  let yMax = region.points[0].y;

  for (const p of region.points) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
    yMin = Math.min(yMin, p.y);
    yMax = Math.max(yMax, p.y);
  }

  return { xMin, xMax, yMin, yMax };
}

function getCoverageItemsForUnit(unit) {
  const items = [];
  if (state.coverageLayers.radar) {
    const r = numberOrZero(unit.radarRangeM);
    if (r > 0) {
      items.push({
        type: "radar",
        radiusM: r,
        cx: unit.components.radar.x,
        cy: unit.components.radar.y,
        blindSectors: normalizeBlindSectors(unit.components.radar.blindSectors)
      });
    }
  }
  if (state.coverageLayers.wez) {
    const ffsComponents = Array.isArray(unit?.components?.ffs) ? unit.components.ffs : [];
    const ffsLoadout = Array.isArray(unit?.ffsLoadout) ? unit.ffsLoadout : [];
    for (let index = 0; index < ffsComponents.length; index += 1) {
      const f = ffsComponents[index];
      const loadoutRow = ffsLoadout[index] || {};
      const missileCount = Math.max(0, Math.floor(Number(loadoutRow?.missileCount) || 0));
      const r = numberOrZero(getMunitionWezRangeKm(loadoutRow?.munitionCode)) * 1000;
      if (r > 0 && missileCount > 0) {
        items.push({
          type: "wez",
          radiusM: r,
          cx: f.x,
          cy: f.y,
          blindSectors: normalizeBlindSectors(f.blindSectors)
        });
      }
    }
  }
  return items;
}

function getCriteriaRingsForPreview(preview) {
  const rings = [];
  const seen = new Set();
  for (const system of preview.plan.systems) {
    if ((Number(system.count) || 0) <= 0 || seen.has(system.code)) {
      continue;
    }
    seen.add(system.code);
    const c = getCriteriaByCode(system.code);
    rings.push({
      code: system.code,
      color: getSystemColor(system.code),
      minM: numberOrZero(c.centerMinKm) * 1000,
      maxM: numberOrZero(c.centerMaxKm) * 1000
    });
  }
  return rings;
}

function getActiveLayerLabel() {
  const labels = [];
  if (state.coverageLayers.radar) {
    labels.push("Radar");
  }
  if (state.coverageLayers.wez) {
    labels.push("WEZ");
  }
  if (state.coverageLayers.minCriteria) {
    labels.push("Min");
  }
  if (state.coverageLayers.maxCriteria) {
    labels.push("Max");
  }
  return labels.length ? labels.join("+") : "Katman Kapalı";
}

function computeMultiPreviewBounds(previews) {
  const xs = [];
  const ys = [];

  for (const preview of previews) {
    for (const p of preview.region.points) {
      xs.push(p.x);
      ys.push(p.y);
    }

    xs.push(preview.center.x);
    ys.push(preview.center.y);

    for (const unit of preview.units) {
      xs.push(unit.x);
      ys.push(unit.y);

      for (const coverage of getCoverageItemsForUnit(unit)) {
        xs.push(coverage.cx - coverage.radiusM, coverage.cx + coverage.radiusM);
        ys.push(coverage.cy - coverage.radiusM, coverage.cy + coverage.radiusM);
      }
    }

    const criteriaRings = getCriteriaRingsForPreview(preview);
    for (const ring of criteriaRings) {
      if (state.coverageLayers.minCriteria && ring.minM > 0) {
        xs.push(preview.center.x - ring.minM, preview.center.x + ring.minM);
        ys.push(preview.center.y - ring.minM, preview.center.y + ring.minM);
      }
      if (state.coverageLayers.maxCriteria && ring.maxM > 0) {
        xs.push(preview.center.x - ring.maxM, preview.center.x + ring.maxM);
        ys.push(preview.center.y - ring.maxM, preview.center.y + ring.maxM);
      }
    }
  }

  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !Number.isFinite(yMin) || !Number.isFinite(yMax)) {
    return { xMin: -1000, xMax: 1000, yMin: -1000, yMax: 1000 };
  }

  if (xMin === xMax) {
    xMin -= 100;
    xMax += 100;
  }
  if (yMin === yMax) {
    yMin -= 100;
    yMax += 100;
  }

  const padX = (xMax - xMin) * 0.08;
  const padY = (yMax - yMin) * 0.08;
  return {
    xMin: xMin - padX,
    xMax: xMax + padX,
    yMin: yMin - padY,
    yMax: yMax + padY
  };
}

function createPreviewMapper(bounds, width, height, margin, zoom, panX, panY) {
  const worldW = Math.max(1, bounds.xMax - bounds.xMin);
  const worldH = Math.max(1, bounds.yMax - bounds.yMin);
  const usableW = Math.max(1, width - margin * 2);
  const usableH = Math.max(1, height - margin * 2);
  const baseScale = Math.min(usableW / worldW, usableH / worldH);
  const scale = baseScale * Math.max(0.3, Number(zoom) || 1);
  const centerX = (bounds.xMin + bounds.xMax) / 2;
  const centerY = (bounds.yMin + bounds.yMax) / 2;

  return {
    worldPerPixel: 1 / scale,
    toScreen(x, y) {
      return {
        x: width / 2 + (Number(panX) || 0) + (x - centerX) * scale,
        y: height / 2 + (Number(panY) || 0) - (y - centerY) * scale
      };
    },
    toWorld(sx, sy) {
      return {
        x: centerX + (sx - width / 2 - (Number(panX) || 0)) / scale,
        y: centerY - (sy - height / 2 - (Number(panY) || 0)) / scale
      };
    }
  };
}

function summarizePreviewSystems(previews) {
  const totals = {};
  for (const preview of previews) {
    for (const s of preview.plan.systems) {
      const current = totals[s.code] || 0;
      totals[s.code] = current + Number(s.count || 0);
    }
  }

  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  if (!entries.length) {
    return "Sistem yok";
  }
  return entries.map(([code, count]) => `${code}: ${count}`).join(", ");
}

function parsePairConstraints(item) {
  const pairs = Array.isArray(item?.pairDistanceConstraintsM) ? item.pairDistanceConstraintsM : [];
  const out = {
    radarKkm: { min: null, max: null },
    radarFfs: { min: null, max: null },
    kkmFfs: { min: null, max: null },
    radarAkr: { min: null, max: null },
    kkmAkr: { min: null, max: null },
    akrFfs: { min: null, max: null },
    radarEo: { min: null, max: null },
    kkmEo: { min: null, max: null },
    eoFfs: { min: null, max: null },
    ffsFfs: { min: null, max: null }
  };

  for (const p of pairs) {
    const key = normalizePairKey(p?.pair);
    if (!key || !out[key]) {
      continue;
    }
    out[key] = {
      min: numberOrNull(p?.min),
      max: numberOrNull(p?.max)
    };
  }

  return out;
}

function normalizePairKey(pairName) {
  const t = String(pairName || "").toLowerCase().replace(/\s+/g, "");
  if (t === "radar-kkm" || t === "kkm-radar") {
    return "radarKkm";
  }
  if (t === "radar-ffs" || t === "ffs-radar") {
    return "radarFfs";
  }
  if (t === "kkm-ffs" || t === "ffs-kkm") {
    return "kkmFfs";
  }
  if (t === "radar-akr" || t === "akr-radar") {
    return "radarAkr";
  }
  if (t === "kkm-akr" || t === "akr-kkm") {
    return "kkmAkr";
  }
  if (t === "akr-ffs" || t === "ffs-akr") {
    return "akrFfs";
  }
  if (t === "radar-eo" || t === "eo-radar") {
    return "radarEo";
  }
  if (t === "kkm-eo" || t === "eo-kkm") {
    return "kkmEo";
  }
  if (t === "eo-ffs" || t === "ffs-eo") {
    return "eoFfs";
  }
  if (t === "ffs-ffs") {
    return "ffsFfs";
  }
  return "";
}

function normalizeBlindSectors(raw) {
  const sectors = Array.isArray(raw) ? raw : [];
  const normalized = [];

  for (const sector of sectors) {
    if (!Array.isArray(sector) || sector.length < 2) {
      continue;
    }
    const start = numberOrNull(sector[0]);
    const end = numberOrNull(sector[1]);
    if (start === null || end === null) {
      continue;
    }

    const s = clampNumber(start, 0, 360);
    const e = clampNumber(end, 0, 360);
    if (s === e) {
      continue;
    }
    if (e > s) {
      normalized.push([s, e]);
    } else {
      if (s < 360) {
        normalized.push([s, 360]);
      }
      if (e > 0) {
        normalized.push([0, e]);
      }
    }
  }

  normalized.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of normalized) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) {
      merged.push([start, end]);
    } else {
      last[1] = Math.max(last[1], end);
    }
  }
  return merged;
}

function getVisibleBearingSegments(blindSectors) {
  const blocked = normalizeBlindSectors(blindSectors);
  if (!blocked.length) {
    return [[0, 360]];
  }

  const visible = [];
  let cursor = 0;
  for (const [start, end] of blocked) {
    if (start > cursor) {
      visible.push([cursor, start]);
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < 360) {
    visible.push([cursor, 360]);
  }
  return visible.filter(([start, end]) => end > start);
}

function bearingDegToCanvasRad(deg) {
  return ((deg - 90) * Math.PI) / 180;
}

function getCanvasScreenPoint(targetCanvas, event) {
  const rect = targetCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (targetCanvas.width / Math.max(1, rect.width)),
    y: (event.clientY - rect.top) * (targetCanvas.height / Math.max(1, rect.height))
  };
}

function findNearestDeploymentUnit(sx, sy, unitScreens, thresholdPx) {
  let nearest = null;
  let nearestDistSq = Number.POSITIVE_INFINITY;
  const thresholdSq = thresholdPx * thresholdPx;

  for (const unit of unitScreens || []) {
    const dx = sx - unit.sx;
    const dy = sy - unit.sy;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = unit;
    }
  }

  if (!nearest || nearestDistSq > thresholdSq) {
    return null;
  }
  return nearest;
}

function shiftComponentLayout(layout, dx, dy) {
  const shifted = normalizeComponentLayout(layout);
  const movePoint = (point) => ({
    ...point,
    x: Math.round(numberOrZero(point.x) + dx),
    y: Math.round(numberOrZero(point.y) + dy)
  });

  return {
    radar: movePoint(shifted.radar),
    kkm: movePoint(shifted.kkm),
    akr: shifted.akr ? movePoint(shifted.akr) : null,
    eo: shifted.eo ? movePoint(shifted.eo) : null,
    ffs: shifted.ffs.map(movePoint)
  };
}

function sanitizeSystemCode(code) {
  return String(code || "").replace(/[^A-Za-z0-9]/g, "");
}

function sanitizeFilename(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
}

function downloadJsonFile(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  return downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.append(anchor);
    requestAnimationFrame(() => {
      anchor.click();
      setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
        resolve();
      }, 800);
    });
  });
}

async function downloadScenarioPdfFile(payload, filename) {
  const pages = await renderScenarioReportPages(payload);
  const pdfBytes = buildPdfDocumentFromPages(pages, 595, 842);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  return downloadBlob(blob, filename);
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderScenarioReportPages(payload) {
  const report = buildScenarioReportModel(payload);
  const pageWidthPt = 595;
  const pageHeightPt = 842;
  const scale = 2;
  const pageWidth = pageWidthPt * scale;
  const pageHeight = pageHeightPt * scale;
  const margin = 20 * scale;
  const contentWidth = pageWidth - margin * 2;
  const blue = "#002060";
  const border = "#c7c7c7";
  const paper = "#fbfaf7";
  const panel = "#ffffff";
  const logo = await loadImageSafe(buildDataUrl("MilliSavunmaUniversitesiLogo.png"));
  const pages = [];

  function createPage() {
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin, contentWidth, pageHeight - margin * 2);

    const headerRect = { x: margin, y: margin, w: contentWidth, h: 54 * scale };
    ctx.fillStyle = panel;
    ctx.fillRect(headerRect.x, headerRect.y, headerRect.w, headerRect.h);
    ctx.strokeRect(headerRect.x, headerRect.y, headerRect.w, headerRect.h);

    let titleStartX = headerRect.x + 50;
    let logoDrawWidth = 0;
    if (logo) {
      const maxHeight = 44 * scale;
      const ratio = logo.naturalWidth / Math.max(1, logo.naturalHeight);
      const drawWidth = maxHeight * ratio;
      logoDrawWidth = drawWidth;
      ctx.drawImage(logo, headerRect.x + 8, headerRect.y + (headerRect.h - maxHeight) / 2, drawWidth, maxHeight);
      titleStartX = headerRect.x + 8 + drawWidth + 12;
    }

    const titleBlockHeight = (15 * scale * 1.22) + (11.5 * scale * 1.22);
    const titleBlockY = headerRect.y + (headerRect.h - titleBlockHeight) / 2;
    const titleBlockWidth = headerRect.w - (titleStartX - headerRect.x) - 16;
    drawCanvasText(ctx, "MSÜ Senaryo Planlama WEB Arayüzü", titleStartX, titleBlockY, 15 * scale, {
      bold: true,
      align: "center",
      maxWidth: titleBlockWidth
    });
    drawCanvasText(ctx, "Senaryo Özet Dokümanı", titleStartX, titleBlockY + (15 * scale * 1.22), 11.5 * scale, {
      bold: true,
      align: "center",
      maxWidth: titleBlockWidth
    });

    return { canvas, ctx };
  }

  const first = createPage();
  pages.push(first.canvas);

  const topY = margin + 64 * scale;
  const topHeight = 138 * scale;
  const leftWidth = 220 * scale;
  const rightWidth = contentWidth - leftWidth;
  const leftRect = { x: margin, y: topY, w: leftWidth, h: topHeight };
  const rightRect = { x: margin + leftWidth, y: topY, w: rightWidth, h: topHeight };

  for (const rect of [leftRect, rightRect]) {
    first.ctx.fillStyle = panel;
    first.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    first.ctx.strokeStyle = border;
    first.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  drawCanvasText(first.ctx, "Senaryo Bilgisi:", leftRect.x + 10, leftRect.y + 8, 11 * scale, {
    bold: true,
    color: blue
  });
  drawCanvasText(first.ctx, "Senaryo Özeti:", rightRect.x + 10, rightRect.y + 8, 11 * scale, {
    bold: true,
    color: blue
  });

  const leftLabelWidth = 120 * scale;
  const leftLabelX = leftRect.x + 10;
  const leftValueX = leftLabelX + leftLabelWidth + 10;
  const leftValueWidth = leftRect.x + leftRect.w - leftValueX - 10;
  let infoY = leftRect.y + 32 * scale;
  for (const item of report.infoLines) {
    const labelHeight = measureWrappedCanvasText(first.ctx, item.label, leftLabelWidth, 9 * scale, true);
    const valueHeight = measureWrappedCanvasText(first.ctx, item.value, leftValueWidth, 9 * scale, false);
    drawCanvasText(first.ctx, item.label, leftLabelX, infoY, 9 * scale, {
      bold: true,
      maxWidth: leftLabelWidth
    });
    drawCanvasText(first.ctx, item.value, leftValueX, infoY, 9 * scale, { maxWidth: leftValueWidth });
    infoY += Math.max(labelHeight, valueHeight) + 7;
  }

  const rightLabelWidth = 78 * scale;
  const rightLabelX = rightRect.x + 10;
  const rightValueX = rightLabelX + rightLabelWidth + 10;
  const rightValueWidth = rightRect.x + rightRect.w - rightValueX - 10;
  let summaryY = rightRect.y + 32 * scale;
  for (const item of report.summaryLines) {
    const labelHeight = measureWrappedCanvasText(first.ctx, item.label, rightLabelWidth, 9 * scale, true);
    const valueHeight = measureWrappedCanvasText(first.ctx, item.value, rightValueWidth, 9 * scale, false);
    drawCanvasText(first.ctx, item.label, rightLabelX, summaryY, 9 * scale, {
      bold: true,
      maxWidth: rightLabelWidth
    });
    drawCanvasText(first.ctx, item.value, rightValueX, summaryY, 9 * scale, { maxWidth: rightValueWidth });
    summaryY += Math.max(labelHeight, valueHeight) + 7;
  }

  const mapPanel = {
    x: margin,
    y: topY + topHeight + 12 * scale,
    w: contentWidth,
    h: 240 * scale
  };
  first.ctx.fillStyle = panel;
  first.ctx.fillRect(mapPanel.x, mapPanel.y, mapPanel.w, mapPanel.h);
  first.ctx.strokeRect(mapPanel.x, mapPanel.y, mapPanel.w, mapPanel.h);

  drawReportMap(
    first.ctx,
    report,
    {
      x: mapPanel.x + 10,
      y: mapPanel.y + 18,
      w: mapPanel.w - 20,
      h: mapPanel.h - 50
    },
    scale
  );
  drawReportLegend(first.ctx, {
    x: mapPanel.x + 12,
    y: mapPanel.y + mapPanel.h - 22,
    w: mapPanel.w - 24,
    h: 16
  }, scale);

  const flowLines = buildScenarioReportFlowLines(report);
  let currentPage = first;
  let cursorY = mapPanel.y + mapPanel.h + 12 * scale;
  const bodyTopY = margin + 64 * scale;
  const availableBottom = pageHeight - margin;

  for (const line of flowLines) {
    const width = contentWidth - (line.indent || 0) * scale - 24;
    const height = measureWrappedCanvasText(currentPage.ctx, line.text, width, line.fontSize * scale, line.bold);
    const gapBefore = (line.gapBefore || 0) * scale;
    const gapAfter = (line.gapAfter || 0) * scale;
    const needed = gapBefore + height + gapAfter;

    if (cursorY + needed > availableBottom) {
      currentPage = createPage();
      pages.push(currentPage.canvas);
      cursorY = bodyTopY;
    }

    cursorY += gapBefore;
    drawCanvasText(currentPage.ctx, line.text, margin + 10 + (line.indent || 0) * scale, cursorY, line.fontSize * scale, {
      bold: Boolean(line.bold),
      underline: Boolean(line.underline),
      color: line.color || "#111111",
      maxWidth: width,
      align: line.align || "left"
    });
    cursorY += height + gapAfter;
  }

  return pages.map((canvas) => ({
    dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    width: canvas.width,
    height: canvas.height
  }));
}

function buildScenarioReportModel(payload) {
  const assets = (Array.isArray(payload?.protectedAssets) ? payload.protectedAssets : []).map((asset) => {
    const geometry = asset?.geometry && typeof asset.geometry === "object" ? asset.geometry : {};
    const coords = geometry.coordinates;
    const isEirs = String(asset?.id || "").toUpperCase().startsWith("E") || String(asset?.assetClass || "").toLowerCase().includes("eirs");
    if (geometry.type === "Point" && coords && typeof coords === "object" && !Array.isArray(coords)) {
      return {
        userId: String(asset?.name || asset?.id || "-"),
        systemId: String(asset?.id || "-"),
        hva: String(asset?.HVA_value ?? "-"),
        kind: "Nokta",
        coordText: `${formatReportNumber(coords.x)}, ${formatReportNumber(coords.y)}`,
        point: { x: Number(coords.x) || 0, y: Number(coords.y) || 0 },
        polygon: [],
        isEirs
      };
    }
    const polygon = (Array.isArray(coords) ? coords : [])
      .filter((item) => item && typeof item === "object")
      .map((point) => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
    return {
      userId: String(asset?.name || asset?.id || "-"),
      systemId: String(asset?.id || "-"),
      hva: String(asset?.HVA_value ?? "-"),
      kind: "Bölge",
      coordText: polygon.map((point) => `(${formatReportNumber(point.x)}, ${formatReportNumber(point.y)})`).join(", "),
      point: null,
      polygon,
      isEirs
    };
  });

  const deploymentPlanById = new Map(
    (Array.isArray(payload?.deploymentPlans) ? payload.deploymentPlans : []).map((plan) => [String(plan?.id || ""), String(plan?.protectedAssetId || "-")])
  );

  const hssUnits = (Array.isArray(payload?.deployedUnits) ? payload.deployedUnits : []).map((unit) => {
    const radar = unit?.components?.radar && typeof unit.components.radar === "object" ? unit.components.radar : {};
    const position = radar?.position && typeof radar.position === "object"
      ? { x: Number(radar.position.x) || 0, y: Number(radar.position.y) || 0 }
      : null;
    const assetSystemId = deploymentPlanById.get(String(unit?.planId || "")) || "-";
    const assetUser = assets.find((item) => item.systemId === assetSystemId)?.userId || assetSystemId;
    return {
      systemCode: String(unit?.systemCode || "-"),
      unitId: String(unit?.id || "-"),
      assetSystemId,
      assetUserId: assetUser,
      ffsCount: Array.isArray(unit?.components?.ffs) ? unit.components.ffs.length : 0,
      position,
      hvaValue: String(radar?.HVA_value ?? "-")
    };
  });

  const threatEntities = Array.isArray(payload?.threatScenario?.entities) ? payload.threatScenario.entities : [];
  const platforms = [];
  const ballistics = [];
  for (const entity of threatEntities) {
    if (entity?.entityType === "KinematicTarget") {
      const flightPlan = entity?.flightPlan && typeof entity.flightPlan === "object" ? entity.flightPlan : {};
      const initialState = flightPlan.initialState && typeof flightPlan.initialState === "object" ? flightPlan.initialState : {};
      const route = [];
      if (Array.isArray(initialState.position) && initialState.position.length >= 2) {
        route.push({ x: Number(initialState.position[0]) || 0, y: Number(initialState.position[1]) || 0 });
      }
      for (const waypoint of Array.isArray(flightPlan.waypoints) ? flightPlan.waypoints : []) {
        if (Array.isArray(waypoint?.position) && waypoint.position.length >= 2) {
          route.push({ x: Number(waypoint.position[0]) || 0, y: Number(waypoint.position[1]) || 0 });
        }
      }
      const payloads = Array.isArray(entity?.payload) ? entity.payload : [];
      const ammoType = payloads.length ? "Stand-off Mühimmat" : "Klasik Mühimmat";
      let targetId = matchReportAssetId(route[route.length - 1], assets);
      let manualPoint = null;
      const payloadRows = payloads.map((payloadRow) => {
        const targetDef = payloadRow?.targetDefinition && typeof payloadRow.targetDefinition === "object" ? payloadRow.targetDefinition : {};
        const payloadTargetId = String(targetDef.defendedAssetId || matchReportAssetId(toReportPoint(payloadRow?.targetPoint), assets) || "-");
        const payloadManual = String(targetDef.mode || "").toLowerCase() === "manual" && Array.isArray(payloadRow?.targetPoint3D)
          ? formatReportPoint3(payloadRow.targetPoint3D)
          : null;
        const releasePoint = toReportPoint(payloadRow?.releasePoint);
        const targetPoint = toReportPoint(payloadRow?.targetPoint);
        return {
          payloadId: String(payloadRow?.id || "-"),
          targetId: payloadTargetId,
          releaseTime: formatReportNumber(payloadRow?.release?.time),
          tot: formatReportNumber(payloadRow?.targetTot),
          manualPoint: payloadManual,
          releasePoint,
          targetPoint
        };
      });
      if (payloads[0]?.targetDefinition) {
        const targetDef = payloads[0].targetDefinition || {};
        targetId = String(targetDef.defendedAssetId || matchReportAssetId(toReportPoint(payloads[0]?.targetPoint), assets) || "-");
        if (String(targetDef.mode || "").toLowerCase() === "manual" && Array.isArray(payloads[0]?.targetPoint3D)) {
          manualPoint = formatReportPoint3(payloads[0].targetPoint3D);
        }
      }
      platforms.push({
        platformId: String(entity?.id || "-"),
        targetId,
        takeoffTime: formatReportNumber(flightPlan?.takeoffTime),
        tot: payloadRows[0]?.tot || formatReportNumber(payload?.threatScenario?.planning?.platformTot),
        ammoType,
        manualPoint,
        route,
        payloads: payloadRows
      });
    } else if (entity?.entityType === "BallisticTarget") {
      const trajectory = entity?.trajectory && typeof entity.trajectory === "object" ? entity.trajectory : {};
      const terminal = trajectory.terminal && typeof trajectory.terminal === "object" ? trajectory.terminal : {};
      const impactDef = entity?.impactDefinition && typeof entity.impactDefinition === "object" ? entity.impactDefinition : {};
      const route = [toReportPoint(trajectory.launchPoint), toReportPoint(terminal.impactPoint)].filter(Boolean);
      const manualPoint = String(impactDef.mode || "").toLowerCase() === "manual" && Array.isArray(impactDef.impactPoint)
        ? formatReportPoint3(impactDef.impactPoint)
        : null;
      ballistics.push({
        ballisticId: String(entity?.id || "-"),
        targetId: String(impactDef.defendedAssetId || matchReportAssetId(toReportPoint(terminal.impactPoint), assets) || "-"),
        launchTime: formatReportNumber(entity?.launchTime),
        impactTime: formatReportNumber(entity?.impactTime),
        manualPoint,
        route
      });
    }
  }

  const scenarioName = String(payload?.scenarioName || "Birlesik Senaryo");
  const fileName = `${sanitizeFilename(scenarioName) || "msu_senaryo"}.json`;
  const createdAt = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date());
  const defendedCount = assets.filter((item) => !item.isEirs).length;
  const eirsCount = assets.filter((item) => item.isEirs).length;
  const payloadCount = platforms.reduce((sum, item) => sum + item.payloads.length, 0);
  return {
    scenarioName,
    infoLines: [
      { label: "Senaryo Dosya Adı:", value: fileName },
      { label: "Senaryo ID:", value: String(payload?.scenarioId || "-") },
      { label: "Tanımlı Tehdit İstikameti:", value: normalizeThreatDirectionLabel(payload?.scenarioThreatDirection) },
      { label: "Oluşturulma Zamanı:", value: createdAt }
    ],
    summaryLines: [
      { label: "Varlık:", value: `${defendedCount}xSV, ${eirsCount}xEİRS` },
      {
        label: "HSS:",
        value: ["HSS-N", "HSS-A", "HSS-O", "HSS-U", "HSS-F"]
          .map((code) => `${hssUnits.filter((unit) => unit.systemCode === code).length}x${code}`)
          .join(", ")
      },
      { label: "Platform:", value: `${platforms.length}xPlatform, ${payloadCount}xPayload` },
      { label: "Balistik:", value: `${ballistics.length}xBalistik` }
    ],
    assets,
    hssUnits,
    platforms,
    ballistics
  };
}

function buildScenarioReportFlowLines(report) {
  const lines = [
    { text: "TANIMLANAN VARLIKLAR", fontSize: 12, bold: true, color: "#002060", align: "center", gapAfter: 8 }
  ];

  lines.push({ text: "Savunulan Varlıklar:", fontSize: 10, bold: true, underline: true, gapAfter: 2 });
  const defendedAssets = report.assets.filter((item) => !item.isEirs);
  if (!defendedAssets.length) {
    lines.push({ text: "-", fontSize: 8.6, indent: 2, gapAfter: 2 });
  }
  for (const [index, asset] of defendedAssets.entries()) {
    lines.push({
      text: `${index + 1}. '${asset.userId}' : [HVA Değ: ${asset.hva}], [${asset.kind}], [Koordinat: ${asset.coordText}], [Sistem ID: ${asset.systemId}]`,
      fontSize: 8.6,
      indent: 2,
      gapAfter: 2
    });
  }

  lines.push({ text: "EİRS:", fontSize: 10, bold: true, underline: true, gapBefore: 4, gapAfter: 2 });
  const eirsAssets = report.assets.filter((item) => item.isEirs);
  if (!eirsAssets.length) {
    lines.push({ text: "-", fontSize: 8.6, indent: 2, gapAfter: 2 });
  }
  for (const [index, asset] of eirsAssets.entries()) {
    lines.push({
      text: `${index + 1}. '${asset.userId}' : [HVA Değ: ${asset.hva}], [Koordinat: ${asset.coordText}], [Sistem ID: ${asset.systemId}]`,
      fontSize: 8.6,
      indent: 2,
      gapAfter: 2
    });
  }

  lines.push({ text: "Hava Savunma Konuşu:", fontSize: 10, bold: true, underline: true, gapBefore: 4, gapAfter: 2 });
  for (const code of ["HSS-N", "HSS-A", "HSS-O", "HSS-U", "HSS-F"]) {
    lines.push({ text: `${code}:`, fontSize: 9, underline: true, gapAfter: 2 });
    const related = report.hssUnits.filter((item) => item.systemCode === code);
    if (!related.length) {
      lines.push({ text: "[Adet: 0]", fontSize: 8.5, indent: 18, gapAfter: 2 });
      continue;
    }
    for (const unit of related) {
      lines.push({
        text: `[KV: ${unit.assetUserId}] [${unit.ffsCount} x ${code === "HSS-N" ? "Top" : "FFS"}] [KV-HSS Sis.ID İlişkisi: (${unit.assetSystemId} - ${unit.unitId})], [HVA Değ: ${unit.hvaValue}], [Koordinat: ${unit.position ? `${formatReportNumber(unit.position.x)}, ${formatReportNumber(unit.position.y)}` : "-"}]`,
        fontSize: 8.5,
        indent: 18,
        gapAfter: 2
      });
    }
  }

  lines.push({ text: "TEHDİT PLANLAMASI", fontSize: 12, bold: true, color: "#002060", align: "center", gapBefore: 8, gapAfter: 8 });
  lines.push({ text: "Platform:", fontSize: 10, bold: true, underline: true, gapAfter: 2 });
  if (!report.platforms.length) {
    lines.push({ text: "-", fontSize: 9, indent: 2, gapAfter: 2 });
  }
  for (const [index, platform] of report.platforms.entries()) {
    let text = `${index + 1}. [ID: ${platform.platformId}], [Hedef: ${platform.targetId}], [Takeoff: ${platform.takeoffTime}], [Tot: ${platform.tot}], [${platform.ammoType}]`;
    if (platform.manualPoint) {
      text += ` ${platform.manualPoint}`;
    }
    lines.push({ text, fontSize: 9, indent: 2, gapAfter: 2 });
    for (const [payloadIndex, payload] of platform.payloads.entries()) {
      let payloadText = `${String.fromCharCode(97 + payloadIndex)}. [ID: ${payload.payloadId}, ${payload.targetId}], [Release Time: ${payload.releaseTime}], [Tot: ${payload.tot}]`;
      if (payload.manualPoint) {
        payloadText += ` ${payload.manualPoint}`;
      }
      lines.push({ text: payloadText, fontSize: 9, indent: 18, gapAfter: 2 });
    }
  }

  lines.push({ text: "Balistik:", fontSize: 10, bold: true, underline: true, gapBefore: 4, gapAfter: 2 });
  if (!report.ballistics.length) {
    lines.push({ text: "-", fontSize: 9, indent: 2, gapAfter: 2 });
  }
  for (const [index, ballistic] of report.ballistics.entries()) {
    let text = `${index + 1}. [ID: ${ballistic.ballisticId}], [Hedef: ${ballistic.targetId}], [Launch T: ${ballistic.launchTime}], [Impact T: ${ballistic.impactTime}]`;
    if (ballistic.manualPoint) {
      text += ` ${ballistic.manualPoint}`;
    }
    lines.push({ text, fontSize: 9, indent: 2, gapAfter: 2 });
  }

  return lines;
}

function drawCanvasText(ctx, text, x, y, fontSize, options = {}) {
  const {
    bold = false,
    color = "#111111",
    underline = false,
    maxWidth = null,
    align = "left"
  } = options;
  ctx.save();
  ctx.font = `${bold ? "700 " : ""}${fontSize}px "Times New Roman", serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  ctx.textBaseline = "top";
  const width = maxWidth || 100000;
  const lines = wrapCanvasText(ctx, text, width);
  let cursorY = y;
  const anchorX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
  for (const line of lines) {
    ctx.fillText(line, anchorX, cursorY);
    if (underline) {
      const measured = ctx.measureText(line).width;
      const lineX = align === "center" ? anchorX - measured / 2 : align === "right" ? anchorX - measured : anchorX;
      const underlineY = cursorY + fontSize + 1;
      ctx.beginPath();
      ctx.moveTo(lineX, underlineY);
      ctx.lineTo(lineX + measured, underlineY);
      ctx.lineWidth = Math.max(1, fontSize / 18);
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    cursorY += fontSize * 1.22;
  }
  ctx.restore();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const value = String(text || "");
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    return [value];
  }
  const paragraphs = value.split("\n");
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const next = `${current} ${word}`;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

function measureWrappedCanvasText(ctx, text, maxWidth, fontSize, bold = false) {
  ctx.save();
  ctx.font = `${bold ? "700 " : ""}${fontSize}px "Times New Roman", serif`;
  const lines = wrapCanvasText(ctx, text, maxWidth);
  ctx.restore();
  return Math.max(fontSize * 1.22, lines.length * fontSize * 1.22);
}

function normalizeThreatDirectionLabel(value) {
  switch (String(value || "").toLowerCase()) {
    case "north":
      return "Kuzey";
    case "south":
      return "Güney";
    case "east":
      return "Doğu";
    case "west":
      return "Batı";
    default:
      return "Tanımlanmamıştır.";
  }
}

function formatReportNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "-";
  }
  if (Math.abs(num - Math.round(num)) < 0.001) {
    return String(Math.round(num));
  }
  return num.toFixed(2);
}

function toReportPoint(value) {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }
  return { x: Number(value[0]) || 0, y: Number(value[1]) || 0 };
}

function formatReportPoint3(values) {
  if (!Array.isArray(values)) {
    return "(-, -, -)";
  }
  const x = formatReportNumber(values[0]);
  const y = formatReportNumber(values[1]);
  const z = formatReportNumber(values[2] ?? 0);
  return `(${x}, ${y}, ${z})`;
}

function pointInReportPolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function matchReportAssetId(point, assets) {
  if (!point) {
    return "-";
  }
  for (const asset of assets) {
    if (asset.point && Math.abs(asset.point.x - point.x) < 1 && Math.abs(asset.point.y - point.y) < 1) {
      return asset.systemId;
    }
    if (pointInReportPolygon(point, asset.polygon)) {
      return asset.systemId;
    }
  }
  return "-";
}

function drawReportMap(ctx, report, rect, scale) {
  ctx.save();
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "#bfbfbf";
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  for (let i = 1; i < 8; i += 1) {
    const x = rect.x + (rect.w * i) / 8;
    ctx.beginPath();
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.h);
    ctx.strokeStyle = "#e2e2e2";
    ctx.stroke();
  }
  for (let i = 1; i < 5; i += 1) {
    const y = rect.y + (rect.h * i) / 5;
    ctx.beginPath();
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.w, y);
    ctx.strokeStyle = "#e2e2e2";
    ctx.stroke();
  }

  const points = [];
  for (const asset of report.assets) {
    if (asset.point) {
      points.push(asset.point);
    }
    points.push(...asset.polygon);
  }
  for (const unit of report.hssUnits) {
    if (unit.position) {
      points.push(unit.position);
    }
  }
  for (const platform of report.platforms) {
    points.push(...platform.route);
    for (const payload of platform.payloads) {
      if (payload.releasePoint) {
        points.push(payload.releasePoint);
      }
      if (payload.targetPoint) {
        points.push(payload.targetPoint);
      }
    }
  }
  for (const ballistic of report.ballistics) {
    points.push(...ballisticsPathPoints(ballistic));
  }
  if (!points.length) {
    drawReportNorthArrow(ctx, rect, scale);
    ctx.restore();
    return;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.12 + 1;
  const padY = (maxY - minY) * 0.12 + 1;
  const world = {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY
  };

  const mapPoint = (point) => ({
    x: rect.x + ((point.x - world.minX) / Math.max(world.maxX - world.minX, 1)) * rect.w,
    y: rect.y + rect.h - ((point.y - world.minY) / Math.max(world.maxY - world.minY, 1)) * rect.h
  });

  for (const platform of report.platforms) {
    const mapped = platform.route.map(mapPoint);
    if (mapped.length < 2) {
      continue;
    }
    ctx.save();
    ctx.strokeStyle = "#c24cf0";
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(mapped[0].x, mapped[0].y);
    for (const point of mapped.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    for (const point of mapped) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#c24cf0";
      ctx.fill();
    }
    drawCanvasText(ctx, platform.platformId, mapped[0].x + 4, mapped[0].y - 12, 8 * scale, { color: "#c24cf0" });
    ctx.restore();
  }

  for (const platform of report.platforms) {
    for (const payload of platform.payloads) {
      const mappedRelease = payload.releasePoint ? mapPoint(payload.releasePoint) : null;
      const mappedTarget = payload.targetPoint ? mapPoint(payload.targetPoint) : null;
      if (!mappedRelease && !mappedTarget) {
        continue;
      }
      ctx.save();
      ctx.strokeStyle = "#7a3db8";
      ctx.fillStyle = "#7a3db8";
      ctx.lineWidth = 1.7 * scale;
      ctx.setLineDash([4 * scale, 3 * scale]);
      if (mappedRelease && mappedTarget) {
        ctx.beginPath();
        ctx.moveTo(mappedRelease.x, mappedRelease.y);
        ctx.lineTo(mappedTarget.x, mappedTarget.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (mappedRelease) {
        ctx.beginPath();
        ctx.rect(mappedRelease.x - 2.3 * scale, mappedRelease.y - 2.3 * scale, 4.6 * scale, 4.6 * scale);
        ctx.fill();
      }
      if (mappedTarget) {
        ctx.beginPath();
        ctx.moveTo(mappedTarget.x, mappedTarget.y - 4.5 * scale);
        ctx.lineTo(mappedTarget.x + 4.5 * scale, mappedTarget.y);
        ctx.lineTo(mappedTarget.x, mappedTarget.y + 4.5 * scale);
        ctx.lineTo(mappedTarget.x - 4.5 * scale, mappedTarget.y);
        ctx.closePath();
        ctx.fill();
        drawCanvasText(ctx, payload.payloadId, mappedTarget.x + 5, mappedTarget.y - 10, 7.5 * scale, { color: "#7a3db8" });
      } else if (mappedRelease) {
        drawCanvasText(ctx, payload.payloadId, mappedRelease.x + 5, mappedRelease.y - 10, 7.5 * scale, { color: "#7a3db8" });
      }
      ctx.restore();
    }
  }

  for (const ballistic of report.ballistics) {
    const mapped = ballisticsPathPoints(ballistic).map(mapPoint);
    if (mapped.length < 2) {
      continue;
    }
    ctx.save();
    ctx.strokeStyle = "#e5524d";
    ctx.lineWidth = 2.4 * scale;
    ctx.setLineDash([7 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(mapped[0].x, mapped[0].y);
    for (const point of mapped.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (const point of mapped) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#e5524d";
      ctx.fill();
    }
    drawCanvasText(ctx, ballistic.ballisticId, mapped[0].x + 4, mapped[0].y - 12, 8 * scale, { color: "#e5524d" });
    ctx.restore();
  }

  for (const asset of report.assets.filter((item) => item.polygon.length)) {
    const mapped = asset.polygon.map(mapPoint);
    ctx.save();
    ctx.fillStyle = "rgba(221, 232, 214, 0.8)";
    ctx.strokeStyle = "#7f8f7a";
    ctx.beginPath();
    ctx.moveTo(mapped[0].x, mapped[0].y);
    for (const point of mapped.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const center = {
      x: mapped.reduce((sum, point) => sum + point.x, 0) / mapped.length,
      y: mapped.reduce((sum, point) => sum + point.y, 0) / mapped.length
    };
    drawCanvasText(ctx, asset.systemId, center.x - 20, center.y - 8, 8 * scale, { bold: true, align: "center", maxWidth: 40 * scale });
    ctx.restore();
  }

  for (const asset of report.assets.filter((item) => item.point)) {
    const mapped = mapPoint(asset.point);
    ctx.save();
    ctx.fillStyle = "#d7c493";
    ctx.strokeStyle = "#916f3f";
    ctx.beginPath();
    ctx.moveTo(mapped.x, mapped.y - 6 * scale);
    ctx.lineTo(mapped.x + 6 * scale, mapped.y);
    ctx.lineTo(mapped.x, mapped.y + 6 * scale);
    ctx.lineTo(mapped.x - 6 * scale, mapped.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawCanvasText(ctx, asset.systemId, mapped.x + 8, mapped.y - 8, 8 * scale);
    ctx.restore();
  }

  const systemColors = {
    "HSS-N": "#5cab68",
    "HSS-A": "#e39c4f",
    "HSS-O": "#62c6d1",
    "HSS-U": "#4f8df1",
    "HSS-F": "#9f8566"
  };
  for (const unit of report.hssUnits) {
    if (!unit.position) {
      continue;
    }
    const mapped = mapPoint(unit.position);
    ctx.save();
    ctx.fillStyle = systemColors[unit.systemCode] || "#555";
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawReportNorthArrow(ctx, rect, scale);
  ctx.restore();
}

function ballisticsPathPoints(ballistic) {
  return Array.isArray(ballistic?.route) ? ballistic.route.filter(Boolean) : [];
}

function drawReportNorthArrow(ctx, rect, scale) {
  const x = rect.x + rect.w - 24 * scale;
  const y = rect.y + 12 * scale;
  ctx.save();
  ctx.strokeStyle = "#e5524d";
  ctx.fillStyle = "#e5524d";
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y + 22 * scale);
  ctx.lineTo(x, y + 48 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + 8 * scale);
  ctx.lineTo(x - 6 * scale, y + 20 * scale);
  ctx.lineTo(x + 6 * scale, y + 20 * scale);
  ctx.closePath();
  ctx.fill();
  drawCanvasText(ctx, "N", x - 8 * scale, y + 50 * scale, 9 * scale, { bold: true, color: "#e5524d", maxWidth: 16 * scale, align: "center" });
  ctx.restore();
}

function drawReportLegend(ctx, rect, scale) {
  const items = [
    ["Korunan", "#d7c493"],
    ["HSS-N", "#5cab68"],
    ["HSS-A", "#e39c4f"],
    ["HSS-O", "#62c6d1"],
    ["HSS-U", "#4f8df1"],
    ["HSS-F", "#9f8566"],
    ["Platform", "#c24cf0"],
    ["Payload", "#7a3db8"],
    ["Balistik", "#e5524d"]
  ];
  let x = rect.x;
  for (const item of items) {
    ctx.save();
    ctx.fillStyle = item[1];
    ctx.beginPath();
    ctx.arc(x + 4 * scale, rect.y + 5 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawCanvasText(ctx, item[0], x + 12 * scale, rect.y - 1 * scale, 8 * scale);
    x += 68 * scale;
  }
}

async function loadImageSafe(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function buildPdfDocumentFromPages(pages, pageWidthPt, pageHeightPt) {
  const encoder = new TextEncoder();
  const objects = new Map();
  const pageObjectNumbers = [];
  const totalPages = pages.length;
  let nextObjectNumber = 3;

  for (let index = 0; index < totalPages; index += 1) {
    const imageObjectNumber = nextObjectNumber;
    const contentObjectNumber = nextObjectNumber + 1;
    const pageObjectNumber = nextObjectNumber + 2;
    nextObjectNumber += 3;
    pageObjectNumbers.push(pageObjectNumber);

    const base64 = String(pages[index].dataUrl || "").split(",")[1] || "";
    const imageBytes = base64ToUint8Array(base64);
    objects.set(
      imageObjectNumber,
      createPdfObject(imageObjectNumber, [
        `<< /Type /XObject /Subtype /Image /Width ${pages[index].width} /Height ${pages[index].height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
        imageBytes,
        "\nendstream"
      ])
    );

    const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im${index} Do\nQ`;
    objects.set(
      contentObjectNumber,
      createPdfObject(contentObjectNumber, [`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`])
    );

    objects.set(
      pageObjectNumber,
      createPdfObject(pageObjectNumber, [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im${index} ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
      ])
    );
  }

  objects.set(1, createPdfObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]));
  objects.set(2, createPdfObject(2, [`<< /Type /Pages /Count ${pageObjectNumbers.length} /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(" ")}] >>`]));

  const header = encoder.encode("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");
  const orderedObjectNumbers = Array.from(objects.keys()).sort((a, b) => a - b);
  const parts = [header];
  const offsets = [0];
  let currentOffset = header.length;
  for (const number of orderedObjectNumbers) {
    offsets[number] = currentOffset;
    const bytes = objects.get(number);
    parts.push(bytes);
    currentOffset += bytes.length;
  }

  const xrefStart = currentOffset;
  const xrefLines = [`xref\n0 ${orderedObjectNumbers.length + 1}\n`, "0000000000 65535 f \n"];
  for (const number of orderedObjectNumbers) {
    xrefLines.push(`${String(offsets[number]).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${orderedObjectNumbers.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  parts.push(encoder.encode(xrefLines.join("")));
  parts.push(encoder.encode(trailer));
  const totalLength = parts.reduce((sum, bytes) => sum + bytes.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function createPdfObject(objectNumber, bodyParts) {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`${objectNumber} 0 obj\n`);
  const suffix = encoder.encode(`\nendobj\n`);
  const contentParts = bodyParts.map((part) => (typeof part === "string" ? encoder.encode(part) : part));
  const totalLength = prefix.length + suffix.length + contentParts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  bytes.set(prefix, offset);
  offset += prefix.length;
  for (const part of contentParts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  bytes.set(suffix, offset);
  return bytes;
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function rotateVector(v, angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: v.x * c - v.y * s,
    y: v.x * s + v.y * c
  };
}

function normalizeVector(v) {
  const len = Math.hypot(v.x, v.y);
  if (!Number.isFinite(len) || len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

function distance2D(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function findComponentEntry(components, type) {
  return components.find((entry) => entry.type === type) || {};
}

function getSystemComponentSpec(code, assignment = null) {
  const item = state.systemCatalogByCode[code] || {};
  const components = Array.isArray(item.components) ? item.components : [];
  const radarComp = findComponentEntry(components, "Radar");
  const kkmComp = findComponentEntry(components, "KKM");
  const akrComp = findComponentEntry(components, "AKR");
  const eoComp = findComponentEntry(components, "EO");
  const ffsComp = findComponentEntry(components, "FFS");
  const ffsMinCount = Math.max(0, Math.floor(numberOrZero(ffsComp.minCount || ffsComp.count)));
  const ffsMaxCount = Math.max(ffsMinCount, Math.floor(numberOrZero(ffsComp.maxCount || ffsComp.count)));
  const fallbackFfsCount = Math.max(ffsMinCount || 1, Math.floor(numberOrZero(ffsComp.count || ffsMinCount || 1)));
  const requestedFfsCount = Math.floor(numberOrZero(
    assignment?.ffsCountPerUnit ??
    assignment?.componentConfig?.ffsCount ??
    fallbackFfsCount
  ));
  const resolvedFfsCount = clampNumber(
    Math.max(requestedFfsCount || fallbackFfsCount || 1, ffsMinCount || 1),
    Math.max(ffsMinCount || 1, 1),
    Math.max(ffsMaxCount || fallbackFfsCount || 1, 1)
  );
  const missilePerFfs = Math.max(0, Math.floor(numberOrZero(ffsComp.interceptorPerComponent)));

  return {
    radarCount: Math.max(0, Math.floor(numberOrZero(radarComp.count))),
    radarHVAValue: Math.max(1, Math.min(10, Math.floor(numberOrZero(radarComp.HVA_value) || 1))),
    kkmCount: Math.max(0, Math.floor(numberOrZero(kkmComp.count))),
    akrCount: Math.max(0, Math.floor(numberOrZero(akrComp.count))),
    eoCount: Math.max(0, Math.floor(numberOrZero(eoComp.count))),
    ffsCount: resolvedFfsCount,
    ffsMinCount: Math.max(ffsMinCount, resolvedFfsCount > 0 ? 1 : 0),
    ffsMaxCount: Math.max(ffsMaxCount, resolvedFfsCount),
    missilePerFfs,
    totalReadyMissile: resolvedFfsCount * missilePerFfs
  };
}

function formatDeploymentAssignmentSummary(assignment) {
  const componentSpec = getSystemComponentSpec(assignment.code, assignment);
  const munitionLabel = formatAssignmentMunitionSummary(assignment.code, assignment);
  const totalReadyMissile = getAssignmentTotalReadyMissile(assignment.code, assignment);
  const base = `${assignment.code}: ${assignment.count} (${munitionLabel})`;
  if (componentSpec.ffsMaxCount <= 0) {
    return base;
  }
  return `${base} | FFS/Ünite ${componentSpec.ffsCount} | Hazır Mühimmat ${totalReadyMissile}`;
}

function getSystemInfo(code) {
  return state.availableSystems.find((s) => s.code === code) || { code, role: "", radarRangeKm: 0, wezRangeKm: 0 };
}

function getEirsRadarRangeMeters() {
  const hssURangeKm = numberOrZero(getSystemInfo("HSS-U")?.radarRangeKm);
  const hssFRangeKm = numberOrZero(getSystemInfo("HSS-F")?.radarRangeKm);
  return Math.max(hssURangeKm, hssFRangeKm) * 1000;
}

function getCriteriaByCode(code) {
  return state.criteriaByCode[code] || {};
}

function normalizeThreatDirection(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "north" || normalized === "east" || normalized === "south" || normalized === "west") {
    return normalized;
  }
  return "none";
}

function getThreatDirectionAngleDeg(direction) {
  switch (normalizeThreatDirection(direction)) {
    case "north":
      return 0;
    case "east":
      return 90;
    case "south":
      return 180;
    case "west":
      return 270;
    default:
      return null;
  }
}

function getDeploymentAnglesDeg(count, threatDirection) {
  const unitCount = Math.max(0, Math.floor(Number(count) || 0));
  if (unitCount <= 0) {
    return [];
  }

  const threatAngle = getThreatDirectionAngleDeg(threatDirection);
  if (threatAngle === null) {
    return Array.from({ length: unitCount }, (_, index) => wrapAngleDeg(90 - (360 / unitCount) * index));
  }

  const rearCount = Math.min(getRearGuardCount(unitCount), Math.max(0, unitCount - 1));
  const frontCount = Math.max(1, unitCount - rearCount);
  const frontAngles = distributeAnglesWithinSector(threatAngle, 60, frontCount);
  const rearAngles = rearCount > 0
    ? distributeAnglesWithinSector(wrapAngleDeg(threatAngle + 180), 60, rearCount)
    : [];
  return [...frontAngles, ...rearAngles];
}

function getRearGuardCount(unitCount) {
  if (unitCount <= 2) {
    return 0;
  }
  if (unitCount <= 5) {
    return 1;
  }
  if (unitCount <= 7) {
    return 2;
  }
  return 3;
}

function distributeAnglesWithinSector(centerAngleDeg, halfSpanDeg, count) {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [wrapAngleDeg(centerAngleDeg)];
  }
  const start = centerAngleDeg - halfSpanDeg;
  const step = (halfSpanDeg * 2) / (count - 1);
  return Array.from({ length: count }, (_, index) => wrapAngleDeg(start + step * index));
}

function wrapAngleDeg(value) {
  const wrapped = Number(value) % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function getPointOnRadius(center, radiusM, angleDegNorthRef) {
  const rad = (wrapAngleDeg(angleDegNorthRef) * Math.PI) / 180;
  return {
    x: center.x + radiusM * Math.sin(rad),
    y: center.y + radiusM * Math.cos(rad)
  };
}

function getPlacementRadiusMeters(code, threatDirection = "none", count = 0) {
  const criteria = getCriteriaByCode(code);
  const minKm = numberOrNull(criteria.centerMinKm);
  const maxKm = numberOrNull(criteria.centerMaxKm);
  const minM = numberOrZero(minKm) * 1000;
  const maxM = numberOrZero(maxKm) * 1000;

  if (maxM > 0) {
    return maxM;
  }

  return minM;
}

function getSystemColor(code) {
  return SYSTEM_COLORS[code] || "#8fd6b9";
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    return `rgba(143,214,185,${alpha})`;
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function niceStep(target) {
  const base = 10 ** Math.floor(Math.log10(Math.max(1, target)));
  const ratio = target / base;
  if (ratio <= 1) {
    return 1 * base;
  }
  if (ratio <= 2) {
    return 2 * base;
  }
  if (ratio <= 5) {
    return 5 * base;
  }
  return 10 * base;
}

function formatMeters(value) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function createHatchPattern(targetCtx) {
  const p = document.createElement("canvas");
  p.width = 10;
  p.height = 10;
  const pctx = p.getContext("2d");
  pctx.strokeStyle = "rgba(214, 248, 225, 0.22)";
  pctx.lineWidth = 1;
  pctx.beginPath();
  pctx.moveTo(0, 10);
  pctx.lineTo(10, 0);
  pctx.stroke();
  return targetCtx.createPattern(p, "repeat");
}
