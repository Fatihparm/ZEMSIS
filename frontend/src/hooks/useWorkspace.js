/**
 * useWorkspace — Çalışma alanı state hook'u
 *
 * parameters, soilLayers, units, extraParams, results, layerResults,
 * drawingDataRef ve proje işlemleri (yükle / sıfırla / kaydetme tamamlandı)
 * burada yönetilir. Daha önce App.jsx içindeydi.
 */
import { useState, useRef } from 'react';
import {
  defaultParameters,
  defaultUnits,
  defaultSoilLayers,
  defaultExtraParams,
} from '../constants/defaults';
import { loadAutosave, clearAutosave } from './useAutoSave';

export function useWorkspace() {
  const [parameters, setParameters] = useState(() => {
    const saved = loadAutosave();
    return saved?.parameters || { ...defaultParameters };
  });
  const [soilLayers, setSoilLayers] = useState(() => {
    const saved = loadAutosave();
    return saved?.soilLayers || [...defaultSoilLayers];
  });
  const [units, setUnits] = useState(() => {
    const saved = loadAutosave();
    return saved?.units || { ...defaultUnits };
  });
  const [extraParams, setExtraParams] = useState(() => {
    const saved = loadAutosave();
    return saved?.extraParams || { ...defaultExtraParams };
  });

  const [results,      setResults]      = useState(null);
  const [layerResults, setLayerResults] = useState(null);

  const [currentProjectId,   setCurrentProjectId]   = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [showSaveModal,      setShowSaveModal]       = useState(false);

  const drawingDataRef = useRef(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (fieldName, newUnit) => {
    setUnits(prev => ({ ...prev, [fieldName]: newUnit }));
  };

  const handleDrawingDataChange = (data) => {
    drawingDataRef.current = data;
  };

  const resetWorkspace = () => {
    setCurrentProjectId(null);
    setCurrentProjectName('');
    setParameters({ ...defaultParameters });
    setSoilLayers([...defaultSoilLayers]);
    setUnits({ ...defaultUnits });
    setResults(null);
    setLayerResults(null);
    setExtraParams({ ...defaultExtraParams });
    drawingDataRef.current = null;
    clearAutosave();
  };

  const handleLoadProject = (project) => {
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    if (project.parameters) setParameters(project.parameters);
    if (project.soilLayers?.length > 0) setSoilLayers(project.soilLayers);
    if (project.units)      setUnits(project.units);
    if (project.results)    setResults(project.results);
    setExtraParams(project.extraParams || { ...defaultExtraParams });
    drawingDataRef.current = project.drawingData || null;
  };

  const handleSaveComplete = (savedProject) => {
    setCurrentProjectId(savedProject.id);
    setCurrentProjectName(savedProject.name);
    setShowSaveModal(false);
  };

  const getProjectData = () => ({
    name: currentProjectName,
    description: '',
    parameters,
    soilLayers,
    results,
    drawingData: drawingDataRef.current,
    units,
    extraParams,
  });

  return {
    // state
    parameters, setParameters,
    soilLayers, setSoilLayers,
    units, setUnits,
    extraParams, setExtraParams,
    results, setResults,
    layerResults, setLayerResults,
    currentProjectId,
    currentProjectName,
    showSaveModal, setShowSaveModal,
    drawingDataRef,
    // handlers
    handleInputChange,
    handleUnitChange,
    handleDrawingDataChange,
    resetWorkspace,
    handleLoadProject,
    handleSaveComplete,
    getProjectData,
  };
}
