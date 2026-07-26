/**
 * useWorkspace — Çalışma alanı state hook'u (Zustand Store Wrapper)
 *
 * Zustand store (useWorkspaceStore) üzerinden tüm çalışma alanı durumunu
 * ve aksiyonlarını yönetir.
 */
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function useWorkspace() {
  const store = useWorkspaceStore();

  return {
    // State
    parameters: store.parameters,
    setParameters: store.setParameters,
    soilLayers: store.soilLayers,
    setSoilLayers: store.setSoilLayers,
    units: store.units,
    setUnits: store.setUnits,
    extraParams: store.extraParams,
    setExtraParams: store.setExtraParams,
    results: store.results,
    setResults: store.setResults,
    layerResults: store.layerResults,
    setLayerResults: store.setLayerResults,
    currentProjectId: store.currentProjectId,
    currentProjectName: store.currentProjectName,
    showSaveModal: store.showSaveModal,
    setShowSaveModal: store.setShowSaveModal,

    // Drawing data ref adapter for backward compatibility
    drawingDataRef: { current: store.drawingData },

    // Handlers
    handleInputChange: store.handleInputChange,
    handleUnitChange: store.handleUnitChange,
    handleDrawingDataChange: store.handleDrawingDataChange,
    resetWorkspace: store.resetWorkspace,
    handleLoadProject: store.handleLoadProject,
    handleSaveComplete: store.handleSaveComplete,
    getProjectData: store.getProjectData,
  };
}
