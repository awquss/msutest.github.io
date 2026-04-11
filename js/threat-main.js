import {
  popupErrors,
  distance,
  headingDeg,
  smallestAngleDiff,
  isFiniteNumber,
  isNonEmptyString,
  isPositionArray,
  round
} from "./threat-utils.js?v=20260322";
import { DATA_PATHS, DEFAULTS } from "./threat-config.js?v=20260322";
import {
  FALLBACK_THREAT_SCHEMA,
  FALLBACK_THREAT_PLATFORMS,
  FALLBACK_THREAT_WEAPONS,
  FALLBACK_THREAT_BALLISTICS
} from "./threat-fallback-data.js?v=20260322";

const SHARED_DEFENDED_ASSETS_KEY = "msu:defended_assets:v1";
const SHARED_THREAT_CATALOGS_KEY = "msu:threat_catalogs:v1";
const DEFENSE_REGIONS_STATE_KEY = "msu:defense_regions:v1";
const EDIT_THREAT_IMPORT_KEY = "msu:edit_threat_import:v1";
const WINDOW_NAME_SHARED_STATE_KEY = "msuSharedDefendedAssets";
const WINDOW_NAME_THREAT_CATALOGS_KEY = "msuSharedThreatCatalogs";
const URL_SHARED_ASSETS_PARAM = "sharedAssets";
const IS_EMBEDDED = document.documentElement.getAttribute("data-embedded") === "1";
const PARENT_DOC = getEmbeddedParentDocument();

const state = {
      schema: null,
      platforms: [],
      weapons: [],
      ballistics: [],
      sharedDefendedAssets: [],
      selectedPlatform: null,
      points: [],
      lockRouteTargetWaypoint: false,
      attackTarget: { ...DEFAULTS.attackTarget },
      attackTargetSource: { mode: "manual", defendedAssetId: "" },
      payloadEnabled: false,
      payloadRows: [],
      activePayloadRowIndex: 0,
      totManuallyEdited: false,
      canvasMode: null,
      activeTab: "kinematic",
      zoom: DEFAULTS.zoom,
      panX: 0,
      panY: 0,
      ballisticEnabled: false,
      selectedBallistic: null,
      ballisticMode: null,
      ballisticLaunch: null,
      ballisticImpact: null,
      ballisticImpactSource: { mode: "", defendedAssetId: "" },
      savedKinematicEntities: [],
      savedBallisticEntities: [],
      editingKinematicIndex: -1,
      kinematicEntityCounter: 1,
      ballisticEntityCounter: 1,
      scenario: null,
      schemaErrors: [],
      lastTimeline: null
    };

const refs = {
      status: document.getElementById("status"),
      tabButtons: Array.from(document.querySelectorAll("[data-tab-btn]")),
      tabPanes: Array.from(document.querySelectorAll("[data-tab-pane]")),
      scenarioName: document.getElementById("scenarioName"),
      attackTargetSelect: document.getElementById("attackTargetSelect"),
      totTime: document.getElementById("totTime"),
      targetX: document.getElementById("targetX"),
      targetY: document.getElementById("targetY"),
      setTargetBtn: document.getElementById("setTargetBtn"),
      targetManualActions: document.getElementById("targetManualActions"),
      targetManualCoordinateFields: document.getElementById("targetManualCoordinateFields"),
      computedTakeoffTime: document.getElementById("computedTakeoffTime"),
      platformSelect: document.getElementById("platformSelect"),
      platformInfo: document.getElementById("platformInfo"),
      routeCanvas: getSharedOrLocalElement("sharedMapCanvas", "routeCanvas"),
      pointTableBody: getSharedOrLocalElement("sharedPointTableBody", "pointTableBody"),
      undoBtn: getSharedOrLocalElement("sharedUndoBtn", "undoBtn"),
      clearBtn: getSharedOrLocalElement("sharedClearBtn", "clearBtn"),
      panLeftBtn: getSharedOrLocalElement("panLeftBtn"),
      panRightBtn: getSharedOrLocalElement("panRightBtn"),
      panUpBtn: getSharedOrLocalElement("panUpBtn"),
      panDownBtn: getSharedOrLocalElement("panDownBtn"),
      panResetBtn: getSharedOrLocalElement("panResetBtn"),
      zoomOutBtn: getSharedOrLocalElement("zoomOutBtn"),
      zoomInBtn: getSharedOrLocalElement("zoomInBtn"),
      zoomResetBtn: getSharedOrLocalElement("zoomResetBtn"),
      payloadSection: document.getElementById("payloadSection"),
      payloadWeaponField: document.getElementById("payloadWeaponField"),
      payloadTargetField: document.getElementById("payloadTargetField"),
      payloadReleaseActions: document.getElementById("payloadReleaseActions"),
      payloadPointCard: document.getElementById("payloadPointCard"),
      payloadRowSelect: document.getElementById("payloadRowSelect"),
      addPayloadBtn: document.getElementById("addPayloadBtn"),
      setReleasePointBtn: document.getElementById("setReleasePointBtn"),
      setPayloadTargetBtn: document.getElementById("setPayloadTargetBtn"),
      payloadReleaseX: document.getElementById("payloadReleaseX"),
      payloadReleaseY: document.getElementById("payloadReleaseY"),
      payloadTargetSelect: document.getElementById("payloadTargetSelect"),
      payloadTargetManualActions: document.getElementById("payloadTargetManualActions"),
      payloadTargetX: document.getElementById("payloadTargetX"),
      payloadTargetY: document.getElementById("payloadTargetY"),
      payloadPlanInfo: document.getElementById("payloadPlanInfo"),
      payloadTableBody: getSharedOrLocalElement("sharedPayloadTableBody", "payloadTableBody"),
      payloadInfo: document.getElementById("payloadInfo"),
      addKinematicEntityBtn: document.getElementById("addKinematicEntityBtn"),
      clearKinematicDraftBtn: document.getElementById("clearKinematicDraftBtn"),
      kinematicEntityTableBody: document.getElementById("kinematicEntityTableBody"),
      ballisticFields: document.getElementById("ballisticFields"),
      launchTime: document.getElementById("launchTime"),
      impactTot: document.getElementById("impactTot"),
      ballisticSelect: document.getElementById("ballisticSelect"),
      ballisticImpactSelect: document.getElementById("ballisticImpactSelect"),
      setLaunchBtn: document.getElementById("setLaunchBtn"),
      setImpactBtn: document.getElementById("setImpactBtn"),
      clearBallisticBtn: document.getElementById("clearBallisticBtn"),
      ballisticLaunchX: document.getElementById("ballisticLaunchX"),
      ballisticLaunchY: document.getElementById("ballisticLaunchY"),
      ballisticImpactX: document.getElementById("ballisticImpactX"),
      ballisticImpactY: document.getElementById("ballisticImpactY"),
      ballisticInfo: document.getElementById("ballisticInfo"),
      addBallisticEntityBtn: document.getElementById("addBallisticEntityBtn"),
      clearBallisticDraftBtn: document.getElementById("clearBallisticDraftBtn"),
      ballisticEntityTableBody: getSharedOrLocalElement("sharedBallisticEntityTableBody", "ballisticEntityTableBody"),
      ballisticGraph: document.getElementById("ballisticGraph"),
      ballisticGraphInfo: document.getElementById("ballisticGraphInfo"),
      constraintSummary: document.getElementById("constraintSummary"),
      schemaStatus: document.getElementById("schemaStatus"),
      schemaValidationList: document.getElementById("schemaValidationList"),
      downloadBtn: document.getElementById("downloadBtn"),
      output: document.getElementById("output")
    };

window.requestSharedThreatMapRender = () => {
      if (canUseSharedMapInteraction()) {
        drawCanvas();
      }
    };

window.requestThreatSharedLayoutSync = () => {
      syncParentThreatSharedCards();
    };

window.requestThreatScenarioSummary = () => {
      const platformOnly = [];
      const payloadPlatforms = [];

      for (const item of state.savedKinematicEntities) {
        const entityId = String(item?.entity?.id || "").trim();
        if (!entityId) {
          continue;
        }
        const payloadCount = Math.max(0, Number(item?.summary?.payloadCount) || 0);
        if (payloadCount > 0) {
          payloadPlatforms.push({ id: entityId, payloadCount });
        } else {
          platformOnly.push(entityId);
        }
      }

      const ballistic = state.savedBallisticEntities
        .map((item) => String(item?.entity?.id || "").trim())
        .filter(Boolean);

      return {
        platformOnly,
        payloadPlatforms,
        ballistic,
        total: platformOnly.length + payloadPlatforms.length + ballistic.length
      };
    };

window.requestThreatScenario = () => {
      const scenario = buildScenario(false) || state.scenario || null;
      return scenario && typeof scenario === "object" ? JSON.parse(JSON.stringify(scenario)) : null;
    };

window.requestThreatScenarioForExport = () => {
      const scenario = buildScenario(false) || state.scenario || null;
      if (scenario && typeof scenario === "object") {
        return JSON.parse(JSON.stringify(scenario));
      }

      const entities = [];
      for (const item of state.savedKinematicEntities) {
        if (item?.entity && typeof item.entity === "object") {
          entities.push(item.entity);
        }
      }
      for (const item of state.savedBallisticEntities) {
        if (item?.entity && typeof item.entity === "object") {
          entities.push(item.entity);
        }
      }
      if (!entities.length) {
        return null;
      }

      return {
        scenarioId: getThreatScenarioId() || "THREAT_EXPORT",
        timeStep: 1,
        planning: {
          platformTot: Math.max(0, Number(refs.totTime.value) || 0),
          payloadTots: state.payloadRows.map((row) => Math.max(0, Number(row?.targetTot) || 0)),
          ballisticLaunchTime: parseOptionalNumberInput(refs.launchTime.value),
          ballisticImpactTot: parseOptionalNumberInput(refs.impactTot.value),
          attackTarget: [round(state.attackTarget.x, 3), round(state.attackTarget.y, 3)],
          attackTargetDefinition: getCurrentAttackTargetDefinition(),
          payloadReleasePoint: null,
          payloadTargetPoint: null,
          payloadTargetDefinition: null,
          ballisticImpactDefinition: getCurrentBallisticImpactDefinition(),
          kinematicCount: state.savedKinematicEntities.length,
          ballisticCount: state.savedBallisticEntities.length
        },
        entities: JSON.parse(JSON.stringify(entities))
      };
    };

const ctx = refs.routeCanvas.getContext("2d");
const ballisticCtx = refs.ballisticGraph.getContext("2d");
const CACHE_BUST = `?v=${Date.now()}`;
let embeddedFrameResizeObserver = null;

init();

async function init() {
      try {
        clearLegacyPersistentStorage();
        const threatData = await loadThreatData();
        state.schema = threatData.schema || null;
        state.platforms = threatData.platforms || [];
        state.weapons = threatData.weapons || [];
        state.ballistics = threatData.ballistics || [];
        loadSharedDefendedAssetsFromUrl();
        loadSharedDefendedAssets();

        fillPlatformSelect();
        fillBallisticSelect();
        syncSharedTargetControls();
        refs.launchTime.value = DEFAULTS.launchTime;
        refs.impactTot.value = DEFAULTS.impactTot;
        refs.totTime.disabled = true;
        refs.totTime.readOnly = false;
        refs.computedTakeoffTime.value = "-";
        syncTargetInputs();
        syncPayloadTargetWithAttackIfNeeded();
        syncPayloadPointInputs();
        syncBallisticPointInputs();
        const importedThreatLoaded = applyImportedThreatScenarioIfPresent();
        bindEvents();
        installEmbeddedFrameAutoHeight();
        activateTab("kinematic");
        setZoom(DEFAULTS.zoom);
        renderPointTable();
        renderPayloadTable();
        renderSavedKinematicTable();
        renderSavedBallisticTable();
        updatePayloadPlanInfo();
        renderConstraintSummary();
        drawCanvas();
        drawBallisticGraph();
        if (importedThreatLoaded) {
          buildScenario(false);
          refs.status.textContent = "Veriler yüklendi. Içe aktarilan tehdit kayitlari listelendi ve duzenlemeye hazir.";
        } else {
          setSchemaValidation(["Senaryo henüz üretime hazır değil."]);
          refs.status.textContent = "Veriler yüklendi. Platform ve Balistik sekmelerinden planı tamamlayın; harita sağ üstte her zaman görünür.";
        }
        refs.status.className = "status ok";
      } catch (err) {
        refs.status.textContent = `Veri yükleme hatası: ${String(err?.message || err || "Bilinmeyen hata")}`;
        refs.status.className = "status warn";
      }
    }

    async function loadThreatData() {
      const shared = readSharedThreatCatalogs();
      if (shared) {
        return shared;
      }
      try {
        return await loadThreatDataByFetch();
      } catch (_fetchErr) {
        return loadThreatDataByFallbackModule();
      }
    }

    async function loadThreatDataByFetch() {
      const [schemaRes, platformRes, weaponRes, ballisticRes] = await Promise.all([
        fetch(`${DATA_PATHS.schema}${CACHE_BUST}`, { cache: "no-store" }),
        fetch(`${DATA_PATHS.platforms}${CACHE_BUST}`, { cache: "no-store" }),
        fetch(`${DATA_PATHS.weapons}${CACHE_BUST}`, { cache: "no-store" }),
        fetch(`${DATA_PATHS.ballistics}${CACHE_BUST}`, { cache: "no-store" })
      ]);

      if (!schemaRes.ok || !platformRes.ok || !weaponRes.ok || !ballisticRes.ok) {
        throw new Error("JSON dosyalari okunamadi");
      }

      return {
        schema: await schemaRes.json(),
        platforms: (await platformRes.json()).platforms || [],
        weapons: (await weaponRes.json()).weapons || [],
        ballistics: (await ballisticRes.json()).ballistics || []
      };
    }

    async function loadThreatDataByFallbackModule() {
      return {
        schema: FALLBACK_THREAT_SCHEMA || null,
        platforms: FALLBACK_THREAT_PLATFORMS?.platforms || [],
        weapons: FALLBACK_THREAT_WEAPONS?.weapons || [],
        ballistics: FALLBACK_THREAT_BALLISTICS?.ballistics || []
      };
    }

    function clearLegacyPersistentStorage() {
      try {
        window.localStorage.removeItem(SHARED_DEFENDED_ASSETS_KEY);
        window.localStorage.removeItem(SHARED_THREAT_CATALOGS_KEY);
        window.localStorage.removeItem(DEFENSE_REGIONS_STATE_KEY);
      } catch (_err) {
        // Ignore cleanup issues.
      }
    }

    function readSharedThreatCatalogs() {
      try {
        const windowNameState = readWindowNameState();
        const namedPayload = windowNameState[WINDOW_NAME_THREAT_CATALOGS_KEY];
        if (isThreatCatalogPayloadValid(namedPayload)) {
          return namedPayload;
        }

        const raw = window.sessionStorage.getItem(SHARED_THREAT_CATALOGS_KEY);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw);
        return isThreatCatalogPayloadValid(parsed) ? parsed : null;
      } catch (_err) {
        return null;
      }
    }

    function applyImportedThreatScenarioIfPresent() {
      let parsed;
      try {
        const raw = window.sessionStorage.getItem(EDIT_THREAT_IMPORT_KEY);
        if (!raw) {
          return false;
        }
        parsed = JSON.parse(raw);
      } catch (_err) {
        return false;
      }

      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entities)) {
        return false;
      }

      state.savedKinematicEntities = [];
      state.savedBallisticEntities = [];
      state.kinematicEntityCounter = 1;
      state.ballisticEntityCounter = 1;

      for (const entity of parsed.entities) {
        const normalized = normalizeImportedThreatEntity(entity);
        if (!normalized) {
          continue;
        }
        if (entity.entityType === "KinematicTarget") {
          state.savedKinematicEntities.push(normalized);
        } else if (entity.entityType === "BallisticTarget") {
          state.savedBallisticEntities.push(normalized);
        }
      }

      state.kinematicEntityCounter = getNextImportedThreatCounter(state.savedKinematicEntities);
      state.ballisticEntityCounter = getNextImportedThreatCounter(state.savedBallisticEntities);
      refs.scenarioName.value = String(parsed.scenarioId || "").trim();
      state.scenario = parsed;
      refs.output.value = JSON.stringify(parsed, null, 2);

      try {
        window.sessionStorage.removeItem(EDIT_THREAT_IMPORT_KEY);
      } catch (_err) {
        // Ignore cleanup issues.
      }

      notifyParentScenarioSummaryChanged();
      return true;
    }

    function normalizeImportedThreatEntity(entity) {
      if (!entity || typeof entity !== "object") {
        return null;
      }

      if (entity.entityType === "KinematicTarget") {
        return {
          summary: {
            model: entity.model || entity.id || "Platform",
            points: 1 + (Array.isArray(entity?.flightPlan?.waypoints) ? entity.flightPlan.waypoints.length : 0),
            payloadCount: Array.isArray(entity.payload) ? entity.payload.length : 0
          },
          planning: {
            platformTot: 0,
            payloadTots: Array.isArray(entity.payload)
              ? entity.payload.map((item) => Math.max(0, Number(item?.targetTot) || 0))
              : [],
            attackTarget: Array.isArray(entity?.flightPlan?.waypoints) && entity.flightPlan.waypoints.length
              ? entity.flightPlan.waypoints[entity.flightPlan.waypoints.length - 1].position
              : null,
            attackTargetDefinition: null
          },
          entity
        };
      }

      if (entity.entityType === "BallisticTarget") {
        const launch = Array.isArray(entity?.trajectory?.launchPoint) ? entity.trajectory.launchPoint : [];
        const impact = Array.isArray(entity?.trajectory?.terminal?.impactPoint) ? entity.trajectory.terminal.impactPoint : [];
        return {
          summary: {
            model: entity.model || entity.id || "Balistik",
            launch: launch.length >= 2 ? `${round(Number(launch[0]) || 0, 1)},${round(Number(launch[1]) || 0, 1)}` : "-",
            impact: impact.length >= 2 ? `${round(Number(impact[0]) || 0, 1)},${round(Number(impact[1]) || 0, 1)}` : "-",
            launchTime: round(Number(entity.launchTime) || 0, 1),
            impactTot: round(Number(entity.impactTime) || 0, 1)
          },
          entity
        };
      }

      return null;
    }

    function resetKinematicEditMode() {
      state.editingKinematicIndex = -1;
      refs.addKinematicEntityBtn.textContent = "Platform Ekle";
    }

    function setKinematicEditMode(index) {
      state.editingKinematicIndex = index;
      refs.addKinematicEntityBtn.textContent = "Platform Güncelle";
    }

    function getNextImportedThreatCounter(items) {
      let maxCounter = 0;
      for (const item of items) {
        const id = String(item?.entity?.id || "").trim();
        const match = /(?:-entity-|_)(\d+)$/i.exec(id);
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

    function isThreatCatalogPayloadValid(payload) {
      return Boolean(
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        payload.schema &&
        Array.isArray(payload.platforms) &&
        Array.isArray(payload.weapons) &&
        Array.isArray(payload.ballistics)
      );
    }

    function bindEvents() {
      bindTabEvents();
      refs.platformSelect.addEventListener("change", onPlatformChange);
      refs.routeCanvas.addEventListener("click", onCanvasClick);
      refs.undoBtn.addEventListener("click", undoPoint);
      refs.clearBtn.addEventListener("click", clearRoute);
      refs.panLeftBtn.addEventListener("click", () => nudgePan(40, 0));
      refs.panRightBtn.addEventListener("click", () => nudgePan(-40, 0));
      refs.panUpBtn.addEventListener("click", () => nudgePan(0, 40));
      refs.panDownBtn.addEventListener("click", () => nudgePan(0, -40));
      refs.panResetBtn.addEventListener("click", resetPan);
      refs.zoomInBtn.addEventListener("click", () => changeZoom(1.25));
      refs.zoomOutBtn.addEventListener("click", () => changeZoom(0.8));
      refs.zoomResetBtn.addEventListener("click", () => setZoom(DEFAULTS.zoom));
      refs.setTargetBtn.addEventListener("click", () => setCanvasMode("attackTarget"));
      refs.attackTargetSelect.addEventListener("change", onAttackTargetSourceChange);
      refs.targetX.addEventListener("input", onAttackTargetInput);
      refs.targetY.addEventListener("input", onAttackTargetInput);
      refs.totTime.addEventListener("change", onTotTimeChange);
      refs.totTime.addEventListener("blur", onTotTimeChange);

      refs.payloadRowSelect.addEventListener("change", onPayloadRowSelectChange);
      refs.payloadTargetSelect.addEventListener("change", onPayloadTargetSourceChange);
      refs.addPayloadBtn.addEventListener("click", addPayloadRow);
      refs.setReleasePointBtn.addEventListener("click", () => setCanvasMode("payloadRelease"));
      refs.setPayloadTargetBtn.addEventListener("click", () => setCanvasMode("payloadTarget"));
      const payloadPointInputs = [
        refs.payloadReleaseX,
        refs.payloadReleaseY,
        refs.payloadTargetX,
        refs.payloadTargetY
      ];
      for (const input of payloadPointInputs) {
        input.addEventListener("input", onPayloadPointInput);
      }
      refs.addKinematicEntityBtn.addEventListener("click", addCurrentKinematicToScenario);
      refs.clearKinematicDraftBtn.addEventListener("click", clearKinematicDraft);

      refs.ballisticSelect.addEventListener("change", onBallisticSelectChange);
      refs.ballisticImpactSelect.addEventListener("change", onBallisticImpactSourceChange);
      refs.setLaunchBtn.addEventListener("click", () => setBallisticMode("launch"));
      refs.setImpactBtn.addEventListener("click", () => setBallisticMode("impact"));
      refs.clearBallisticBtn.addEventListener("click", clearBallisticPoints);
      const ballisticPointInputs = [
        refs.ballisticLaunchX,
        refs.ballisticLaunchY,
        refs.ballisticImpactX,
        refs.ballisticImpactY
      ];
      for (const input of ballisticPointInputs) {
        input.addEventListener("input", onBallisticPointInput);
      }
      const ballisticTimeInputs = [refs.launchTime, refs.impactTot];
      for (const input of ballisticTimeInputs) {
        input.addEventListener("input", onBallisticTimingInput);
        input.addEventListener("change", onBallisticTimingInput);
      }
      refs.addBallisticEntityBtn.addEventListener("click", addCurrentBallisticToScenario);
      refs.clearBallisticDraftBtn.addEventListener("click", clearBallisticDraft);

      const realtimeInputs = [
        refs.scenarioName
      ];
      for (const input of realtimeInputs) {
        input.addEventListener("input", () => buildScenario(false));
      }
      refs.downloadBtn.addEventListener("click", downloadScenario);
      window.addEventListener("storage", onSharedDefendedAssetsStorage);
      window.addEventListener("focus", refreshSharedDefendedAssets);
      refs.totTime.readOnly = false;
    }

    function syncEmbeddedFrameHeight() {
      if (!IS_EMBEDDED) {
        return;
      }
      try {
        const frame = window.frameElement;
        if (!frame) {
          return;
        }
        const nextHeight = Math.max(
          720,
          document.body.scrollHeight || 0,
          document.documentElement.scrollHeight || 0
        );
        frame.style.height = `${nextHeight}px`;
      } catch (_err) {
        // Ignore cross-frame sizing errors.
      }
    }

    function installEmbeddedFrameAutoHeight() {
      if (!IS_EMBEDDED) {
        return;
      }

      syncEmbeddedFrameHeight();
      window.addEventListener("resize", syncEmbeddedFrameHeight);

      if (typeof ResizeObserver !== "function" || embeddedFrameResizeObserver) {
        return;
      }

      embeddedFrameResizeObserver = new ResizeObserver(() => {
        syncEmbeddedFrameHeight();
      });
      embeddedFrameResizeObserver.observe(document.body);
      embeddedFrameResizeObserver.observe(document.documentElement);
    }

    function getEmbeddedParentDocument() {
      try {
        if (IS_EMBEDDED && window.parent && window.parent !== window) {
          return window.parent.document;
        }
      } catch (_err) {
        return null;
      }
      return null;
    }

    function getSharedOrLocalElement(sharedId, localId = sharedId) {
      if (PARENT_DOC) {
        const sharedElement = PARENT_DOC.getElementById(sharedId);
        if (sharedElement) {
          return sharedElement;
        }
      }
      return document.getElementById(localId);
    }

    function canUseSharedMapInteraction() {
      if (!PARENT_DOC) {
        return true;
      }
      try {
        return Boolean(PARENT_DOC.querySelector('[data-tab-pane="threat"]')?.classList.contains("active"));
      } catch (_err) {
        return true;
      }
    }

    function notifyParentScenarioSummaryChanged() {
      if (!IS_EMBEDDED || !window.parent || window.parent === window) {
        return;
      }
      try {
        window.parent.syncDefenseJsonView?.();
      } catch (_err) {
        // Ignore parent bridge errors.
      }
    }

    function bindTabEvents() {
      for (const btn of refs.tabButtons) {
        btn.addEventListener("click", () => activateTab(btn.dataset.tabBtn));
      }
    }

    function loadSharedDefendedAssets() {
      try {
        const windowNameState = readWindowNameState();
        const sharedPayload = windowNameState[WINDOW_NAME_SHARED_STATE_KEY];
        const namedAssets = Array.isArray(sharedPayload?.assets) ? sharedPayload.assets : [];
        if (namedAssets.length > 0) {
          state.sharedDefendedAssets = namedAssets.map(normalizeSharedDefendedAsset).filter(Boolean);
          return;
        }

        const raw = window.sessionStorage.getItem(SHARED_DEFENDED_ASSETS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const assets = Array.isArray(parsed?.assets) ? parsed.assets : [];
          if (assets.length > 0) {
            state.sharedDefendedAssets = assets.map(normalizeSharedDefendedAsset).filter(Boolean);
            return;
          }
        }

        const fallbackRaw = window.sessionStorage.getItem(DEFENSE_REGIONS_STATE_KEY);
        if (!fallbackRaw) {
          state.sharedDefendedAssets = [];
          return;
        }

        const fallbackParsed = JSON.parse(fallbackRaw);
        const regions = Array.isArray(fallbackParsed?.regions) ? fallbackParsed.regions : [];
        state.sharedDefendedAssets = regions
          .map(regionToSharedDefendedAsset)
          .filter(Boolean);
      } catch (_err) {
        state.sharedDefendedAssets = [];
      }
    }

    function refreshSharedDefendedAssets() {
      loadSharedDefendedAssets();
      syncSharedTargetControls();
      drawCanvas();
      buildScenario(false);
      const count = state.sharedDefendedAssets.length;
      refs.status.textContent = count > 0
        ? `${count} savunma hedefi yuklendi.`
        : "Savunma hedefi bulunamadi.";
      refs.status.className = count > 0 ? "status ok" : "status warn";
    }

    function onSharedDefendedAssetsStorage(event) {
      if (event.key && event.key !== SHARED_DEFENDED_ASSETS_KEY && event.key !== DEFENSE_REGIONS_STATE_KEY) {
        return;
      }
      refreshSharedDefendedAssets();
    }

    function getDefendedAssetById(id) {
      return state.sharedDefendedAssets.find((item) => item.id === id) || null;
    }

    function getDefendedAssetCenter(id) {
      const asset = getDefendedAssetById(id);
      if (!asset?.center) {
        return null;
      }
      return {
        x: Number(asset.center.x) || 0,
        y: Number(asset.center.y) || 0
      };
    }

    function normalizeSharedDefendedAsset(asset) {
      const id = String(asset?.id || "").trim();
      const name = String(asset?.name || "").trim();
      if (!id || !name) {
        return null;
      }

      const type = asset?.type === "area" ? "area" : "point";
      const center = {
        x: Number(asset?.center?.x) || 0,
        y: Number(asset?.center?.y) || 0
      };
      const points = Array.isArray(asset?.points)
        ? asset.points.map((point) => ({
            x: Number(point?.x) || 0,
            y: Number(point?.y) || 0
          }))
        : [];

      return {
        id,
        name,
        assetClass: String(asset?.assetClass || "").trim(),
        componentRole: String(asset?.componentRole || "").trim(),
        parentUnitId: String(asset?.parentUnitId || "").trim(),
        type,
        HVA_value: Number(asset?.HVA_value) || 1,
        center,
        points
      };
    }

    function loadSharedDefendedAssetsFromUrl() {
      try {
        const url = new URL(window.location.href);
        const encoded = url.searchParams.get(URL_SHARED_ASSETS_PARAM);
        if (!encoded) {
          return;
        }

        const payload = decodeSharedAssetsPayload(encoded);
        const assets = Array.isArray(payload?.assets) ? payload.assets : [];
        if (!assets.length) {
          return;
        }

        persistSharedDefendedAssetsPayload(payload);
        state.sharedDefendedAssets = assets.map(normalizeSharedDefendedAsset).filter(Boolean);
        url.searchParams.delete(URL_SHARED_ASSETS_PARAM);
        window.history.replaceState({}, document.title, url.toString());
      } catch (_err) {
        // Ignore malformed query payloads.
      }
    }

    function persistSharedDefendedAssetsPayload(payload) {
      try {
        window.sessionStorage.setItem(SHARED_DEFENDED_ASSETS_KEY, JSON.stringify(payload));
      } catch (_err) {}

      try {
        const base = readWindowNameState();
        base[WINDOW_NAME_SHARED_STATE_KEY] = payload;
        window.name = JSON.stringify(base);
      } catch (_err) {}
    }

    function decodeSharedAssetsPayload(encoded) {
      const normalized = String(encoded || "").replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json);
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

    function regionToSharedDefendedAsset(region) {
      const id = String(region?.id || "").trim();
      const name = String(region?.name || "").trim();
      const type = region?.type === "area" ? "area" : "point";
      const points = Array.isArray(region?.points)
        ? region.points.map((point) => ({
            x: Number(point?.x) || 0,
            y: Number(point?.y) || 0
          }))
        : [];

      if (!id || !name || points.length === 0) {
        return null;
      }

      const center = computeSharedRegionCenter(type, points);
      return {
        id,
        name,
        assetClass: "protectedAsset",
        componentRole: "",
        parentUnitId: "",
        type,
        HVA_value: Number(region?.hvaValue) || 1,
        center,
        points
      };
    }

    function computeSharedRegionCenter(type, points) {
      if (!Array.isArray(points) || points.length === 0) {
        return { x: 0, y: 0 };
      }
      if (type === "point") {
        return { x: Number(points[0].x) || 0, y: Number(points[0].y) || 0 };
      }

      let sx = 0;
      let sy = 0;
      for (const point of points) {
        sx += Number(point?.x) || 0;
        sy += Number(point?.y) || 0;
      }
      return {
        x: sx / points.length,
        y: sy / points.length
      };
    }

    function getTargetClassLabel(asset) {
      const assetClass = String(asset?.assetClass || "").trim();
      if (assetClass === "launcher") {
        return "Lançer";
      }
      if (assetClass === "hssRadar") {
        return "HSS Radar";
      }
      if (assetClass === "eirsRadar") {
        return "EİRS";
      }
      return "Korunacak Varlık";
    }

    function formatTargetOptionLabel(asset) {
      return `[${getTargetClassLabel(asset)}] ${asset.id} - ${asset.name} | HVA ${asset.HVA_value ?? "-"} | (${round(asset.center?.x || 0, 1)}, ${round(asset.center?.y || 0, 1)})`;
    }

    function populateDefendedAssetSelect(select, currentId, placeholder) {
      if (!select) {
        return;
      }
      select.innerHTML = "";
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = placeholder;
      select.appendChild(empty);
      for (const asset of state.sharedDefendedAssets) {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = formatTargetOptionLabel(asset);
        select.appendChild(option);
      }
      select.value = currentId || "";
    }

    function populateTargetSourceSelect(select, source, manualLabel) {
      if (!select) {
        return;
      }
      select.innerHTML = "";

      const manualOption = document.createElement("option");
      manualOption.value = "manual";
      manualOption.textContent = manualLabel;
      select.appendChild(manualOption);

      for (const asset of state.sharedDefendedAssets) {
        const option = document.createElement("option");
        option.value = `asset:${asset.id}`;
        option.textContent = formatTargetOptionLabel(asset);
        select.appendChild(option);
      }

      select.value = source?.mode === "defendedAsset" && source?.defendedAssetId
        ? `asset:${source.defendedAssetId}`
        : "manual";
    }

    function populateBallisticImpactSelect() {
      if (!refs.ballisticImpactSelect) {
        return;
      }
      refs.ballisticImpactSelect.innerHTML = "";

      refs.ballisticImpactSelect.appendChild(new Option("Impact hedefi seçiniz", ""));
      refs.ballisticImpactSelect.appendChild(new Option("Manuel Koordinat", "manual"));

      for (const asset of state.sharedDefendedAssets) {
        refs.ballisticImpactSelect.appendChild(
          new Option(
            formatTargetOptionLabel(asset),
            `asset:${asset.id}`
          )
        );
      }

      refs.ballisticImpactSelect.value = state.ballisticImpactSource.mode === "defendedAsset" && state.ballisticImpactSource.defendedAssetId
        ? `asset:${state.ballisticImpactSource.defendedAssetId}`
        : state.ballisticImpactSource.mode === "manual"
          ? "manual"
          : "";
    }

    function populatePayloadTargetSelect() {
      if (!refs.payloadTargetSelect) {
        return;
      }
      const activeRow = getActivePayloadRow();
      refs.payloadTargetSelect.innerHTML = "";

      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "Payload hedefi seçiniz";
      refs.payloadTargetSelect.appendChild(emptyOption);

      const attackTargetOption = document.createElement("option");
      attackTargetOption.value = "attackTarget";
      attackTargetOption.textContent = "Platform Hedefini Kullan";
      refs.payloadTargetSelect.appendChild(attackTargetOption);

      const manualOption = document.createElement("option");
      manualOption.value = "manual";
      manualOption.textContent = "Manuel Koordinat";
      refs.payloadTargetSelect.appendChild(manualOption);

      for (const asset of state.sharedDefendedAssets) {
        const option = document.createElement("option");
        option.value = `asset:${asset.id}`;
        option.textContent = formatTargetOptionLabel(asset);
        refs.payloadTargetSelect.appendChild(option);
      }

      refs.payloadTargetSelect.value = activeRow?.targetSource?.mode === "defendedAsset" && activeRow?.targetSource?.defendedAssetId
        ? `asset:${activeRow.targetSource.defendedAssetId}`
        : activeRow?.targetSource?.mode === "manual"
          ? "manual"
          : activeRow?.targetSource?.mode === "attackTarget"
            ? "attackTarget"
            : "";
    }

    function getActivePayloadRow() {
      if (!Array.isArray(state.payloadRows) || state.payloadRows.length === 0) {
        return null;
      }
      const index = Math.max(0, Math.min(state.payloadRows.length - 1, Number(state.activePayloadRowIndex) || 0));
      state.activePayloadRowIndex = index;
      return state.payloadRows[index] || null;
    }

    function syncPayloadRowSelect() {
      if (!refs.payloadRowSelect) {
        return;
      }

      refs.payloadRowSelect.innerHTML = "";
      if (state.payloadRows.length === 0) {
        refs.payloadRowSelect.appendChild(new Option("Payload seçiniz", ""));
        refs.payloadRowSelect.disabled = true;
        return;
      }

      const activeRow = getActivePayloadRow();
      refs.payloadRowSelect.disabled = false;
      refs.payloadRowSelect.appendChild(new Option("Payload seçiniz", ""));
      for (const weapon of state.weapons) {
        refs.payloadRowSelect.appendChild(
          new Option(`${weapon.id} - ${weapon.model} (${normalizePayloadCategory(weapon.category)})`, weapon.id)
        );
      }
      refs.payloadRowSelect.value = activeRow?.weaponId || "";
    }

    function getWeaponLabel(weaponId) {
      const weapon = state.weapons.find((w) => w.id === weaponId);
      return weapon ? `${weapon.id} - ${weapon.model} (${normalizePayloadCategory(weapon.category)})` : weaponId || "-";
    }

    function buildPayloadInstanceId(payloadRows, index) {
      const row = payloadRows[index] || {};
      const weaponId = String(row.weaponId || "WP").trim();
      let occurrence = 0;
      for (let i = 0; i <= index; i += 1) {
        if (String(payloadRows[i]?.weaponId || "").trim() === weaponId) {
          occurrence += 1;
        }
      }
      return `${weaponId}_${String(Math.max(1, occurrence)).padStart(2, "0")}`;
    }

    function getWeaponCatalogIdFromPayload(payload) {
      const rawId = String(payload?.weaponId || payload?.catalogId || payload?.id || "").trim();
      if (state.weapons.some((weapon) => weapon.id === rawId)) {
        return rawId;
      }
      const indexedMatch = /^(.+?)_\d+$/i.exec(rawId);
      if (indexedMatch && state.weapons.some((weapon) => weapon.id === indexedMatch[1])) {
        return indexedMatch[1];
      }
      return rawId;
    }

    function createPayloadRow() {
      return {
        weaponId: "",
        targetTot: null,
        releaseTime: null,
        weaponFlightTime: null,
        releaseOffset: 0,
        releasePoint: null,
        targetPoint: null,
        targetSource: { mode: "", defendedAssetId: "" },
        targetManual: false
      };
    }

    function syncSharedTargetControls() {
      populateTargetSourceSelect(refs.attackTargetSelect, state.attackTargetSource, "Manuel Koordinat");
      syncPayloadRowSelect();
      populatePayloadTargetSelect();
      populateBallisticImpactSelect();
      syncAttackTargetWithSource();
      syncPayloadTargetWithSource();
      syncBallisticImpactWithSource();
      syncTargetInputs();
      syncPayloadPointInputs();
      syncBallisticPointInputs();
    }

    function syncAttackTargetWithSource() {
      if (state.attackTargetSource.mode === "defendedAsset") {
        const selectedId =
          parseAssetIdFromSelectValue(refs.attackTargetSelect.value) ||
          state.attackTargetSource.defendedAssetId ||
          state.sharedDefendedAssets[0]?.id ||
          "";
        const point = getDefendedAssetCenter(selectedId);
        if (point && selectedId) {
          state.attackTargetSource.defendedAssetId = selectedId;
          state.attackTarget = { x: point.x, y: point.y };
        } else if (state.sharedDefendedAssets.length === 0) {
          state.attackTargetSource.mode = "manual";
          state.attackTargetSource.defendedAssetId = "";
        }
      }
      refs.attackTargetSelect.value = state.attackTargetSource.mode === "defendedAsset" && state.attackTargetSource.defendedAssetId
        ? `asset:${state.attackTargetSource.defendedAssetId}`
        : "manual";
      const isManual = state.attackTargetSource.mode === "manual";
      refs.targetX.readOnly = !isManual;
      refs.targetY.readOnly = !isManual;
      refs.setTargetBtn.disabled = !isManual;
      if (refs.targetManualActions) {
        refs.targetManualActions.hidden = !isManual;
        refs.targetManualActions.style.display = isManual ? "" : "none";
      }
      if (refs.targetManualCoordinateFields) {
        refs.targetManualCoordinateFields.hidden = !isManual;
        refs.targetManualCoordinateFields.style.display = isManual ? "" : "none";
      }
    }

    function syncPayloadTargetWithSource() {
      const row = getActivePayloadRow();
      if (!row || !row.weaponId) {
        refs.payloadTargetSelect.value = "";
        refs.payloadTargetX.value = "";
        refs.payloadTargetY.value = "";
        refs.payloadReleaseX.value = "";
        refs.payloadReleaseY.value = "";
        refs.payloadTargetX.readOnly = true;
        refs.payloadTargetY.readOnly = true;
        refs.setPayloadTargetBtn.disabled = true;
        if (refs.payloadTargetManualActions) {
          refs.payloadTargetManualActions.hidden = true;
        }
        updatePayloadFormVisibility();
        return;
      }

      if (!row.targetSource?.mode) {
        row.targetPoint = null;
      } else if (row.targetSource.mode === "attackTarget") {
        row.targetPoint = { x: state.attackTarget.x, y: state.attackTarget.y };
        row.targetManual = false;
      } else if (row.targetSource.mode === "defendedAsset") {
        const selectedId =
          parseAssetIdFromSelectValue(refs.payloadTargetSelect.value) ||
          row.targetSource.defendedAssetId ||
          state.sharedDefendedAssets[0]?.id ||
          "";
        const point = getDefendedAssetCenter(selectedId);
        if (point && selectedId) {
          row.targetSource.defendedAssetId = selectedId;
          row.targetPoint = { x: point.x, y: point.y };
          row.targetManual = false;
        } else if (state.sharedDefendedAssets.length === 0) {
          row.targetSource.mode = "attackTarget";
          row.targetSource.defendedAssetId = "";
          row.targetPoint = { x: state.attackTarget.x, y: state.attackTarget.y };
        }
      } else if (!row.targetPoint) {
        row.targetPoint = { x: state.attackTarget.x, y: state.attackTarget.y };
      }

      refs.payloadTargetSelect.value = row.targetSource.mode === "defendedAsset" && row.targetSource.defendedAssetId
        ? `asset:${row.targetSource.defendedAssetId}`
        : row.targetSource.mode === "manual"
          ? "manual"
          : "attackTarget";
      const isManual = row.targetSource.mode === "manual";
      refs.payloadTargetX.readOnly = !isManual;
      refs.payloadTargetY.readOnly = !isManual;
      refs.setPayloadTargetBtn.disabled = !isManual;
      if (refs.payloadTargetManualActions) {
        refs.payloadTargetManualActions.hidden = !isManual;
      }
      updatePayloadFormVisibility();
    }

    function syncBallisticImpactWithSource() {
      if (state.ballisticImpactSource.mode === "defendedAsset") {
        const selectedId =
          parseAssetIdFromSelectValue(refs.ballisticImpactSelect.value) ||
          state.ballisticImpactSource.defendedAssetId ||
          state.sharedDefendedAssets[0]?.id ||
          "";
        const point = getDefendedAssetCenter(selectedId);
        if (point && selectedId) {
          state.ballisticImpactSource.defendedAssetId = selectedId;
          state.ballisticImpact = { x: point.x, y: point.y };
        } else if (state.sharedDefendedAssets.length === 0) {
          state.ballisticImpactSource.mode = "manual";
          state.ballisticImpactSource.defendedAssetId = "";
        }
      }
      refs.ballisticImpactSelect.value = state.ballisticImpactSource.mode === "defendedAsset" && state.ballisticImpactSource.defendedAssetId
        ? `asset:${state.ballisticImpactSource.defendedAssetId}`
        : state.ballisticImpactSource.mode === "manual"
          ? "manual"
          : "";
      const isManual = state.ballisticImpactSource.mode === "manual";
      refs.ballisticImpactX.readOnly = !isManual;
      refs.ballisticImpactY.readOnly = !isManual;
      refs.setImpactBtn.disabled = !isManual;
      refs.setImpactBtn.hidden = !isManual;
      refs.setImpactBtn.style.display = isManual ? "" : "none";
    }

    function onAttackTargetSourceChange() {
      const assetId = parseAssetIdFromSelectValue(refs.attackTargetSelect.value);
      state.attackTargetSource.mode = assetId ? "defendedAsset" : "manual";
      state.attackTargetSource.defendedAssetId = assetId;
      state.lockRouteTargetWaypoint = Boolean(state.selectedPlatform);
      syncAttackTargetWithSource();
      syncPayloadTargetWithSource();
      syncTargetInputs();
      syncPayloadPointInputs();
      syncLockedRouteTarget();
      syncAllPayloadTimingRows();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      drawCanvas();
      buildScenario(false);
    }

    function onPayloadTargetSourceChange() {
      const row = getActivePayloadRow();
      if (!row) {
        return;
      }
      const raw = String(refs.payloadTargetSelect.value || "").trim();
      const assetId = parseAssetIdFromSelectValue(raw);
      if (assetId) {
        row.targetSource.mode = "defendedAsset";
        row.targetSource.defendedAssetId = assetId;
      } else if (!raw) {
        row.targetSource.mode = "";
        row.targetSource.defendedAssetId = "";
        row.targetPoint = null;
        row.targetManual = false;
      } else {
        row.targetSource.mode = raw === "manual" ? "manual" : "attackTarget";
        row.targetSource.defendedAssetId = "";
      }
      if (row.targetSource.mode === "manual") {
        row.targetManual = true;
      }
      syncPayloadTargetWithSource();
      syncPayloadPointInputs();
      syncAllPayloadTimingRows();
      renderPayloadTable();
      updatePayloadPlanInfo();
      drawCanvas();
      buildScenario(false);
    }

    function onBallisticImpactSourceChange() {
      const raw = String(refs.ballisticImpactSelect.value || "").trim();
      const assetId = parseAssetIdFromSelectValue(raw);
      if (assetId) {
        state.ballisticImpactSource.mode = "defendedAsset";
        state.ballisticImpactSource.defendedAssetId = assetId;
      } else if (raw === "manual") {
        state.ballisticImpactSource.mode = "manual";
        state.ballisticImpactSource.defendedAssetId = "";
      } else {
        state.ballisticImpactSource.mode = "";
        state.ballisticImpactSource.defendedAssetId = "";
        state.ballisticImpact = null;
      }
      syncBallisticImpactWithSource();
      syncBallisticPointInputs();
      autoFillBallisticTimingFromPoints();
      updateBallisticInfo();
      drawCanvas();
      buildScenario(false);
    }

    function parseAssetIdFromSelectValue(value) {
      const raw = String(value || "").trim();
      return raw.startsWith("asset:") ? raw.slice(6) : "";
    }

    function activateTab(tabName) {
      state.activeTab = tabName;
      state.canvasMode = null;
      state.ballisticMode = null;
      if (tabName !== "ballistic") {
        resetBallisticDraftState();
      }
      for (const btn of refs.tabButtons) {
        btn.classList.toggle("active", btn.dataset.tabBtn === tabName);
      }
      for (const pane of refs.tabPanes) {
        pane.classList.toggle("active", pane.dataset.tabPane === tabName);
      }
      if (tabName === "ballistic") {
        drawBallisticGraph();
      }
      syncParentThreatSharedCards();
      drawCanvas();
    }

    function syncParentThreatSharedCards() {
      if (!PARENT_DOC) {
        return;
      }
      try {
        const pointCard = PARENT_DOC.getElementById("sharedThreatPointCard");
        const payloadCard = PARENT_DOC.getElementById("sharedThreatPayloadCard");
        const ballisticCard = PARENT_DOC.getElementById("sharedThreatBallisticCard");
        const isBallisticTab = state.activeTab === "ballistic";

        if (pointCard) {
          pointCard.hidden = isBallisticTab;
          pointCard.style.display = isBallisticTab ? "none" : "";
        }
        if (payloadCard) {
          payloadCard.hidden = isBallisticTab;
          payloadCard.style.display = isBallisticTab ? "none" : "";
        }
        if (ballisticCard) {
          ballisticCard.hidden = !isBallisticTab;
          ballisticCard.style.display = isBallisticTab ? "" : "none";
        }
      } catch (_err) {
        // Ignore parent layout sync errors.
      }
    }

    function fillPlatformSelect() {
      refs.platformSelect.innerHTML = "";
      refs.platformSelect.appendChild(new Option("Platform seçiniz", ""));
      for (const p of state.platforms) {
        refs.platformSelect.appendChild(new Option(`${p.model} (${p.category}) - ${p.id}`, p.id));
      }
    }

    function fillBallisticSelect() {
      refs.ballisticSelect.innerHTML = "";
      refs.ballisticSelect.appendChild(new Option("Balistik model seçiniz", ""));
      for (const b of state.ballistics) {
        refs.ballisticSelect.appendChild(new Option(`${b.model} (${b.category}) - ${b.id}`, b.id));
      }
    }

    function changeZoom(multiplier) {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      setZoom(state.zoom * multiplier);
    }

    function nudgePan(dx, dy) {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      state.panX += dx;
      state.panY += dy;
      drawCanvas();
    }

    function resetPan() {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      state.panX = 0;
      state.panY = 0;
      drawCanvas();
    }

    function setZoom(nextZoom) {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      state.zoom = Math.max(0.02, Math.min(25, Number(nextZoom) || DEFAULTS.zoom));
      drawCanvas();
    }

    function getMapScaleMetersPerPixel() {
      return DEFAULTS.mapScale;
    }

    function pxToWorld(px) {
      return (px * getMapScaleMetersPerPixel()) / state.zoom;
    }

    function applyViewTransform() {
      const cx = refs.routeCanvas.width / 2;
      const cy = refs.routeCanvas.height / 2;
      const tx = state.panX + cx;
      const ty = state.panY + cy;
      const scale = state.zoom / getMapScaleMetersPerPixel();
      // Use math-style coordinates on the map: +Y points to north (up).
      ctx.setTransform(scale, 0, 0, -scale, tx, ty);
    }

    function screenToWorld(sx, sy) {
      const cx = refs.routeCanvas.width / 2;
      const cy = refs.routeCanvas.height / 2;
      const tx = state.panX + cx;
      const ty = state.panY + cy;
      const scale = state.zoom / getMapScaleMetersPerPixel();
      return {
        x: (sx - tx) / scale,
        y: (ty - sy) / scale
      };
    }

    function drawWorldLabel(text, x, y) {
      // Counter-flip text so labels stay upright after Y-axis inversion.
      ctx.save();
      ctx.scale(1, -1);
      ctx.fillText(text, x, -y);
      ctx.restore();
    }

    function setCanvasMode(mode) {
      const payloadRouteState = getPayloadRouteState();
      if ((mode === "payloadRelease" || mode === "payloadTarget") && !payloadRouteState.ready) {
        popupErrors([payloadRouteState.message]);
        return;
      }
      if ((mode === "payloadRelease" || mode === "payloadTarget") && !state.payloadEnabled) {
        popupErrors(["Önce en az bir payload ekleyin."]);
        return;
      }
      state.ballisticMode = null;
      state.canvasMode = mode;
      const labels = {
        attackTarget: "Tehdit noktası seçme modu aktif.",
        payloadRelease: "Release noktası seçme modu aktif.",
        payloadTarget: "Payload hedefi seçme modu aktif."
      };
      refs.status.textContent = labels[mode] || "Harita seçim modu aktif.";
      refs.status.className = "status info";
      updateBallisticInfo();
    }

    function onAttackTargetInput() {
      state.attackTargetSource.mode = "manual";
      state.attackTargetSource.defendedAssetId = "";
      refs.attackTargetSelect.value = "manual";
      state.lockRouteTargetWaypoint = Boolean(state.selectedPlatform);
      const x = Number(refs.targetX.value);
      const y = Number(refs.targetY.value);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }
      state.attackTarget = { x, y };
      syncAttackTargetWithSource();
      syncPayloadTargetWithAttackIfNeeded();
      syncPayloadPointInputs();
      syncLockedRouteTarget();
      syncAllPayloadTimingRows();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function syncTargetInputs() {
      refs.targetX.value = round(state.attackTarget.x, 1);
      refs.targetY.value = round(state.attackTarget.y, 1);
      refs.attackTargetSelect.value =
        state.attackTargetSource.mode === "defendedAsset" && state.attackTargetSource.defendedAssetId
          ? `asset:${state.attackTargetSource.defendedAssetId}`
          : "manual";
    }

    function isLockedTargetWaypointIndex(index) {
      return state.lockRouteTargetWaypoint && state.points.length > 1 && index === state.points.length - 1;
    }

    function syncLockedRouteTarget() {
      if (!state.lockRouteTargetWaypoint || !state.selectedPlatform || state.points.length === 0) {
        return;
      }

      if (state.points.length === 1) {
        state.points.push({
          x: state.attackTarget.x,
          y: state.attackTarget.y,
          altitude: state.points[0].altitude,
          speed: state.points[0].speed
        });
        return;
      }

      const last = state.points[state.points.length - 1];
      last.x = state.attackTarget.x;
      last.y = state.attackTarget.y;
    }

    function buildNextRoutePoints(candidatePoint) {
      const nextPoints = state.points.map((point) => ({ ...point }));
      if (state.lockRouteTargetWaypoint && nextPoints.length >= 2) {
        nextPoints.splice(nextPoints.length - 1, 0, candidatePoint);
      } else {
        nextPoints.push(candidatePoint);
      }
      if (state.lockRouteTargetWaypoint) {
        const savedPoints = state.points;
        state.points = nextPoints;
        syncLockedRouteTarget();
        const lockedPoints = state.points.map((point) => ({ ...point }));
        state.points = savedPoints;
        return lockedPoints;
      }
      return nextPoints;
    }

    function syncPayloadTargetWithAttackIfNeeded() {
      for (const row of state.payloadRows) {
        if (row.targetSource?.mode === "attackTarget" || (!row.targetManual && !row.targetPoint)) {
          row.targetPoint = { x: state.attackTarget.x, y: state.attackTarget.y };
        }
      }
    }

    function syncPayloadPointInputs() {
      syncPayloadRowSelect();
      const row = getActivePayloadRow();
      refs.payloadTargetSelect.value =
        row?.targetSource?.mode === "defendedAsset" && row?.targetSource?.defendedAssetId
          ? `asset:${row.targetSource.defendedAssetId}`
          : row?.targetSource?.mode === "manual"
            ? "manual"
            : "attackTarget";
      refs.payloadReleaseX.value = row?.releasePoint ? round(row.releasePoint.x, 2) : "";
      refs.payloadReleaseY.value = row?.releasePoint ? round(row.releasePoint.y, 2) : "";
      const targetPoint = row?.targetPoint || state.attackTarget;
      refs.payloadTargetX.value = targetPoint ? round(targetPoint.x, 2) : "";
      refs.payloadTargetY.value = targetPoint ? round(targetPoint.y, 2) : "";
      refs.setReleasePointBtn.disabled = !row;
      updatePayloadFormVisibility();
    }

    function updatePayloadFormVisibility() {
      const routeState = getPayloadRouteState();
      const row = getActivePayloadRow();
      const hasRow = Boolean(row);
      const hasWeapon = Boolean(row?.weaponId);
      const hasTargetSelection = Boolean(row?.targetSource?.mode);
      const payloadReady = routeState.ready && Boolean(state.selectedPlatform?.payloadCapable);

      if (refs.payloadSection) {
        refs.payloadSection.classList.toggle("planner-disabled", !payloadReady);
      }
      if (refs.addPayloadBtn) {
        refs.addPayloadBtn.disabled = !payloadReady;
      }

      if (refs.payloadWeaponField) {
        refs.payloadWeaponField.hidden = !payloadReady || !hasRow;
        refs.payloadWeaponField.style.display = payloadReady && hasRow ? "" : "none";
      }
      if (refs.payloadTargetField) {
        refs.payloadTargetField.hidden = !payloadReady || !hasWeapon;
        refs.payloadTargetField.style.display = payloadReady && hasWeapon ? "" : "none";
      }
      if (refs.payloadReleaseActions) {
        refs.payloadReleaseActions.hidden = !payloadReady || !hasTargetSelection;
        refs.payloadReleaseActions.style.display = payloadReady && hasTargetSelection ? "" : "none";
      }
      if (refs.payloadPointCard) {
        refs.payloadPointCard.hidden = !payloadReady || !hasTargetSelection;
        refs.payloadPointCard.style.display = payloadReady && hasTargetSelection ? "" : "none";
      }
      if (refs.payloadPlanInfo) {
        refs.payloadPlanInfo.hidden = payloadReady ? !hasRow : false;
        if (!payloadReady) {
          refs.payloadPlanInfo.textContent = routeState.message;
        }
      }
    }

    function getPayloadRouteState() {
      if (!state.selectedPlatform) {
        return { ready: false, message: "Önce platform seçin." };
      }
      if (state.points.length < 2) {
        return { ready: false, message: "Önce platform rotasını haritada en az iki nokta ile tanımlayın." };
      }
      const routeErrors = validateAllPoints(state.points, state.selectedPlatform);
      if (routeErrors.length > 0) {
        return { ready: false, message: "Önce geçerli platform rotasını tamamlayın." };
      }
      return { ready: true, message: "" };
    }

    function getPayloadTimingReleasePoint(row) {
      if (!row?.releasePoint) {
        return null;
      }
      if (state.points.length < 2) {
        return {
          ...row.releasePoint,
          time: 0,
          distMeters: 0,
          altitude: Number(state.points[0]?.altitude ?? 0),
          speed: Number(state.points[0]?.speed ?? 0)
        };
      }
      const projection = getRouteProjection(row.releasePoint);
      return projection || {
        ...row.releasePoint,
        time: 0,
        distMeters: Number.POSITIVE_INFINITY,
        altitude: Number(state.points[0]?.altitude ?? 0),
        speed: Number(state.points[0]?.speed ?? 0)
      };
    }

    function getPayloadTimingTargetPoint(row) {
      return row?.targetSource?.mode ? (row.targetPoint || null) : null;
    }

    function getPayloadWeaponFlightTimeSeconds(row) {
      const releasePoint = getPayloadTimingReleasePoint(row);
      const targetPoint = getPayloadTimingTargetPoint(row);
      if (!releasePoint || !targetPoint) {
        return null;
      }
      const weapon = state.weapons.find((w) => w.id === row?.weaponId);
      if (!weapon) {
        return null;
      }
      const weaponSpeed = Math.max(1, ((weapon.kinematics.speed.min + weapon.kinematics.speed.max) / 2));
      return distance(releasePoint, targetPoint) / weaponSpeed;
    }

    function syncPayloadTimingRow(row) {
      if (!row) {
        return;
      }
      const platformTot = Number(refs.totTime.value);
      const route = getRouteSegments();
      const releasePoint = getPayloadTimingReleasePoint(row);
      const flightTime = getPayloadWeaponFlightTimeSeconds(row);
      if (!Number.isFinite(flightTime) || !isFiniteNumber(platformTot) || route.total <= 0 || !releasePoint) {
        row.releaseTime = null;
        row.targetTot = null;
        row.weaponFlightTime = null;
        return;
      }
      const takeoffTime = platformTot - route.total;
      const releaseRelative = Number(releasePoint.time || 0) + (Number(row.releaseOffset) || 0);
      const releaseAbs = takeoffTime + releaseRelative;
      row.releaseTime = round(releaseAbs, 2);
      row.targetTot = round(releaseAbs + flightTime, 2);
      row.weaponFlightTime = round(flightTime, 2);
    }

    function syncAllPayloadTimingRows() {
      for (const row of state.payloadRows) {
        syncPayloadTimingRow(row);
      }
    }

    function onPayloadRowSelectChange() {
      const activeRow = getActivePayloadRow();
      if (!activeRow) {
        return;
      }
      activeRow.weaponId = String(refs.payloadRowSelect.value || "").trim();
      if (!activeRow.weaponId) {
        activeRow.releaseOffset = 0;
        activeRow.releasePoint = null;
        activeRow.targetPoint = null;
        activeRow.targetSource = { mode: "", defendedAssetId: "" };
      } else {
        const weapon = state.weapons.find((item) => item.id === activeRow.weaponId);
        activeRow.releaseOffset = Number(weapon?.release?.delaySeconds || 0);
      }
      syncPayloadTimingRow(activeRow);
      populatePayloadTargetSelect();
      syncPayloadTargetWithSource();
      syncPayloadPointInputs();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
    }

    function syncBallisticPointInputs() {
      refs.ballisticLaunchX.value = state.ballisticLaunch ? round(state.ballisticLaunch.x, 2) : "";
      refs.ballisticLaunchY.value = state.ballisticLaunch ? round(state.ballisticLaunch.y, 2) : "";
      refs.ballisticImpactX.value = state.ballisticImpact ? round(state.ballisticImpact.x, 2) : "";
      refs.ballisticImpactY.value = state.ballisticImpact ? round(state.ballisticImpact.y, 2) : "";
      refs.ballisticImpactSelect.value =
        state.ballisticImpactSource.mode === "defendedAsset" && state.ballisticImpactSource.defendedAssetId
          ? `asset:${state.ballisticImpactSource.defendedAssetId}`
          : state.ballisticImpactSource.mode === "manual"
            ? "manual"
            : "";
    }

    function parseOptionalNumberInput(rawValue) {
      const raw = String(rawValue ?? "").trim();
      if (raw === "") {
        return null;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function getBallisticTimingInputs() {
      return {
        launchTime: parseOptionalNumberInput(refs.launchTime.value),
        impactTot: parseOptionalNumberInput(refs.impactTot.value)
      };
    }

    function getBallisticEstimatedFlightTimeSeconds() {
      if (!state.selectedBallistic || !state.ballisticLaunch || !state.ballisticImpact) {
        return null;
      }
      const b = state.selectedBallistic;
      const boostT = Number(b.trajectory?.boost?.duration || 0);
      const midT = Number(b.trajectory?.midcourse?.duration || 0);
      const impactSpeed = Number(b.trajectory?.terminal?.impactSpeed || 1);
      const horizontalMeters = distance(state.ballisticLaunch, state.ballisticImpact);
      const terminalT = Math.max(20, horizontalMeters / Math.max(1, impactSpeed));
      return Math.max(1, boostT + midT + terminalT);
    }

    function autoFillBallisticTimingFromPoints() {
      const estimatedFlight = getBallisticEstimatedFlightTimeSeconds();
      if (!Number.isFinite(estimatedFlight)) {
        return;
      }
      refs.launchTime.value = String(DEFAULTS.launchTime);
      refs.impactTot.value = String(round(estimatedFlight, 2));
    }

    function onBallisticTimingInput(event) {
      const estimatedFlight = getBallisticEstimatedFlightTimeSeconds();
      const impactTot = parseOptionalNumberInput(refs.impactTot.value);
      if (Number.isFinite(estimatedFlight) && event?.target === refs.launchTime && Number.isFinite(parseOptionalNumberInput(refs.launchTime.value))) {
        const nextImpact = Number(refs.launchTime.value) + estimatedFlight;
        refs.impactTot.value = String(round(nextImpact, 2));
      }
      if (Number.isFinite(estimatedFlight) && event?.target === refs.impactTot && Number.isFinite(impactTot)) {
        const nextLaunch = impactTot - estimatedFlight;
        refs.launchTime.value = String(round(nextLaunch, 2));
      }

      updateBallisticInfo();
      renderConstraintSummary();
      buildScenario(false);
    }

    function onPayloadPointInput(event) {
      const row = getActivePayloadRow();
      if (!row) {
        return;
      }
      const pointKey = event.target.dataset.point;
      const axis = event.target.dataset.axis;
      if ((pointKey !== "release" && pointKey !== "target") || (axis !== "x" && axis !== "y")) {
        return;
      }

      const xInput = pointKey === "release" ? refs.payloadReleaseX : refs.payloadTargetX;
      const yInput = pointKey === "release" ? refs.payloadReleaseY : refs.payloadTargetY;
      const nextX = parseOptionalNumberInput(xInput.value);
      const nextY = parseOptionalNumberInput(yInput.value);
      const fallbackPoint = pointKey === "release"
        ? row.releasePoint
        : row.targetPoint;
      const changedValue = parseOptionalNumberInput(event.target.value);

      let updated = null;
      if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
        updated = { x: round(nextX, 2), y: round(nextY, 2) };
      } else if (fallbackPoint && Number.isFinite(changedValue)) {
        updated = {
          x: axis === "x" ? round(changedValue, 2) : fallbackPoint.x,
          y: axis === "y" ? round(changedValue, 2) : fallbackPoint.y
        };
      } else {
        return;
      }

      if (pointKey === "release") {
        row.releasePoint = updated;
      } else {
        row.targetSource.mode = "manual";
        row.targetSource.defendedAssetId = "";
        refs.payloadTargetSelect.value = "manual";
        row.targetPoint = updated;
        row.targetManual = true;
        syncPayloadTargetWithSource();
      }

      syncPayloadPointInputs();
      syncAllPayloadTimingRows();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function onBallisticPointInput(event) {
      const pointKey = event.target.dataset.point;
      const axis = event.target.dataset.axis;
      if ((pointKey !== "launch" && pointKey !== "impact") || (axis !== "x" && axis !== "y")) {
        return;
      }

      const xInput = pointKey === "launch" ? refs.ballisticLaunchX : refs.ballisticImpactX;
      const yInput = pointKey === "launch" ? refs.ballisticLaunchY : refs.ballisticImpactY;
      const nextX = parseOptionalNumberInput(xInput.value);
      const nextY = parseOptionalNumberInput(yInput.value);
      const currentPoint = pointKey === "launch" ? state.ballisticLaunch : state.ballisticImpact;
      const changedValue = parseOptionalNumberInput(event.target.value);

      let updated = null;
      if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
        updated = { x: round(nextX, 2), y: round(nextY, 2) };
      } else if (currentPoint && Number.isFinite(changedValue)) {
        updated = {
          x: axis === "x" ? round(changedValue, 2) : currentPoint.x,
          y: axis === "y" ? round(changedValue, 2) : currentPoint.y
        };
      } else {
        return;
      }

      if (pointKey === "launch") {
        state.ballisticLaunch = updated;
      } else {
        state.ballisticImpactSource.mode = "manual";
        state.ballisticImpactSource.defendedAssetId = "";
        refs.ballisticImpactSelect.value = "manual";
        state.ballisticImpact = updated;
        syncBallisticImpactWithSource();
      }

      autoFillBallisticTimingFromPoints();
      updateBallisticInfo();
      renderConstraintSummary();
      drawBallisticGraph();
      drawCanvas();
      buildScenario(false);
    }

    function onPlatformChange() {
      state.selectedPlatform = state.platforms.find((p) => p.id === refs.platformSelect.value) || null;
      state.points = [];
      state.lockRouteTargetWaypoint = Boolean(state.selectedPlatform);
      refs.output.value = "";

      if (!state.selectedPlatform) {
        refs.payloadSection.classList.add("planner-disabled");
        refs.payloadSection.hidden = true;
        refs.totTime.disabled = true;
        refs.totTime.readOnly = false;
        state.totManuallyEdited = false;
        state.payloadEnabled = false;
        state.payloadRows = [];
        state.activePayloadRowIndex = 0;
        refs.platformInfo.textContent = "Platform seçilmedi.";
        refs.payloadInfo.textContent = "Payload yok.";
        refs.computedTakeoffTime.value = "-";
        syncPayloadPointInputs();
        renderPayloadTable();
        updatePayloadPlanInfo();
        renderPointTable();
        renderConstraintSummary();
        drawCanvas();
        drawBallisticGraph();
        buildScenario(false);
        return;
      }

      refs.payloadSection.classList.remove("planner-disabled");
      refs.totTime.disabled = false;
      refs.totTime.readOnly = false;
      state.totManuallyEdited = false;
      normalizePlatformTotToRoute({ preserveManual: false });

      const p = state.selectedPlatform;
      const payloadAllowed = Boolean(p.payloadCapable);
      refs.payloadSection.hidden = !payloadAllowed;
      state.payloadRows = [];
      state.activePayloadRowIndex = 0;
      state.payloadEnabled = false;

      refs.platformInfo.innerHTML = [
        `<b>${p.model}</b> / ${p.category}`,
        `Sürat Min-Max: ${p.kinematics.speed.min} - ${p.kinematics.speed.max} m/s`,
        `Maks. Dönüş: ${p.kinematics.turnRate.maxDegPerSec} deg/s`,
        `Maks. Tırmanma: ${p.kinematics.vertical?.maxClimbRate ?? "-"} m/s`,
        `Maks. Alçalma: ${p.kinematics.vertical?.maxDescentRate ?? "-"} m/s`,
        `Payload: ${payloadAllowed ? `Evet (max ${p.maxPayloadCount})` : "Hayır"}`
      ].join(" | ");

      syncPayloadPointInputs();
      updatePayloadFormVisibility();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderPointTable();
      renderConstraintSummary();
      drawCanvas();
      drawBallisticGraph();
      buildScenario(false);
    }

    function onCanvasClick(event) {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      const rect = refs.routeCanvas.getBoundingClientRect();
      const sx = (event.clientX - rect.left) * (refs.routeCanvas.width / Math.max(1, rect.width));
      const sy = (event.clientY - rect.top) * (refs.routeCanvas.height / Math.max(1, rect.height));
      const world = screenToWorld(sx, sy);
      const x = round(world.x, 2);
      const y = round(world.y, 2);

      if (state.canvasMode === "attackTarget") {
        state.attackTargetSource.mode = "manual";
        state.attackTargetSource.defendedAssetId = "";
        refs.attackTargetSelect.value = "manual";
        state.attackTarget = { x, y };
        syncTargetInputs();
        syncAttackTargetWithSource();
        syncPayloadTargetWithAttackIfNeeded();
        syncPayloadPointInputs();
        syncLockedRouteTarget();
        syncAllPayloadTimingRows();
        renderPointTable();
        renderPayloadTable();
        state.canvasMode = null;
        refs.status.textContent = "Tehdit noktası güncellendi.";
        refs.status.className = "status ok";
        updatePayloadPlanInfo();
        renderConstraintSummary();
        drawCanvas();
        buildScenario(false);
        return;
      }

      if (state.canvasMode === "payloadRelease") {
        const row = getActivePayloadRow();
        if (!row) {
          popupErrors(["Önce düzenlenecek payload satırını seçin."]);
          return;
        }
        if (state.points.length < 2) {
          popupErrors(["Release noktası için önce rota oluşturun (en az 2 nokta)."]);
          return;
        }
        const proj = getRouteProjection({ x, y });
        if (!proj) {
          popupErrors(["Release noktası rota üzerine yerleştirilemedi."]);
          return;
        }
        row.releasePoint = { x: round(proj.x, 2), y: round(proj.y, 2) };
        syncPayloadPointInputs();
        syncAllPayloadTimingRows();
        renderPayloadTable();
        state.canvasMode = null;
        refs.status.textContent = "Payload release noktası rota üzerine sabitlendi.";
        refs.status.className = "status ok";
        updatePayloadPlanInfo();
        renderConstraintSummary();
        drawCanvas();
        buildScenario(false);
        return;
      }

      if (state.canvasMode === "payloadTarget") {
        const row = getActivePayloadRow();
        if (!row) {
          popupErrors(["Önce düzenlenecek payload satırını seçin."]);
          return;
        }
        row.targetSource.mode = "manual";
        row.targetSource.defendedAssetId = "";
        refs.payloadTargetSelect.value = "manual";
        row.targetPoint = { x, y };
        row.targetManual = true;
        syncPayloadTargetWithSource();
        syncPayloadPointInputs();
        syncAllPayloadTimingRows();
        renderPayloadTable();
        state.canvasMode = null;
        refs.status.textContent = "Payload hedef noktası güncellendi.";
        refs.status.className = "status ok";
        updatePayloadPlanInfo();
        renderConstraintSummary();
        drawCanvas();
        buildScenario(false);
        return;
      }

      if (state.activeTab === "ballistic" && state.ballisticEnabled && state.ballisticMode) {
        if (state.ballisticMode === "launch") {
          state.ballisticLaunch = { x, y };
        } else {
          state.ballisticImpactSource.mode = "manual";
          state.ballisticImpactSource.defendedAssetId = "";
          refs.ballisticImpactSelect.value = "manual";
          state.ballisticImpact = { x, y };
          syncBallisticImpactWithSource();
        }

        const ballisticErrors = validateBallisticPlan({ includeTiming: false });
        if (ballisticErrors.length > 0) {
          popupErrors(ballisticErrors);
          if (state.ballisticMode === "launch") {
            state.ballisticLaunch = null;
          } else {
            state.ballisticImpact = null;
          }
        }

        syncBallisticPointInputs();
        autoFillBallisticTimingFromPoints();
        updateBallisticInfo();
        renderConstraintSummary();
        drawCanvas();
        buildScenario(false);
        return;
      }

      if (!state.selectedPlatform) {
        return;
      }

      const lastPoint = state.points[state.points.length - 1] || null;
      const defaultSpeed = lastPoint ? lastPoint.speed : state.selectedPlatform.kinematics.speed.min;
      const defaultAltitude = lastPoint ? lastPoint.altitude : 1000;

      const candidatePoint = { x, y, altitude: defaultAltitude, speed: defaultSpeed };
      const nextPoints = buildNextRoutePoints(candidatePoint);
      const errors = validateAllPoints(nextPoints, state.selectedPlatform);
      if (errors.length > 0) {
        popupErrors(errors);
        return;
      }

      state.points = nextPoints;
      syncAllPayloadTimingRows();
      updatePayloadFormVisibility();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function undoPoint() {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      if (state.points.length === 0) {
        return;
      }
      if (state.lockRouteTargetWaypoint && state.points.length >= 2) {
        if (state.points.length === 2) {
          state.points = [];
        } else {
          state.points.splice(state.points.length - 2, 1);
        }
      } else {
        state.points.pop();
      }
      if (state.points.length < 2) {
        state.payloadRows.forEach((row) => {
          row.releasePoint = null;
        });
      }
      syncLockedRouteTarget();
      syncPayloadPointInputs();
      syncAllPayloadTimingRows();
      updatePayloadFormVisibility();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function clearRoute() {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      state.points = [];
      state.payloadRows.forEach((row) => {
        row.releasePoint = null;
      });
      syncPayloadPointInputs();
      syncAllPayloadTimingRows();
      updatePayloadFormVisibility();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function addPayloadRow() {
      if (!state.selectedPlatform || !state.selectedPlatform.payloadCapable) {
        return;
      }
      const payloadRouteState = getPayloadRouteState();
      if (!payloadRouteState.ready) {
        popupErrors([payloadRouteState.message]);
        return;
      }

      const maxCount = state.selectedPlatform.maxPayloadCount ?? 0;
      if (state.payloadRows.length >= maxCount) {
        popupErrors([`Payload adedi platform limitini aşıyor. Max: ${maxCount}`]);
        return;
      }

      if (state.weapons.length === 0) {
        popupErrors(["Silah verisi bulunamadı."]);
        return;
      }

      state.payloadRows.push(createPayloadRow());
      state.payloadEnabled = state.payloadRows.length > 0;
      state.activePayloadRowIndex = state.payloadRows.length - 1;
      syncPayloadTimingRow(state.payloadRows[state.activePayloadRowIndex]);
      syncPayloadPointInputs();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function renderPayloadTable() {
      refs.payloadTableBody.innerHTML = "";

      const maxCount = state.selectedPlatform?.maxPayloadCount ?? 0;
      const payloadRouteState = getPayloadRouteState();
      if (!state.selectedPlatform?.payloadCapable) {
        refs.payloadInfo.textContent = "Payload kapalı.";
      } else if (!payloadRouteState.ready) {
        refs.payloadInfo.textContent = payloadRouteState.message;
      } else {
        refs.payloadInfo.innerHTML = state.payloadRows.length > 0
          ? `Seçilen payload: <b>${state.payloadRows.length}</b> / ${maxCount}`
          : `Henüz payload eklenmedi. Max: ${maxCount}`;
      }

      state.payloadRows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        syncPayloadTimingRow(row);
        const releaseTimeDisplay = isFiniteNumber(row.releaseTime) ? row.releaseTime : "";
        const targetTotDisplay = isFiniteNumber(row.targetTot) ? row.targetTot : "";
        const weaponOptions = state.weapons.map((w) => {
          const selected = w.id === row.weaponId ? "selected" : "";
          return `<option value="${w.id}" ${selected}>${w.id} - ${w.model} (${normalizePayloadCategory(w.category)})</option>`;
        }).join("");

        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><select data-role="payload-weapon" data-index="${idx}">${weaponOptions}</select></td>
          <td>${row.releasePoint ? `(${round(row.releasePoint.x, 0)}, ${round(row.releasePoint.y, 0)})` : "-"}</td>
          <td>${row.targetPoint ? `(${round(row.targetPoint.x, 0)}, ${round(row.targetPoint.y, 0)})` : "-"}</td>
          <td><input type="number" min="0" step="0.1" value="${releaseTimeDisplay}" data-role="payload-release-time" data-index="${idx}" readonly></td>
          <td><input type="number" min="0" step="0.1" value="${targetTotDisplay}" data-role="payload-tot" data-index="${idx}" readonly></td>
          <td><input type="number" step="1" value="${row.releaseOffset}" data-role="payload-release" data-index="${idx}"></td>
          <td><button type="button" class="ghost" data-role="payload-edit" data-index="${idx}">Düzenle</button></td>
          <td><button type="button" class="ghost" data-role="payload-remove" data-index="${idx}">Sil</button></td>
        `;

        refs.payloadTableBody.appendChild(tr);
      });

      for (const el of refs.payloadTableBody.querySelectorAll("select[data-role='payload-weapon']")) {
        el.addEventListener("change", onPayloadRowChange);
      }
      for (const el of refs.payloadTableBody.querySelectorAll("input[data-role='payload-release']")) {
        el.addEventListener("change", onPayloadRowChange);
      }
      for (const el of refs.payloadTableBody.querySelectorAll("button[data-role='payload-remove']")) {
        el.addEventListener("click", onPayloadRemove);
      }
      for (const el of refs.payloadTableBody.querySelectorAll("button[data-role='payload-edit']")) {
        el.addEventListener("click", onPayloadEdit);
      }
    }

    function onPayloadRowChange(event) {
      const index = Number(event.target.dataset.index);
      if (!Number.isFinite(index) || index < 0 || index >= state.payloadRows.length) {
        return;
      }
      const row = state.payloadRows[index];
      const role = event.target.dataset.role;

      if (role === "payload-weapon") {
        row.weaponId = event.target.value;
      }

      if (role === "payload-release") {
        row.releaseOffset = Number(event.target.value) || 0;
      }

      syncPayloadTimingRow(row);
      syncPayloadPointInputs();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function onPayloadRemove(event) {
      const index = Number(event.target.dataset.index);
      if (!Number.isFinite(index) || index < 0 || index >= state.payloadRows.length) {
        return;
      }

      state.payloadRows.splice(index, 1);
      state.payloadEnabled = state.payloadRows.length > 0;
      state.activePayloadRowIndex = Math.max(0, Math.min(state.payloadRows.length - 1, state.activePayloadRowIndex));
      syncPayloadPointInputs();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function onPayloadEdit(event) {
      const index = Number(event.target.dataset.index);
      if (!Number.isFinite(index) || index < 0 || index >= state.payloadRows.length) {
        return;
      }
      state.activePayloadRowIndex = index;
      syncPayloadPointInputs();
      populatePayloadTargetSelect();
      syncPayloadTargetWithSource();
      renderPayloadTable();
      drawCanvas();
    }

    function onBallisticSelectChange() {
      state.selectedBallistic = state.ballistics.find((b) => b.id === refs.ballisticSelect.value) || null;
      state.ballisticEnabled = Boolean(state.selectedBallistic);
      autoFillBallisticTimingFromPoints();
      updateBallisticInfo();
      renderConstraintSummary();
      drawBallisticGraph();
      buildScenario(false);
    }

    function setBallisticMode(mode) {
      if (state.activeTab !== "ballistic") {
        return;
      }
      if (!state.ballisticEnabled || !state.selectedBallistic) {
        popupErrors(["Önce balistik modeli seçiniz."]);
        return;
      }
      state.canvasMode = null;
      state.ballisticMode = mode;
      refs.status.textContent = mode === "launch"
        ? "Haritada Launch Point seçme modu aktif."
        : "Haritada Impact Point seçme modu aktif.";
      refs.status.className = "status info";
      updateBallisticInfo();
      drawBallisticGraph();
    }

    function clearBallisticPoints() {
      state.ballisticLaunch = null;
      state.ballisticImpact = null;
      state.ballisticMode = null;
      state.canvasMode = null;
      const assetId = parseAssetIdFromSelectValue(refs.ballisticImpactSelect.value);
      const currentValue = String(refs.ballisticImpactSelect.value || "").trim();
      state.ballisticImpactSource = {
        mode: assetId ? "defendedAsset" : currentValue === "manual" ? "manual" : "",
        defendedAssetId: assetId
      };
      syncBallisticImpactWithSource();
      syncBallisticPointInputs();
      updateBallisticInfo();
      renderConstraintSummary();
      drawBallisticGraph();
      drawCanvas();
      buildScenario(false);
    }

    function clearKinematicDraft() {
      resetKinematicEditMode();
      state.selectedPlatform = null;
      refs.platformSelect.value = "";
      refs.totTime.value = DEFAULTS.totTime;
      refs.totTime.disabled = true;
      refs.totTime.readOnly = false;
      state.totManuallyEdited = false;
      state.points = [];
      state.lockRouteTargetWaypoint = false;
      state.payloadEnabled = false;
      state.payloadRows = [];
      state.activePayloadRowIndex = 0;
      refs.computedTakeoffTime.value = "-";
      refs.payloadSection.classList.add("planner-disabled");
      refs.payloadSection.hidden = true;
      refs.platformInfo.textContent = "Platform seçilmedi.";
      refs.payloadInfo.textContent = "Payload yok.";
      syncPayloadPointInputs();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function clearBallisticDraft() {
      resetBallisticDraftState();
      drawCanvas();
      drawBallisticGraph();
      renderConstraintSummary();
      buildScenario(false);
    }

    function resetBallisticDraftState() {
      state.ballisticEnabled = false;
      state.selectedBallistic = null;
      state.ballisticMode = null;
      state.ballisticLaunch = null;
      state.ballisticImpact = null;
      state.ballisticImpactSource = { mode: "", defendedAssetId: "" };
      refs.ballisticImpactSelect.value = "";
      refs.ballisticSelect.value = "";
      refs.launchTime.value = DEFAULTS.launchTime;
      refs.impactTot.value = DEFAULTS.impactTot;
      syncBallisticPointInputs();
      updateBallisticInfo();
    }

    function updateBallisticInfo() {
      if (!state.ballisticEnabled) {
        refs.ballisticInfo.textContent = "Balistik plan kapalı.";
        return;
      }

      if (!state.selectedBallistic) {
        refs.ballisticInfo.textContent = "Balistik model seçilmedi.";
        return;
      }

      const b = state.selectedBallistic;
      const tags = [
        `<span class="pill">${b.model}</span>`,
        `<span class="pill">Menzil: ${b.range?.minKm ?? "-"} - ${b.range?.maxKm ?? "-"} km</span>`,
        `<span class="pill">Boost: ${b.trajectory?.boost?.duration ?? "-"} s</span>`,
        `<span class="pill">Midcourse: ${b.trajectory?.midcourse?.duration ?? "-"} s</span>`,
        `<span class="pill">Impact Speed: ${b.trajectory?.terminal?.impactSpeed ?? "-"} m/s</span>`
      ];

      const lp = state.ballisticLaunch ? `Launch=(${state.ballisticLaunch.x.toFixed(1)}, ${state.ballisticLaunch.y.toFixed(1)})` : "Launch seçilmedi";
      const ip = state.ballisticImpact ? `Impact=(${state.ballisticImpact.x.toFixed(1)}, ${state.ballisticImpact.y.toFixed(1)})` : "Impact seçilmedi";
      const modeText = state.ballisticMode ? `Aktif seçim modu: ${state.ballisticMode.toUpperCase()}` : "Seçim modu kapalı";
      const timing = getBallisticTimingInputs();
      const launchTxt = Number.isFinite(timing.launchTime) ? `${round(timing.launchTime, 1)} s` : "-";
      const impactTxt = Number.isFinite(timing.impactTot) ? `${round(timing.impactTot, 1)} s` : "-";
      let timeText = `LaunchTime=${launchTxt} | ImpactToT=${impactTxt}`;
      if (Number.isFinite(timing.launchTime) && Number.isFinite(timing.impactTot)) {
        const flightT = timing.impactTot - timing.launchTime;
        timeText += ` | UçuşSüresi=${round(flightT, 1)} s`;
      }
      const estimatedFlight = getBallisticEstimatedFlightTimeSeconds();
      if (Number.isFinite(estimatedFlight)) {
        timeText += ` | ModelTahminiUçuş=${round(estimatedFlight, 1)} s`;
      }

      const errors = validateBallisticPlan();
      const result = errors.length === 0 ? "Balistik plan limiti uygun." : `Uyarı: ${errors[0]}`;

      refs.ballisticInfo.innerHTML = `${tags.join(" ")}<br>${lp} | ${ip} | ${modeText}<br>${timeText}<br>${result}`;
      drawBallisticGraph();
    }

    function buildTargetDefinition(source, point, pointKey = "targetPoint") {
      const mode = String(source?.mode || "manual");
      const defendedAssetId = String(source?.defendedAssetId || "").trim() || null;
      const asset = mode === "defendedAsset" && defendedAssetId ? getDefendedAssetById(defendedAssetId) : null;
      return {
        mode,
        defendedAssetId: mode === "defendedAsset" ? defendedAssetId : null,
        targetClass: asset?.assetClass || null,
        targetName: asset?.name || null,
        [pointKey]: point ? [round(point.x, 3), round(point.y, 3)] : null
      };
    }

    function getCurrentAttackTargetDefinition() {
      return buildTargetDefinition(state.attackTargetSource, state.attackTarget, "targetPoint");
    }

    function getPayloadTargetDefinition(row) {
      return buildTargetDefinition(
        {
          mode: row?.targetSource?.mode === "attackTarget" ? "attackTarget" : row?.targetSource?.mode,
          defendedAssetId: row?.targetSource?.defendedAssetId
        },
        row?.targetPoint || state.attackTarget,
        "targetPoint"
      );
    }

    function getCurrentBallisticImpactDefinition() {
      return buildTargetDefinition(state.ballisticImpactSource, state.ballisticImpact, "impactPoint");
    }

    function validateBallisticPlan(options = {}) {
      const { includeTiming = true } = options;
      const errors = [];
      if (!state.ballisticEnabled) {
        return errors;
      }

      if (!state.selectedBallistic) {
        errors.push("Balistik model seçilmedi.");
        return errors;
      }

      const hasBothPoints = Boolean(state.ballisticLaunch && state.ballisticImpact);
      if (hasBothPoints) {
        const distMeters = distance(state.ballisticLaunch, state.ballisticImpact);
        const distKm = distMeters / 1000;

        const minKm = state.selectedBallistic.range?.minKm ?? 0;
        const maxKm = state.selectedBallistic.range?.maxKm ?? Number.POSITIVE_INFINITY;

        if (distKm < minKm || distKm > maxKm) {
          errors.push(`Balistik menzil limiti dışında. Hesaplanan: ${distKm.toFixed(2)} km, Min: ${minKm} km, Max: ${maxKm} km`);
        }
      }

      if (!includeTiming || !hasBothPoints) {
        return errors;
      }

      const timing = getBallisticTimingInputs();
      if (!Number.isFinite(timing.launchTime) || timing.launchTime < 0) {
        errors.push("Balistik Launch Time değeri geçerli bir sayı olmalı (>= 0).");
      }
      if (!Number.isFinite(timing.impactTot) || timing.impactTot < 0) {
        errors.push("Balistik Impact ToT değeri geçerli bir sayı olmalı (>= 0).");
      }
      if (Number.isFinite(timing.launchTime) && Number.isFinite(timing.impactTot) && timing.impactTot <= timing.launchTime) {
        errors.push("Balistik Impact ToT, Launch Time'dan büyük olmalı.");
      }

      return errors;
    }

    function buildCurrentKinematicEntity(showPopupOnError = false, existingEntityId = "") {
      if (!state.selectedPlatform || state.points.length === 0) {
        if (showPopupOnError) {
          popupErrors(["Kinetik hedef için platform seçip rota oluşturun."]);
        }
        return null;
      }

      const routeErrors = validateAllPoints(state.points, state.selectedPlatform);
      if (routeErrors.length > 0) {
        if (showPopupOnError) {
          popupErrors(routeErrors);
        }
        return null;
      }

      const payloadErrors = validatePayload();
      if (payloadErrors.length > 0) {
        if (showPopupOnError) {
          popupErrors(payloadErrors);
        }
        return null;
      }

      const timeline = computeTimelinePlan();
      if (timeline.errors.length > 0) {
        if (showPopupOnError) {
          popupErrors(timeline.errors);
        }
        return null;
      }

      const entityNo = String(state.kinematicEntityCounter).padStart(2, "0");
      const start = state.points[0];
      const heading = state.points.length > 1 ? headingDeg(start, state.points[1]) : 0;
      const waypoints = state.points.slice(1).map((p, i) => ({
        name: state.lockRouteTargetWaypoint && i === state.points.slice(1).length - 1 ? "TARGET" : `WP-${i + 1}`,
        position: [round(p.x, 3), round(p.y, 3)],
        targetAltitude: Number(p.altitude),
        targetSpeed: Number(p.speed)
      }));

      const entity = {
        id: String(existingEntityId || `${state.selectedPlatform.id}_${entityNo}`),
        entityType: "KinematicTarget",
        category: state.selectedPlatform.category,
        model: state.selectedPlatform.model,
        rcs: Number(state.selectedPlatform.defaultRCS),
        pSuccess: Number(state.selectedPlatform.defaultPSuccess),
        kinematics: state.selectedPlatform.kinematics,
        flightPlan: {
          takeoffTime: Math.max(1, Number(timeline.info.takeoffTime) || 0),
          initialState: {
            position: [round(start.x, 3), round(start.y, 3)],
            altitude: Number(start.altitude),
            speed: Number(start.speed),
            heading: round(heading, 2)
          },
          waypoints
        },
        payload: []
      };

      if (state.payloadEnabled && state.payloadRows.length > 0) {
        entity.payload = state.payloadRows.map((row, i) => {
          const weapon = state.weapons.find((w) => w.id === row.weaponId);
          const releaseRow = timeline.info.releaseRows?.[i];
          const releaseAltitude = round(releaseRow?.releaseProjection?.altitude ?? start.altitude ?? 0, 3);
          return {
            id: buildPayloadInstanceId(state.payloadRows, i),
            category: normalizePayloadCategory(weapon.category),
            model: weapon.model,
            rcs: Number(weapon.defaultRCS),
            pSuccess: Number(weapon.defaultPSuccess),
            kinematics: weapon.kinematics,
            release: {
              time: Math.max(0, Number(releaseRow?.releaseAbs ?? 0))
            },
            targetTot: Math.max(0, Number(releaseRow?.targetTot ?? row.targetTot) || 0),
            releasePoint: [
              round(releaseRow?.releaseProjection?.x ?? row.releasePoint?.x ?? 0, 3),
              round(releaseRow?.releaseProjection?.y ?? row.releasePoint?.y ?? 0, 3)
            ],
            releasePoint3D: [
              round(releaseRow?.releaseProjection?.x ?? row.releasePoint?.x ?? 0, 3),
              round(releaseRow?.releaseProjection?.y ?? row.releasePoint?.y ?? 0, 3),
              releaseAltitude
            ],
            releasePointZ: releaseAltitude,
            targetPoint: [
              round((releaseRow?.target || row.targetPoint || state.attackTarget).x, 3),
              round((releaseRow?.target || row.targetPoint || state.attackTarget).y, 3)
            ],
            targetDefinition: getPayloadTargetDefinition(row),
            targetPoint3D: [
              round((releaseRow?.target || row.targetPoint || state.attackTarget).x, 3),
              round((releaseRow?.target || row.targetPoint || state.attackTarget).y, 3),
              0
            ],
            targetPointZ: 0,
            pathProfile: "StraightLine"
          };
        });
      }

      return {
        summary: {
          model: state.selectedPlatform.model,
          points: state.points.length,
          payloadCount: entity.payload.length
        },
        planning: {
          platformTot: Math.max(0, Number(refs.totTime.value) || 0),
          payloadTots: (timeline.info.releaseRows || []).map((r) => Math.max(0, Number(r.targetTot) || 0)),
          attackTarget: [round(state.attackTarget.x, 3), round(state.attackTarget.y, 3)],
          attackTargetDefinition: getCurrentAttackTargetDefinition()
        },
        entity
      };
    }

    function buildCurrentBallisticEntity(showPopupOnError = false) {
      if (!state.ballisticEnabled) {
        if (showPopupOnError) {
          popupErrors(["Balistik hedef eklemek için önce balistik modunu açın."]);
        }
        return null;
      }

      const errors = validateBallisticPlan();
      if (errors.length > 0) {
        if (showPopupOnError) {
          popupErrors(errors);
        }
        return null;
      }

      if (!state.selectedBallistic || !state.ballisticLaunch || !state.ballisticImpact) {
        if (showPopupOnError) {
          popupErrors(["Balistik hedef için model, launch ve impact noktalarını tamamlayın."]);
        }
        return null;
      }

      const b = state.selectedBallistic;
      const timing = getBallisticTimingInputs();
      const launchTime = Number(timing.launchTime);
      const impactTot = Number(timing.impactTot);
      const entityNo = String(state.ballisticEntityCounter).padStart(2, "0");
      const entity = {
        id: `${b.id}_${entityNo}`,
        entityType: "BallisticTarget",
        launchTime: Math.max(0, launchTime),
        impactTime: Math.max(0, impactTot),
        trajectory: {
          launchPoint: [round(state.ballisticLaunch.x, 3), round(state.ballisticLaunch.y, 3)],
          boost: {
            duration: Number(b.trajectory.boost.duration),
            maxAltitude: Number(b.trajectory.boost.maxAltitude)
          },
          midcourse: {
            duration: Number(b.trajectory.midcourse.duration)
          },
          terminal: {
            impactPoint: [round(state.ballisticImpact.x, 3), round(state.ballisticImpact.y, 3)],
            impactSpeed: Number(b.trajectory.terminal.impactSpeed)
          }
        },
        impactDefinition: getCurrentBallisticImpactDefinition(),
        rcs: Number(b.defaultRCS),
        pSuccess: Number(b.defaultPSuccess)
      };

      return {
        summary: {
          model: b.model,
          launch: `${round(state.ballisticLaunch.x, 1)},${round(state.ballisticLaunch.y, 1)}`,
          impact: `${round(state.ballisticImpact.x, 1)},${round(state.ballisticImpact.y, 1)}`,
          launchTime: round(launchTime, 1),
          impactTot: round(impactTot, 1)
        },
        entity
      };
    }

    function findPlatformForKinematicEntity(entity) {
      const entityId = String(entity?.id || "").trim();
      const baseIdMatch = entityId.match(/^(.+?)(?:-entity-|_)\d+$/i);
      const baseId = baseIdMatch ? baseIdMatch[1] : "";
      return state.platforms.find((item) => item.id === baseId) ||
        state.platforms.find((item) =>
          String(item?.model || "").trim() === String(entity?.model || "").trim() &&
          String(item?.category || "").trim() === String(entity?.category || "").trim()
        ) ||
        null;
    }

    function createRoutePoint(position, altitude, speed) {
      const coords = Array.isArray(position) ? position : [];
      return {
        x: round(coords[0] ?? 0, 3),
        y: round(coords[1] ?? 0, 3),
        altitude: Number(altitude) || 0,
        speed: Number(speed) || 0
      };
    }

    function restoreTargetSelection(definition, fallbackPoint, fallbackMode = "manual") {
      const sourceMode = String(definition?.mode || "").trim();
      const defendedAssetId = String(definition?.defendedAssetId || "").trim();
      const rawPoint = Array.isArray(definition?.targetPoint)
        ? definition.targetPoint
        : Array.isArray(definition?.impactPoint)
          ? definition.impactPoint
          : null;
      const point = rawPoint && rawPoint.length >= 2
        ? { x: Number(rawPoint[0]) || 0, y: Number(rawPoint[1]) || 0 }
        : fallbackPoint
          ? { x: Number(fallbackPoint.x) || 0, y: Number(fallbackPoint.y) || 0 }
          : null;

      if (sourceMode === "defendedAsset" && defendedAssetId) {
        return {
          source: { mode: "defendedAsset", defendedAssetId },
          point: getDefendedAssetCenter(defendedAssetId) || point
        };
      }
      if (sourceMode === "attackTarget") {
        return {
          source: { mode: "attackTarget", defendedAssetId: "" },
          point
        };
      }
      if (sourceMode === "manual") {
        return {
          source: { mode: "manual", defendedAssetId: "" },
          point
        };
      }
      return {
        source: { mode: fallbackMode, defendedAssetId: "" },
        point
      };
    }

    function restorePayloadRowsFromEntity(entity, takeoffTime) {
      const payloads = Array.isArray(entity?.payload) ? entity.payload : [];
      return payloads.map((payload) => {
        const releasePoint = Array.isArray(payload?.releasePoint) && payload.releasePoint.length >= 2
          ? { x: Number(payload.releasePoint[0]) || 0, y: Number(payload.releasePoint[1]) || 0 }
          : null;
        const targetFallback = Array.isArray(payload?.targetPoint) && payload.targetPoint.length >= 2
          ? { x: Number(payload.targetPoint[0]) || 0, y: Number(payload.targetPoint[1]) || 0 }
          : null;
        const restoredTarget = restoreTargetSelection(payload?.targetDefinition, targetFallback, "attackTarget");
        const projection = releasePoint ? getRouteProjection(releasePoint) : null;
        const releaseAbs = Number(payload?.release?.time);
        const releaseRelative = Number.isFinite(releaseAbs) ? releaseAbs - takeoffTime : null;
        const releaseOffset = Number.isFinite(releaseRelative) && projection
          ? round(releaseRelative - Number(projection.time || 0), 2)
          : 0;

        return {
          weaponId: getWeaponCatalogIdFromPayload(payload),
          targetTot: Number.isFinite(Number(payload?.targetTot)) ? round(Number(payload.targetTot), 2) : null,
          releaseTime: Number.isFinite(releaseAbs) ? round(releaseAbs, 2) : null,
          weaponFlightTime: null,
          releaseOffset,
          releasePoint,
          targetPoint: restoredTarget.point,
          targetSource: restoredTarget.source,
          targetManual: restoredTarget.source.mode === "manual"
        };
      });
    }

    function loadSavedKinematicEntityForEdit(index) {
      const item = state.savedKinematicEntities[index];
      if (!item?.entity) {
        return;
      }

      const platform = findPlatformForKinematicEntity(item.entity);
      if (!platform) {
        popupErrors([`Platform kataloğunda eşleşen kayıt bulunamadı: ${item.entity.id || item.entity.model || "Bilinmeyen platform"}`]);
        return;
      }

      const initialState = item.entity?.flightPlan?.initialState || {};
      const waypoints = Array.isArray(item.entity?.flightPlan?.waypoints) ? item.entity.flightPlan.waypoints : [];
      const points = [];
      if (Array.isArray(initialState.position) && initialState.position.length >= 2) {
        points.push(createRoutePoint(initialState.position, initialState.altitude, initialState.speed));
      }
      for (const waypoint of waypoints) {
        if (Array.isArray(waypoint?.position) && waypoint.position.length >= 2) {
          points.push(createRoutePoint(waypoint.position, waypoint.targetAltitude, waypoint.targetSpeed));
        }
      }

      if (!points.length) {
        popupErrors(["Seçilen platform için düzenlenebilir rota bilgisi bulunamadı."]);
        return;
      }

      refs.platformSelect.value = platform.id;
      onPlatformChange();

      state.points = points;
      const lastPoint = points[points.length - 1];
      const restoredAttack = restoreTargetSelection(
        item.planning?.attackTargetDefinition,
        lastPoint ? { x: lastPoint.x, y: lastPoint.y } : state.attackTarget,
        "manual"
      );
      state.attackTargetSource = {
        mode: restoredAttack.source.mode === "defendedAsset" ? "defendedAsset" : "manual",
        defendedAssetId: restoredAttack.source.mode === "defendedAsset" ? restoredAttack.source.defendedAssetId : ""
      };
      state.attackTarget = restoredAttack.point || (lastPoint ? { x: lastPoint.x, y: lastPoint.y } : { ...DEFAULTS.attackTarget });
      state.lockRouteTargetWaypoint = Boolean(state.selectedPlatform);
      syncAttackTargetWithSource();
      syncTargetInputs();
      syncLockedRouteTarget();

      const route = getRouteSegments();
      const takeoffTime = Math.max(1, Number(item.entity?.flightPlan?.takeoffTime) || 0);
      const importedTot = Number(item?.planning?.platformTot);
      const nextTot = Number.isFinite(importedTot) && importedTot > 0
        ? importedTot
        : round(takeoffTime + route.total, 2);
      refs.totTime.value = String(nextTot);
      state.totManuallyEdited = true;
      normalizePlatformTotToRoute({ preserveManual: true });

      state.payloadRows = restorePayloadRowsFromEntity(item.entity, takeoffTime);
      state.payloadEnabled = state.payloadRows.length > 0;
      state.activePayloadRowIndex = 0;
      syncPayloadTargetWithAttackIfNeeded();
      syncAllPayloadTimingRows();
      populatePayloadTargetSelect();
      syncPayloadTargetWithSource();
      syncPayloadPointInputs();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);

      setKinematicEditMode(index);
      activateTab("kinematic");
      refs.status.textContent = `Platform düzenleme moduna alındı (#${index + 1}). Güncellemek için "Platform Güncelle" butonunu kullanın.`;
      refs.status.className = "status info";
    }

    function addCurrentKinematicToScenario() {
      const editingIndex = Number(state.editingKinematicIndex);
      const isEditingExisting = Number.isInteger(editingIndex) && editingIndex >= 0 && editingIndex < state.savedKinematicEntities.length;
      const existingEntityId =
        isEditingExisting
          ? String(state.savedKinematicEntities[editingIndex]?.entity?.id || "")
          : "";
      const built = buildCurrentKinematicEntity(true, existingEntityId);
      if (!built) {
        return;
      }
      if (isEditingExisting) {
        state.savedKinematicEntities[editingIndex] = built;
      } else {
        state.savedKinematicEntities.push(built);
        state.kinematicEntityCounter += 1;
      }
      renderSavedKinematicTable();
      clearKinematicDraft();
      refs.status.textContent = isEditingExisting
        ? `Kinetik hedef güncellendi (${editingIndex + 1}).`
        : `Kinetik hedef senaryoya eklendi (${state.savedKinematicEntities.length}).`;
      refs.status.className = "status ok";
      notifyParentScenarioSummaryChanged();
      buildScenario(false);
    }

    function addCurrentBallisticToScenario() {
      const built = buildCurrentBallisticEntity(true);
      if (!built) {
        return;
      }
      state.savedBallisticEntities.push(built);
      state.ballisticEntityCounter += 1;
      renderSavedBallisticTable();
      clearBallisticDraft();
      refs.status.textContent = `Balistik hedef senaryoya eklendi (${state.savedBallisticEntities.length}).`;
      refs.status.className = "status ok";
      notifyParentScenarioSummaryChanged();
      buildScenario(false);
    }

    function renderSavedKinematicTable() {
      refs.kinematicEntityTableBody.innerHTML = "";
      state.savedKinematicEntities.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${item.summary.model}</td>
          <td>${item.summary.points}</td>
          <td>${item.summary.payloadCount}</td>
          <td>
            <div class="table-action-group">
              <button class="ghost" type="button" data-role="edit-kin" data-index="${idx}">Düzenle</button>
              <button class="ghost" type="button" data-role="rm-kin" data-index="${idx}">Sil</button>
            </div>
          </td>
        `;
        refs.kinematicEntityTableBody.appendChild(tr);
      });
      for (const btn of refs.kinematicEntityTableBody.querySelectorAll("button[data-role='edit-kin']")) {
        btn.addEventListener("click", (event) => {
          const i = Number(event.target.dataset.index);
          if (Number.isFinite(i) && i >= 0 && i < state.savedKinematicEntities.length) {
            loadSavedKinematicEntityForEdit(i);
          }
        });
      }
      for (const btn of refs.kinematicEntityTableBody.querySelectorAll("button[data-role='rm-kin']")) {
        btn.addEventListener("click", (event) => {
          const i = Number(event.target.dataset.index);
          if (Number.isFinite(i) && i >= 0 && i < state.savedKinematicEntities.length) {
            state.savedKinematicEntities.splice(i, 1);
            if (state.editingKinematicIndex === i) {
              clearKinematicDraft();
            } else if (state.editingKinematicIndex > i) {
              state.editingKinematicIndex -= 1;
            }
            renderSavedKinematicTable();
            notifyParentScenarioSummaryChanged();
            buildScenario(false);
          }
        });
      }
    }

    function renderSavedBallisticTable() {
      refs.ballisticEntityTableBody.innerHTML = "";
      state.savedBallisticEntities.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${item.summary.model}</td>
          <td>${item.summary.launch}</td>
          <td>${item.summary.impact}</td>
          <td>${item.summary.launchTime ?? "-"}</td>
          <td>${item.summary.impactTot ?? "-"}</td>
          <td><button class="ghost" type="button" data-role="rm-bal" data-index="${idx}">Sil</button></td>
        `;
        refs.ballisticEntityTableBody.appendChild(tr);
      });
      for (const btn of refs.ballisticEntityTableBody.querySelectorAll("button[data-role='rm-bal']")) {
        btn.addEventListener("click", (event) => {
          const i = Number(event.target.dataset.index);
          if (Number.isFinite(i) && i >= 0 && i < state.savedBallisticEntities.length) {
            state.savedBallisticEntities.splice(i, 1);
            renderSavedBallisticTable();
            notifyParentScenarioSummaryChanged();
            buildScenario(false);
          }
        });
      }
    }

    function renderPointTable() {
      refs.pointTableBody.innerHTML = "";

      state.points.forEach((point, index) => {
        const isLockedTarget = isLockedTargetWaypointIndex(index);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${index === 0 ? "START" : isLockedTarget ? "TARGET" : `WP-${index}`}</td>
          <td><input type="number" step="1" value="${point.x}" data-index="${index}" data-field="x" ${isLockedTarget ? "disabled" : ""}></td>
          <td><input type="number" step="1" value="${point.y}" data-index="${index}" data-field="y" ${isLockedTarget ? "disabled" : ""}></td>
          <td><input type="number" step="1" value="${point.altitude}" data-index="${index}" data-field="altitude"></td>
          <td><input type="number" step="1" value="${point.speed}" data-index="${index}" data-field="speed"></td>
        `;
        refs.pointTableBody.appendChild(tr);
      });

      for (const input of refs.pointTableBody.querySelectorAll("input")) {
        input.addEventListener("change", onPointFieldChange);
        input.addEventListener("keydown", onPointTableKeydown);
      }
    }

    function onPointTableKeydown(event) {
      if (event.key !== "Tab") {
        return;
      }

      const inputs = Array.from(refs.pointTableBody.querySelectorAll("input:not(:disabled)"));
      if (inputs.length === 0) {
        return;
      }

      const currentIndex = inputs.indexOf(event.target);
      if (currentIndex === -1) {
        return;
      }

      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + inputs.length) % inputs.length;
      inputs[nextIndex].focus();
      inputs[nextIndex].select?.();
    }

    function onPointFieldChange(event) {
      const index = Number(event.target.dataset.index);
      const field = event.target.dataset.field;
      const value = Number(event.target.value);

      if (!Number.isFinite(index) || index < 0 || index >= state.points.length || !Number.isFinite(value)) {
        return;
      }
      if (isLockedTargetWaypointIndex(index) && (field === "x" || field === "y")) {
        event.target.value = state.points[index][field];
        return;
      }

      const candidate = state.points.map((p) => ({ ...p }));
      candidate[index][field] = value;

      const errors = validateAllPoints(candidate, state.selectedPlatform);
      if (errors.length > 0) {
        popupErrors(errors);
        event.target.value = state.points[index][field];
        return;
      }

      state.points = candidate;
      syncLockedRouteTarget();
      updatePayloadFormVisibility();
      renderPointTable();
      renderPayloadTable();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function validateWholeRoute() {
      if (!state.selectedPlatform || state.points.length === 0) {
        return;
      }
      const errors = validateAllPoints(state.points, state.selectedPlatform);
      if (errors.length > 0) {
        popupErrors(errors);
      }
    }

    function validateAllPoints(points, platform) {
      const errors = [];
      if (!platform) {
        return errors;
      }

      const minSpeed = platform.kinematics?.speed?.min ?? 0;
      const maxSpeed = platform.kinematics?.speed?.max ?? Number.POSITIVE_INFINITY;
      const maxTurnRate = platform.kinematics?.turnRate?.maxDegPerSec ?? Number.POSITIVE_INFINITY;
      const maxClimb = platform.kinematics?.vertical?.maxClimbRate ?? Number.POSITIVE_INFINITY;
      const maxDescend = platform.kinematics?.vertical?.maxDescentRate ?? Number.POSITIVE_INFINITY;
      for (let i = 0; i < points.length; i += 1) {
        if (points[i].speed < minSpeed || points[i].speed > maxSpeed) {
          errors.push(`Nokta ${i + 1} sürat limiti dışında. Min: ${minSpeed} m/s, Max: ${maxSpeed} m/s`);
        }
      }

      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const cur = points[i];
        const distanceMeters = distance(prev, cur);
        const avgSpeed = Math.max(1, (prev.speed + cur.speed) / 2);
        const dt = distanceMeters / avgSpeed;
        if (!Number.isFinite(dt) || dt <= 0) {
          errors.push(`Nokta ${i} -> ${i + 1} segment süresi hesaplanamadı.`);
          continue;
        }

        const dAlt = cur.altitude - prev.altitude;
        const verticalRate = Math.abs(dAlt / dt);

        if (dAlt > 0 && verticalRate > maxClimb) {
          errors.push(`Nokta ${i} -> ${i + 1} tırmanma limiti aşıldı. Hesaplanan: ${verticalRate.toFixed(2)} m/s, Max: ${maxClimb} m/s`);
        }

        if (dAlt < 0 && verticalRate > maxDescend) {
          errors.push(`Nokta ${i} -> ${i + 1} alçalma limiti aşıldı. Hesaplanan: ${verticalRate.toFixed(2)} m/s, Max: ${maxDescend} m/s`);
        }
      }

      for (let i = 1; i < points.length - 1; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const c = points[i + 1];
        const h1 = headingDeg(a, b);
        const h2 = headingDeg(b, c);
        const turnAngleDeg = smallestAngleDiff(h1, h2);
        const turnAngleRad = turnAngleDeg * Math.PI / 180;
        if (turnAngleDeg < 0.5) {
          continue;
        }

        const dIn = distance(a, b);
        const dOut = distance(b, c);
        const minLeg = Math.max(1, Math.min(dIn, dOut));
        const tanHalf = Math.tan(Math.max(0.001, turnAngleRad / 2));
        const maxRadius = minLeg / tanHalf;
        const speedAroundTurn = Math.max(1, (a.speed + b.speed + c.speed) / 3);
        const minRequiredTurnRateDegPerSec = (speedAroundTurn / Math.max(1, maxRadius)) * (180 / Math.PI);

        if (minRequiredTurnRateDegPerSec > maxTurnRate) {
          errors.push(
            `Nokta ${i + 1} dönüş limiti aşıldı. Gerekli min: ${minRequiredTurnRateDegPerSec.toFixed(2)} deg/s, Max: ${maxTurnRate} deg/s`
          );
        }
      }

      return errors;
    }

    function renderConstraintSummary() {
      const parts = [];

      if (state.selectedPlatform) {
        const routeErrors = validateAllPoints(state.points, state.selectedPlatform);
        const routeStatus = routeErrors.length === 0 ? "UYGUN" : `HATA (${routeErrors.length})`;
        parts.push(`<div class="pill">Platform rota: ${routeStatus}</div>`);
        const plan = computeTimelinePlan();
        const totStatus = plan.errors.length === 0 ? "UYGUN" : "HATA";
        parts.push(`<div class="pill">ToT planı: ${totStatus}</div>`);
      } else {
        parts.push(`<div class="pill">Platform rota: beklemede</div>`);
      }

      parts.push(`<div class="pill">Kinetik hedef: ${state.savedKinematicEntities.length}</div>`);
      parts.push(`<div class="pill">Balistik hedef: ${state.savedBallisticEntities.length}</div>`);

      if (state.payloadEnabled) {
        const maxCount = state.selectedPlatform?.maxPayloadCount ?? 0;
        const payloadStatus = state.payloadRows.length <= maxCount ? "UYGUN" : "HATA";
        parts.push(`<div class="pill">Payload adedi: ${state.payloadRows.length}/${maxCount} (${payloadStatus})</div>`);
      } else if (state.selectedPlatform?.payloadCapable) {
        parts.push("<div class=\"pill\">Payload: beklemede</div>");
      } else {
        parts.push(`<div class="pill">Payload: kapalı</div>`);
      }

      if (state.ballisticEnabled) {
        const berr = validateBallisticPlan();
        const bstatus = berr.length === 0 ? "UYGUN" : `HATA (${berr.length})`;
        parts.push(`<div class="pill">Balistik plan: ${bstatus}</div>`);
      } else {
        parts.push(`<div class="pill">Balistik plan: kapalı</div>`);
      }

      refs.constraintSummary.innerHTML = parts.join(" ");
    }

    function drawCanvas() {
      if (!canUseSharedMapInteraction()) {
        return;
      }
      const w = refs.routeCanvas.width;
      const h = refs.routeCanvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      applyViewTransform();
      drawOriginAxes();
      drawSharedTargetMarkers();
      drawTargetRings();

      ctx.strokeStyle = "#3ea66a";
      ctx.lineWidth = pxToWorld(2);
      if (state.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(state.points[0].x, state.points[0].y);
        for (let i = 1; i < state.points.length; i += 1) {
          ctx.lineTo(state.points[i].x, state.points[i].y);
        }
        ctx.stroke();
      }

      state.points.forEach((p, idx) => {
        ctx.beginPath();
        ctx.fillStyle = idx === 0 ? "#ff4f4f" : isLockedTargetWaypointIndex(idx) ? "#f4d35e" : "#2ed37a";
        ctx.arc(p.x, p.y, pxToWorld(idx === 0 ? 6 : 5), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#d7f8df";
        ctx.font = `${pxToWorld(12)}px Space Grotesk`;
        const tag = idx === 0 ? "S" : isLockedTargetWaypointIndex(idx) ? "TGT" : `W${idx}`;
        drawWorldLabel(`${tag} (${Math.round(p.altitude)}m/${Math.round(p.speed)}m/s)`, p.x + pxToWorld(7), p.y + pxToWorld(8));
      });

      drawPayloadReleaseMarkers();

      if (state.activeTab === "ballistic" && state.ballisticEnabled && state.ballisticLaunch) {
        drawCross(state.ballisticLaunch.x, state.ballisticLaunch.y, "#154c79", "L");
      }

      if (state.activeTab === "ballistic" && state.ballisticEnabled && state.ballisticImpact) {
        drawCross(state.ballisticImpact.x, state.ballisticImpact.y, "#7d3a02", "I");
      }

      if (state.activeTab === "ballistic" && state.ballisticEnabled && state.ballisticLaunch && state.ballisticImpact) {
        ctx.strokeStyle = "#4cc8ff";
        ctx.setLineDash([pxToWorld(8), pxToWorld(6)]);
        ctx.beginPath();
        ctx.moveTo(state.ballisticLaunch.x, state.ballisticLaunch.y);
        ctx.lineTo(state.ballisticImpact.x, state.ballisticImpact.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    function drawOriginAxes() {
      const span = 5000000;
      ctx.strokeStyle = "rgba(109, 216, 255, 0.35)";
      ctx.lineWidth = pxToWorld(1.2);
      ctx.beginPath();
      ctx.moveTo(-span, 0);
      ctx.lineTo(span, 0);
      ctx.moveTo(0, -span);
      ctx.lineTo(0, span);
      ctx.stroke();

      ctx.fillStyle = "#9fe6ff";
      ctx.font = `${pxToWorld(11)}px Space Grotesk`;
      drawWorldLabel("0,0", pxToWorld(6), -pxToWorld(12));
    }

    function drawCross(x, y, color, label) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = pxToWorld(2);
      ctx.beginPath();
      const h = pxToWorld(7);
      ctx.moveTo(x - h, y - h);
      ctx.lineTo(x + h, y + h);
      ctx.moveTo(x + h, y - h);
      ctx.lineTo(x - h, y + h);
      ctx.stroke();
      ctx.font = `${pxToWorld(12)}px Space Grotesk`;
      drawWorldLabel(label, x + pxToWorld(10), y - pxToWorld(4));
    }

    function drawSharedTargetMarkers() {
      if (!Array.isArray(state.sharedDefendedAssets) || state.sharedDefendedAssets.length === 0) {
        return;
      }

      for (const asset of state.sharedDefendedAssets) {
        const point = asset?.center;
        if (!point) {
          continue;
        }

        const isSelected =
          state.attackTargetSource.mode === "defendedAsset" &&
          state.attackTargetSource.defendedAssetId === asset.id;
        const isLauncher = String(asset?.assetClass || "") === "launcher";

        ctx.beginPath();
        ctx.fillStyle = isSelected ? "#ffd166" : isLauncher ? "#ff9a7d" : "#7bdff6";
        ctx.arc(point.x, point.y, pxToWorld(isSelected ? 6 : isLauncher ? 5 : 4), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isSelected ? "#ffe3a3" : isLauncher ? "#ffc8b8" : "#bff5ff";
        ctx.font = `${pxToWorld(11)}px Space Grotesk`;
        drawWorldLabel(`${asset.id}`, point.x + pxToWorld(7), point.y - pxToWorld(6));
      }
    }

    function drawTargetRings() {
      if (!state.attackTarget) {
        return;
      }

      const ringsKm = [25, 50, 100, 200];
      for (const km of ringsKm) {
        const radiusMeters = km * 1000;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(76, 200, 255, 0.28)";
        ctx.lineWidth = pxToWorld(1.5);
        ctx.arc(state.attackTarget.x, state.attackTarget.y, radiusMeters, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#6dd8ff";
        ctx.font = `${pxToWorld(11)}px Space Grotesk`;
        drawWorldLabel(`${km} km`, state.attackTarget.x + radiusMeters + pxToWorld(4), state.attackTarget.y + pxToWorld(4));
      }

      drawCross(state.attackTarget.x, state.attackTarget.y, "#6dd8ff", "TGT");
    }

    function drawPayloadReleaseMarkers() {
      if (!state.payloadEnabled) {
        return;
      }

      state.payloadRows.forEach((row, index) => {
        const releasePoint = row.releasePoint;
        const targetPoint = row.targetSource?.mode ? row.targetPoint : null;
        if (releasePoint) {
          drawCross(releasePoint.x, releasePoint.y, "#ff6a4d", `REL-${index + 1}`);
        }
        if (targetPoint) {
          drawCross(targetPoint.x, targetPoint.y, "#2ed37a", `PAY-T${index + 1}`);
        }
        if (releasePoint && targetPoint) {
          ctx.strokeStyle = "#ff6a4d";
          ctx.setLineDash([pxToWorld(6), pxToWorld(5)]);
          ctx.beginPath();
          ctx.moveTo(releasePoint.x, releasePoint.y);
          ctx.lineTo(targetPoint.x, targetPoint.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    function getRouteProjection(point) {
      const route = getRouteSegments();
      if (route.total <= 0 || !point) {
        return null;
      }

      let best = null;
      for (const seg of route.segments) {
        const dx = seg.b.x - seg.a.x;
        const dy = seg.b.y - seg.a.y;
        const len2 = (dx * dx) + (dy * dy);
        if (len2 <= 0) {
          continue;
        }
        let t = ((point.x - seg.a.x) * dx + (point.y - seg.a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = seg.a.x + dx * t;
        const py = seg.a.y + dy * t;
        const distMeters = Math.hypot(point.x - px, point.y - py);
        const time = seg.cumStart + seg.dt * t;
        const altitude = Number(seg.a.altitude) + ((Number(seg.b.altitude) - Number(seg.a.altitude)) * t);
        const speed = Number(seg.a.speed) + ((Number(seg.b.speed) - Number(seg.a.speed)) * t);

        if (!best || distMeters < best.distMeters) {
          best = { x: px, y: py, distMeters, time, altitude, speed };
        }
      }

      return best;
    }

    function getRouteSegments() {
      if (state.points.length < 2) {
        return { segments: [], total: 0 };
      }

      const segments = [];
      let cum = 0;

      for (let i = 1; i < state.points.length; i += 1) {
        const a = state.points[i - 1];
        const b = state.points[i];
        const distMeters = distance(a, b);
        const avgSpeed = Math.max(1, (a.speed + b.speed) / 2);
        const dt = distMeters / avgSpeed;
        segments.push({
          a,
          b,
          dt,
          cumStart: cum,
          cumEnd: cum + dt
        });
        cum += dt;
      }

      return { segments, total: cum };
    }

    function getMinimumPlatformTot(routeTotalSeconds) {
      const routeTotal = Math.max(1, Number(routeTotalSeconds) || 0);
      return Math.ceil(routeTotal + 1);
    }

    function normalizePlatformTotToRoute({ preserveManual = true } = {}) {
      if (!refs.totTime) {
        return;
      }

      if (!state.selectedPlatform) {
        refs.totTime.value = String(DEFAULTS.totTime);
        refs.computedTakeoffTime.value = "-";
        return;
      }

      const route = getRouteSegments();
      if (route.total <= 0) {
        if (!preserveManual || !state.totManuallyEdited || !isFiniteNumber(Number(refs.totTime.value))) {
          refs.totTime.value = String(DEFAULTS.totTime);
        }
        refs.computedTakeoffTime.value = "-";
        return;
      }

      const minPlatformTot = getMinimumPlatformTot(route.total);
      const currentTot = Number(refs.totTime.value);
      const shouldResetToMinimum =
        !isFiniteNumber(currentTot) ||
        currentTot < minPlatformTot ||
        (!preserveManual || !state.totManuallyEdited);

      if (shouldResetToMinimum) {
        refs.totTime.value = String(minPlatformTot);
      }

      const normalizedTot = Number(refs.totTime.value);
      const takeoffTime = round(normalizedTot - route.total, 2);
      refs.computedTakeoffTime.value = String(Math.max(1, takeoffTime));
    }

    function syncPlatformTotToRoute() {
      normalizePlatformTotToRoute({ preserveManual: true });
    }

    function onTotTimeChange() {
      state.totManuallyEdited = true;
      normalizePlatformTotToRoute({ preserveManual: true });
      syncAllPayloadTimingRows();
      updatePayloadPlanInfo();
      renderConstraintSummary();
      drawCanvas();
      buildScenario(false);
    }

    function computeTimelinePlan() {
      const errors = [];
      const info = {};

      const platformTot = Number(refs.totTime.value);
      if (!isFiniteNumber(platformTot) || platformTot < 0) {
        errors.push("Platform ToT değeri geçerli bir sayı olmalı (>= 0).");
        return { errors, info };
      }

      const route = getRouteSegments();
      if (route.total <= 0) {
        errors.push("ToT hesaplamak için en az 2 rota noktası gerekli.");
        return { errors, info };
      }

      info.platformTot = platformTot;
      info.routeTotal = route.total;
      info.takeoffTime = platformTot - route.total;
      info.releaseBaseTime = route.total;
      if (info.takeoffTime < 1) {
        const minimumPlatformTot = getMinimumPlatformTot(route.total);
        errors.push(`Platform ToT rota suresinden en az 1 sn buyuk olmali. Minimum ToT: ${minimumPlatformTot} s.`);
      }

      if (!state.payloadEnabled || state.payloadRows.length === 0) {
        info.releaseRows = [];
        return { errors, info };
      }

      const releaseRows = [];

      for (let i = 0; i < state.payloadRows.length; i += 1) {
        const row = state.payloadRows[i];
        const weapon = state.weapons.find((w) => w.id === row.weaponId);
        if (!weapon) {
          errors.push(`Payload ${i + 1}: silah bulunamadı.`);
          continue;
        }

        if (!row.releasePoint) {
          errors.push(`Payload ${i + 1}: release noktası seçilmedi.`);
          continue;
        }

        const projection = getRouteProjection(row.releasePoint);
        if (!projection) {
          errors.push(`Payload ${i + 1}: release noktası rota üzerine projekte edilemedi.`);
          continue;
        }

        const maxSnapDistanceM = pxToWorld(30);
        if (projection.distMeters > maxSnapDistanceM) {
          errors.push(`Payload ${i + 1}: release noktası rotadan çok uzak (${round(projection.distMeters, 1)} m). Maks: ${round(maxSnapDistanceM, 1)} m`);
        }

        const target = row.targetSource?.mode ? row.targetPoint : null;
        if (!target) {
          errors.push(`Payload ${i + 1}: hedef noktası seçilmedi.`);
          continue;
        }

        const weaponDistanceMeters = distance(projection, target);

        const weaponSpeed = Math.max(1, ((weapon.kinematics.speed.min + weapon.kinematics.speed.max) / 2));
        const weaponFlightTime = weaponDistanceMeters / weaponSpeed;
        const releaseRelative = projection.time + (Number(row.releaseOffset) || 0);
        const releaseAbs = info.takeoffTime + releaseRelative;
        const rowTot = releaseAbs + weaponFlightTime;
        row.releaseTime = round(releaseAbs, 2);
        row.targetTot = round(rowTot, 2);
        row.weaponFlightTime = round(weaponFlightTime, 2);

        if (!isFiniteNumber(releaseAbs) || releaseAbs < 0) {
          errors.push(`Payload ${i + 1}: release time negatif hesaplandı (${round(releaseAbs, 2)} s).`);
        }
        if (!isFiniteNumber(rowTot) || rowTot < 0) {
          errors.push(`Payload ${i + 1}: hedef ToT negatif hesaplandı (${round(rowTot, 2)} s).`);
        }

        releaseRows.push({
          targetTot: rowTot,
          weaponFlightTime,
          releaseAbs,
          releaseRelative,
          releaseProjection: projection,
          target
        });
      }

      info.releaseBaseTime = releaseRows[0]?.releaseProjection?.time ?? route.total;
      info.releaseProjection = releaseRows[0]?.releaseProjection ?? null;
      info.target = releaseRows[0]?.target ?? null;
      info.releaseRows = releaseRows;
      return { errors, info };
    }

    function updatePayloadPlanInfo() {
      syncPlatformTotToRoute();
      const payloadRouteState = getPayloadRouteState();
      const activeRow = getActivePayloadRow();

      if (!payloadRouteState.ready) {
        refs.payloadPlanInfo.textContent = payloadRouteState.message;
        refs.computedTakeoffTime.value = state.points.length > 1 ? String(Math.max(1, round(Number(refs.totTime.value || 0) - getRouteSegments().total, 2))) : "-";
        return;
      }

      if (!state.payloadEnabled) {
        refs.payloadPlanInfo.textContent = "Önce en az bir payload ekleyin.";
        return;
      }

      if (!activeRow) {
        refs.payloadPlanInfo.textContent = "Önce en az bir payload ekleyin.";
        return;
      }

      const releaseTxt = activeRow?.releasePoint
        ? `Release=(${activeRow.releasePoint.x.toFixed(1)}, ${activeRow.releasePoint.y.toFixed(1)})`
        : "Release seçilmedi";
      const target = activeRow?.targetSource?.mode ? activeRow.targetPoint : null;
      const targetTxt = target
        ? `PayloadTarget=(${target.x.toFixed(1)}, ${target.y.toFixed(1)})`
        : "Payload hedefi seçilmedi";

      const plan = computeTimelinePlan();
      state.lastTimeline = plan;
      if (plan.errors.length > 0) {
        refs.payloadPlanInfo.textContent = `${releaseTxt} | ${targetTxt} | ${plan.errors[0]}`;
        const route = getRouteSegments();
        const fallbackTakeoff = route.total > 0 ? Math.max(1, round((Number(refs.totTime.value) || 0) - route.total, 2)) : "-";
        refs.computedTakeoffTime.value = String(fallbackTakeoff);
        return;
      }

      const firstRelease = plan.info.releaseRows?.[0];
      refs.payloadPlanInfo.textContent =
        `${releaseTxt} | ${targetTxt} | PlatformToT=${round(plan.info.platformTot, 1)} s | RouteToRelease=${round(plan.info.releaseBaseTime || 0, 1)} s | İlkAyrılış=${round(firstRelease?.releaseAbs || 0, 1)} s | İlkToT=${round(firstRelease?.targetTot || 0, 1)} s | İlkPayloadUçuş=${round(firstRelease?.weaponFlightTime || 0, 1)} s`;
      refs.computedTakeoffTime.value = String(Math.max(1, round(plan.info.takeoffTime || 0, 2)));
    }

    function drawBallisticGraph() {
      const w = refs.ballisticGraph.width;
      const h = refs.ballisticGraph.height;
      ballisticCtx.clearRect(0, 0, w, h);

      ballisticCtx.strokeStyle = "#2b4136";
      ballisticCtx.lineWidth = 1;
      ballisticCtx.strokeRect(0, 0, w, h);

      if (!state.ballisticEnabled || !state.selectedBallistic) {
        refs.ballisticGraphInfo.textContent = "Balistik model seçildiğinde grafik gösterilir.";
        return;
      }

      const b = state.selectedBallistic;
      const boostT = Number(b.trajectory?.boost?.duration || 0);
      const midT = Number(b.trajectory?.midcourse?.duration || 0);
      const impactSpeed = Number(b.trajectory?.terminal?.impactSpeed || 1);
      const maxAlt = Number(b.trajectory?.boost?.maxAltitude || 0);

      const horizontalMeters = state.ballisticLaunch && state.ballisticImpact
        ? distance(state.ballisticLaunch, state.ballisticImpact)
        : Math.max(10000, (b.range?.minKm || 10) * 1000);
      const terminalT = Math.max(20, horizontalMeters / Math.max(1, impactSpeed));
      const totalT = Math.max(1, boostT + midT + terminalT);

      const samples = [
        { t: 0, a: 0 },
        { t: boostT, a: maxAlt },
        { t: boostT + midT, a: maxAlt * 0.85 },
        { t: totalT, a: 0 }
      ];

      const left = 36;
      const right = w - 12;
      const top = 12;
      const bottom = h - 26;
      const plotW = right - left;
      const plotH = bottom - top;

      ballisticCtx.strokeStyle = "#6fb68a";
      ballisticCtx.beginPath();
      ballisticCtx.moveTo(left, top);
      ballisticCtx.lineTo(left, bottom);
      ballisticCtx.lineTo(right, bottom);
      ballisticCtx.stroke();

      ballisticCtx.strokeStyle = "#4cc8ff";
      ballisticCtx.lineWidth = 2;
      ballisticCtx.beginPath();
      for (let i = 0; i < samples.length; i += 1) {
        const sx = left + (samples[i].t / totalT) * plotW;
        const sy = bottom - (samples[i].a / Math.max(1, maxAlt)) * plotH;
        if (i === 0) {
          ballisticCtx.moveTo(sx, sy);
        } else {
          ballisticCtx.lineTo(sx, sy);
        }
      }
      ballisticCtx.stroke();

      ballisticCtx.fillStyle = "#d7f8df";
      ballisticCtx.font = "11px Space Grotesk";
      ballisticCtx.fillText("Zaman (s)", right - 58, h - 8);
      ballisticCtx.fillText("İrtifa (m)", 6, 12);
      ballisticCtx.fillText(`Toplam Uçuş: ${round(totalT, 1)} s`, left, h - 8);

      refs.ballisticGraphInfo.textContent =
        `Boost ${boostT}s, Midcourse ${midT}s, Terminal ~${round(terminalT, 1)}s, Max Altitude ${Math.round(maxAlt)} m`;
    }

    function buildScenario(showPopupOnError = true) {
      // Keep takeoff display in sync even when scenario build returns with validation errors.
      updatePayloadPlanInfo();

      const liveErrors = [];
      const scenarioId = getThreatScenarioId();
      if (!scenarioId) {
        liveErrors.push("Senaryo ismi giriniz.");
        if (showPopupOnError) {
          popupErrors(liveErrors);
        }
        refs.output.value = "";
        state.scenario = null;
        setSchemaValidation(liveErrors);
        return null;
      }

      const entities = [];

      for (const item of state.savedKinematicEntities) {
        entities.push(item.entity);
      }
      for (const item of state.savedBallisticEntities) {
        entities.push(item.entity);
      }

      if (entities.length === 0) {
        const draftK = buildCurrentKinematicEntity(false);
        if (draftK) {
          entities.push(draftK.entity);
        }
        const draftB = buildCurrentBallisticEntity(false);
        if (draftB) {
          entities.push(draftB.entity);
        }
      }

      if (entities.length === 0) {
        liveErrors.push("En az bir hedefi 'Senaryoya Ekle' ile listeye ekleyin.");
        if (showPopupOnError) {
          popupErrors(liveErrors);
        }
        refs.output.value = "";
        state.scenario = null;
        setSchemaValidation(liveErrors);
        return null;
      }

      const scenario = {
        scenarioId,
        timeStep: 1,
        planning: {
          platformTot: Math.max(0, Number(refs.totTime.value) || 0),
          payloadTots: state.payloadRows.map((row) => Math.max(0, Number(row.targetTot) || 0)),
          ballisticLaunchTime: parseOptionalNumberInput(refs.launchTime.value),
          ballisticImpactTot: parseOptionalNumberInput(refs.impactTot.value),
          attackTarget: [round(state.attackTarget.x, 3), round(state.attackTarget.y, 3)],
          attackTargetDefinition: getCurrentAttackTargetDefinition(),
          payloadReleasePoint: null,
          payloadTargetPoint: null,
          payloadTargetDefinition: null,
          ballisticImpactDefinition: getCurrentBallisticImpactDefinition(),
          kinematicCount: state.savedKinematicEntities.length,
          ballisticCount: state.savedBallisticEntities.length
        },
        entities
      };

      const schemaErrors = validateScenarioAgainstSchema(scenario);
      if (schemaErrors.length > 0) {
        if (showPopupOnError) {
          popupErrors(schemaErrors);
        }
        refs.output.value = "";
        state.scenario = null;
        setSchemaValidation(schemaErrors);
        return null;
      }

      state.scenario = scenario;
      refs.output.value = JSON.stringify(scenario, null, 2);
      setSchemaValidation([]);
      return scenario;
    }

    function getThreatScenarioId() {
      const currentId = String(refs.scenarioName.value || "").trim();
      if (currentId) {
        return currentId;
      }
      try {
        const parentScenarioName = String(PARENT_DOC?.getElementById("defenseScenarioName")?.value || "").trim();
        if (parentScenarioName) {
          refs.scenarioName.value = parentScenarioName;
          return parentScenarioName;
        }
      } catch (_err) {
        // Ignore parent access issues.
      }
      refs.scenarioName.value = "Birlesik Senaryo";
      return refs.scenarioName.value;
    }

    function validatePayload() {
      const errors = [];
      if (!state.payloadEnabled) {
        return errors;
      }

      const payloadRouteState = getPayloadRouteState();
      if (!payloadRouteState.ready) {
        errors.push(payloadRouteState.message);
        return errors;
      }

      if (!state.selectedPlatform?.payloadCapable) {
        errors.push("Seçilen platform payload taşıyamaz.");
        return errors;
      }

      const maxCount = state.selectedPlatform.maxPayloadCount ?? 0;
      if (state.payloadRows.length > maxCount) {
        errors.push(`Payload adedi limit dışında. Min: 0, Max: ${maxCount}`);
      }

      for (let i = 0; i < state.payloadRows.length; i += 1) {
        const row = state.payloadRows[i];
        if (!row.weaponId) {
          errors.push(`Payload ${i + 1}: silah seçilmedi.`);
          continue;
        }
        const weapon = state.weapons.find((w) => w.id === row.weaponId);
        if (!weapon) {
          errors.push(`Payload ${i + 1}: Silah bulunamadı.`);
          continue;
        }

        if (!row.releasePoint) {
          errors.push(`Payload ${i + 1}: Release noktası seçilmedi.`);
        }

        if (!row.targetSource?.mode || !row.targetPoint) {
          errors.push(`Payload ${i + 1}: Hedef noktası seçilmedi.`);
        }

        if (!isFiniteNumber(row.releaseOffset)) {
          errors.push(`Payload ${i + 1}: Release offset sayısal olmalı.`);
        } else if (row.releaseOffset < 0) {
          errors.push(`Payload ${i + 1}: Release offset >= 0 olmalı.`);
        }
      }

      return errors;
    }

    function setSchemaValidation(errors) {
      state.schemaErrors = errors;
      refs.schemaValidationList.innerHTML = "";

      if (!errors || errors.length === 0) {
        refs.schemaStatus.textContent = "Şema doğrulama başarılı.";
        refs.schemaStatus.className = "status ok";
        return;
      }

      refs.schemaStatus.textContent = `Şema doğrulama hatası (${errors.length})`;
      refs.schemaStatus.className = "status warn";
      for (const err of errors) {
        const li = document.createElement("li");
        li.textContent = err;
        refs.schemaValidationList.appendChild(li);
      }
    }

    function validateScenarioAgainstSchema(scenario) {
      const errors = [];
      if (!scenario || typeof scenario !== "object") {
        return ["Senaryo nesnesi üretilemedi."];
      }

      if (!isNonEmptyString(scenario.scenarioId)) {
        errors.push("scenarioId zorunlu ve string olmalı.");
      }
      if (!isFiniteNumber(scenario.timeStep) || scenario.timeStep < 0.1) {
        errors.push("timeStep >= 0.1 olmalı.");
      }
      if (!Array.isArray(scenario.entities) || scenario.entities.length === 0) {
        errors.push("entities en az 1 eleman içermeli.");
        return errors;
      }

      scenario.entities.forEach((entity, idx) => {
        if (!entity || typeof entity !== "object") {
          errors.push(`entities[${idx}] nesne olmalı.`);
          return;
        }

        if (entity.entityType === "KinematicTarget") {
          validateKinematicEntity(entity, idx, errors);
        } else if (entity.entityType === "BallisticTarget") {
          validateBallisticEntity(entity, idx, errors);
        } else {
          errors.push(`entities[${idx}].entityType geçersiz.`);
        }
      });

      return errors;
    }

    function validateKinematicEntity(entity, idx, errors) {
      const categories = new Set(["Aircraft", "UAV", "CruiseMissile", "SOW", "KamikazeUAV"]);
      if (!isNonEmptyString(entity.id)) errors.push(`entities[${idx}].id zorunlu.`);
      if (!categories.has(entity.category)) errors.push(`entities[${idx}].category geçersiz.`);
      if (!isFiniteNumber(entity.rcs) || entity.rcs < 0) errors.push(`entities[${idx}].rcs >= 0 olmalı.`);
      if (!isFiniteNumber(entity.pSuccess) || entity.pSuccess < 0 || entity.pSuccess > 1) errors.push(`entities[${idx}].pSuccess [0,1] aralığında olmalı.`);
      if (!entity.kinematics) errors.push(`entities[${idx}].kinematics zorunlu.`);
      if (!entity.flightPlan) errors.push(`entities[${idx}].flightPlan zorunlu.`);

      const fp = entity.flightPlan || {};
      if (!isFiniteNumber(fp.takeoffTime) || fp.takeoffTime < 0) errors.push(`entities[${idx}].flightPlan.takeoffTime >= 0 olmalı.`);
      if (!fp.initialState) {
        errors.push(`entities[${idx}].flightPlan.initialState zorunlu.`);
      } else {
        const s = fp.initialState;
        if (!isPositionArray(s.position)) errors.push(`entities[${idx}].flightPlan.initialState.position [x,y] olmalı.`);
        if (!isFiniteNumber(s.altitude)) errors.push(`entities[${idx}].flightPlan.initialState.altitude sayı olmalı.`);
        if (!isFiniteNumber(s.speed)) errors.push(`entities[${idx}].flightPlan.initialState.speed sayı olmalı.`);
        if (!isFiniteNumber(s.heading)) errors.push(`entities[${idx}].flightPlan.initialState.heading sayı olmalı.`);
      }
      if (!Array.isArray(fp.waypoints)) errors.push(`entities[${idx}].flightPlan.waypoints dizi olmalı.`);

      if (!Array.isArray(entity.payload)) {
        errors.push(`entities[${idx}].payload dizi olmalı.`);
      } else {
        entity.payload.forEach((p, pIdx) => {
          const allowed = new Set(["SOW", "GuidedMissile", "CruiseMissile"]);
          if (!isNonEmptyString(p.id)) errors.push(`entities[${idx}].payload[${pIdx}].id zorunlu.`);
          if (!allowed.has(p.category)) errors.push(`entities[${idx}].payload[${pIdx}].category geçersiz.`);
          if (!isFiniteNumber(p.rcs) || p.rcs < 0) errors.push(`entities[${idx}].payload[${pIdx}].rcs >= 0 olmalı.`);
          if (!isFiniteNumber(p.pSuccess) || p.pSuccess < 0 || p.pSuccess > 1) errors.push(`entities[${idx}].payload[${pIdx}].pSuccess [0,1] olmalı.`);
          if (!p.kinematics) errors.push(`entities[${idx}].payload[${pIdx}].kinematics zorunlu.`);
          if (!p.release || !isFiniteNumber(p.release.time) || p.release.time < 0) {
            errors.push(`entities[${idx}].payload[${pIdx}].release.time >= 0 olmalı.`);
          }
        });
      }
    }

    function validateBallisticEntity(entity, idx, errors) {
      if (!isNonEmptyString(entity.id)) errors.push(`entities[${idx}].id zorunlu.`);
      if (!isFiniteNumber(entity.launchTime) || entity.launchTime < 0) errors.push(`entities[${idx}].launchTime >= 0 olmalı.`);
      if (entity.impactTime !== undefined) {
        if (!isFiniteNumber(entity.impactTime) || entity.impactTime < 0) {
          errors.push(`entities[${idx}].impactTime >= 0 olmalı.`);
        } else if (isFiniteNumber(entity.launchTime) && entity.impactTime <= entity.launchTime) {
          errors.push(`entities[${idx}].impactTime launchTime'dan büyük olmalı.`);
        }
      }
      if (!isFiniteNumber(entity.rcs) || entity.rcs < 0) errors.push(`entities[${idx}].rcs >= 0 olmalı.`);
      if (!isFiniteNumber(entity.pSuccess) || entity.pSuccess < 0 || entity.pSuccess > 1) errors.push(`entities[${idx}].pSuccess [0,1] olmalı.`);

      const tr = entity.trajectory || {};
      if (!isPositionArray(tr.launchPoint)) errors.push(`entities[${idx}].trajectory.launchPoint [x,y] olmalı.`);
      if (!tr.boost || !isFiniteNumber(tr.boost.duration) || tr.boost.duration < 0) errors.push(`entities[${idx}].trajectory.boost.duration >= 0 olmalı.`);
      if (!tr.boost || !isFiniteNumber(tr.boost.maxAltitude) || tr.boost.maxAltitude < 0) errors.push(`entities[${idx}].trajectory.boost.maxAltitude >= 0 olmalı.`);
      if (!tr.midcourse || !isFiniteNumber(tr.midcourse.duration) || tr.midcourse.duration < 0) errors.push(`entities[${idx}].trajectory.midcourse.duration >= 0 olmalı.`);
      if (!tr.terminal || !isPositionArray(tr.terminal.impactPoint)) errors.push(`entities[${idx}].trajectory.terminal.impactPoint [x,y] olmalı.`);
      if (!tr.terminal || !isFiniteNumber(tr.terminal.impactSpeed) || tr.terminal.impactSpeed < 0) errors.push(`entities[${idx}].trajectory.terminal.impactSpeed >= 0 olmalı.`);
    }

    function downloadScenario() {
      const scenario = buildScenario(true);
      if (!scenario) {
        return;
      }

      const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scenario.scenarioId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function normalizePayloadCategory(category) {
      const allowed = new Set(["SOW", "GuidedMissile", "CruiseMissile"]);
      return allowed.has(category) ? category : "GuidedMissile";
    }
