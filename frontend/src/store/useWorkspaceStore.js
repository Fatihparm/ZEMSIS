import { create } from 'zustand';
import {
  defaultParameters,
  defaultUnits,
  defaultSoilLayers,
  defaultExtraParams,
} from '../constants/defaults';
import { loadAutosave, clearAutosave } from '../hooks/useAutoSave';

const savedAutosave = loadAutosave();

export const useWorkspaceStore = create((set, get) => ({
  parameters: savedAutosave?.parameters || { ...defaultParameters },
  soilLayers: savedAutosave?.soilLayers || [...defaultSoilLayers],
  units: savedAutosave?.units || { ...defaultUnits },
  extraParams: savedAutosave?.extraParams || { ...defaultExtraParams },
  results: null,
  layerResults: null,
  currentProjectId: null,
  currentProjectName: '',
  improvementMethod: 'jet_grout',
  showSaveModal: false,
  drawingData: null,

  // ── Setters ────────────────────────────────────────────────────────────────
  setParameters: (updater) =>
    set((state) => ({
      parameters: typeof updater === 'function' ? updater(state.parameters) : updater,
    })),

  setSoilLayers: (updater) =>
    set((state) => ({
      soilLayers: typeof updater === 'function' ? updater(state.soilLayers) : updater,
    })),

  setUnits: (updater) =>
    set((state) => ({
      units: typeof updater === 'function' ? updater(state.units) : updater,
    })),

  setExtraParams: (updater) =>
    set((state) => ({
      extraParams: typeof updater === 'function' ? updater(state.extraParams) : updater,
    })),

  setResults: (results) => set({ results }),
  setLayerResults: (layerResults) => set({ layerResults }),
  setShowSaveModal: (showSaveModal) => set({ showSaveModal }),
  setImprovementMethod: (improvementMethod) => set({ improvementMethod }),

  // ── Handlers ──────────────────────────────────────────────────────────────
  handleInputChange: (e) => {
    const { name, value } = e.target;
    set((state) => ({
      parameters: { ...state.parameters, [name]: value },
    }));
  },

  handleUnitChange: (fieldName, newUnit) => {
    set((state) => ({
      units: { ...state.units, [fieldName]: newUnit },
    }));
  },

  handleDrawingDataChange: (data) => {
    set({ drawingData: data });
  },

  resetWorkspace: (method = 'jet_grout') => {
    clearAutosave();
    set({
      currentProjectId: null,
      currentProjectName: '',
      improvementMethod: method,
      parameters: { ...defaultParameters },
      soilLayers: [...defaultSoilLayers],
      units: { ...defaultUnits },
      extraParams: { ...defaultExtraParams },
      results: null,
      layerResults: null,
      drawingData: null,
    });
  },

  handleLoadProject: (project) => {
    set({
      currentProjectId: project.id,
      currentProjectName: project.name,
      improvementMethod: project.improvementMethod || 'jet_grout',
      parameters: project.parameters || { ...defaultParameters },
      soilLayers: project.soilLayers?.length > 0 ? project.soilLayers : [...defaultSoilLayers],
      units: project.units || { ...defaultUnits },
      results: project.results || null,
      extraParams: project.extraParams || { ...defaultExtraParams },
      drawingData: project.drawingData || null,
    });
  },

  handleSaveComplete: (savedProject) => {
    set({
      currentProjectId: savedProject.id,
      currentProjectName: savedProject.name,
      showSaveModal: false,
    });
  },

  getProjectData: () => {
    const state = get();
    return {
      name: state.currentProjectName,
      description: '',
      parameters: state.parameters,
      soilLayers: state.soilLayers,
      results: state.results,
      drawingData: state.drawingData,
      units: state.units,
      extraParams: state.extraParams,
      improvementMethod: state.improvementMethod,
    };
  },
}));
