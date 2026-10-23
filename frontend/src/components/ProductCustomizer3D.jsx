import React, { useState, useRef, useEffect, useContext } from 'react';
import { Upload, Sliders, Settings } from 'lucide-react';
import api from '../services/api';
import BlenderControls from './blender/BlenderControls';
import BlenderViewer from './blender/BlenderViewer';
import SlotOrderPanel from './blender/SlotOrderPanel';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate, Navigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', width: '100%',
          background: 'rgba(127,29,29,0.2)', color: '#f87171', padding: '1rem', overflow: 'auto'
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>3D Render Error</h2>
          <p style={{ fontSize: '0.875rem' }}>{this.state.error?.message}</p>
          <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProductCustomizer3D() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return <Navigate to="/categories" replace />;
  }

  const { user } = useContext(AuthContext);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';

  const [modelUrl, setModelUrl] = useState(null);
  const [schema, setSchema] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [globalScale, setGlobalScale] = useState(1.0);
  const fileInputRef = useRef(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filledSlots, setFilledSlots] = useState({});
  const [slotUrls, setSlotUrls] = useState({});
  const [lightingIntensity, setLightingIntensity] = useState(1.0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (schema?.defaultLightingIntensity !== undefined) {
      setLightingIntensity(schema.defaultLightingIntensity);
    }
  }, [schema]);

  const API_BASE = import.meta.env.VITE_API_URL;

  const handleAddToSlot = (params) => {
    if (!selectedSlot) return;
    
    setFilledSlots(prev => {
      const nextFilled = { ...prev, [selectedSlot]: params };
      
      const slotCount = schema?.slotCount || 30;
      if (slotCount) {
        const slotPrefix = schema?.slotPrefix || 'Slot.';
        const currentIndex = parseInt(selectedSlot.replace(slotPrefix, ''), 10) || 1;
        let nextIndex = currentIndex + 1;
        
        let foundNext = false;
        while (nextIndex <= slotCount) {
          const nextSlotName = `${slotPrefix}${String(nextIndex).padStart(3, '0')}`;
          if (!nextFilled[nextSlotName]) {
            setSelectedSlot(nextSlotName);
            foundNext = true;
            break;
          }
          nextIndex++;
        }
        
        if (!foundNext) {
          for (let i = 1; i < currentIndex; i++) {
            const nextSlotName = `${slotPrefix}${String(i).padStart(3, '0')}`;
            if (!nextFilled[nextSlotName]) {
              setSelectedSlot(nextSlotName);
              break;
            }
          }
        }
      }
      return nextFilled;
    });

    if (modelUrl) {
      setSlotUrls(prev => ({ ...prev, [selectedSlot]: modelUrl }));
    }
  };

  const handleRequestQuote = async () => {
    if (Object.keys(filledSlots).length === 0) {
      alert("Please configure at least one slot first.");
      return;
    }

    const displaySlots = {};
    for (const [slotName, params] of Object.entries(filledSlots)) {
      displaySlots[slotName] = {};
      for (const input of schema?.inputs || []) {
        if (input.hidden) continue;
        const raw = params[input.id];
        if (raw === undefined || raw === null) continue;
        
        const unitKey = input.unit || 'none';
        const suffix = unitKey === 'm' ? ' m' : unitKey === 'cm' ? ' cm' : unitKey === 'mm' ? ' mm' : unitKey === 'in' ? ' in' : unitKey === 'ft' ? ' ft' : unitKey === 'rad' ? ' rad' : unitKey === 'deg' ? '°' : '';
        const scaler = unitKey === 'none' ? 1 : (
          unitKey === 'm' ? 1 :
          unitKey === 'cm' ? 100 :
          unitKey === 'mm' ? 1000 :
          unitKey === 'in' ? 39.3701 :
          unitKey === 'ft' ? 3.28084 :
          unitKey === 'deg' ? 57.2957795 : 1
        );
        let displayVal;
        if (typeof raw === 'number') {
          displayVal = (raw * scaler).toFixed(2) + suffix;
        } else {
          displayVal = String(raw);
        }
        displaySlots[slotName][input.name] = displayVal;
      }
    }
    
    try {
      await api.post(`/orders/custom`, {
        product_id: parseInt(id),
        slots: filledSlots,
        display_slots: displaySlots
      });
      setShowSuccessModal(true);
      setFilledSlots({});
      setSlotUrls({});
      setSelectedSlot(null);
    } catch (err) {
      console.error(err);
      alert("Failed to submit custom quote.");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.blend')) {
      setIsUploading(true);
      setError('');
      setSchema(null);
      setModelUrl(null);
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post(`${API_BASE}/blender/models/${id}/template`, formData);
        const res = await api.get(`${API_BASE}/blender/models/${id}/schema`);
        setSchema(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to upload and parse .blend template.');
      } finally {
        setIsUploading(false);
      }
    } else {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setSchema(null);
    }
  };

  const pollJobStatus = async (jobId) => {
    try {
      const res = await api.get(`${API_BASE}/blender/jobs/${jobId}`);
      if (res.data.status === 'completed') {
        setModelUrl(`${API_BASE}${res.data.modelUrl}`);
        setIsGenerating(false);
      } else if (res.data.status === 'failed') {
        const errMsg = res.data.error || '';
        const lines = errMsg.split('\\n').filter(line => line.includes('Error:'));
        setError(lines.length > 0 ? lines[0] : 'Model generation failed.');
        setIsGenerating(false);
      } else {
        setTimeout(() => pollJobStatus(jobId), 1500);
      }
    } catch (err) {
      setError('Error polling job status.');
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (parameters) => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await api.post(`${API_BASE}/blender/models/${id}/generate`, { parameters });
      if (res.data.status === 'completed') {
        setModelUrl(`${API_BASE}${res.data.modelUrl}`);
        setIsGenerating(false);
      } else {
        pollJobStatus(res.data.jobId);
      }
    } catch (err) {
      setError('Failed to initiate model generation.');
      setIsGenerating(false);
    }
  };

  const handleSchemaUpdate = async (updaterOrNewSchema) => {
    setSchema(prev => {
      const newSchema = typeof updaterOrNewSchema === 'function' ? updaterOrNewSchema(prev) : updaterOrNewSchema;
      if (newSchema.globalScale) setGlobalScale(newSchema.globalScale);
      api.put(`${API_BASE}/blender/models/${id}/schema`, newSchema).catch(err => {
        console.error('Failed to update schema', err);
      });
      return newSchema;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await api.get(`${API_BASE}/products/${id}`);
        if (prodRes.data.model_3d_url) {
          const url = prodRes.data.model_3d_url.startsWith('http')
            ? prodRes.data.model_3d_url
            : `${API_BASE}${prodRes.data.model_3d_url}`;
          setModelUrl(url);
        }
      } catch (err) {
        console.error('Could not fetch product:', err);
      }
      try {
        const res = await api.get(`${API_BASE}/blender/models/${id}/schema`);
        setSchema(res.data);
      } catch (err) {
        setSchema(null);
      }
    };
    fetchData();
  }, [id, API_BASE]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Top Section: 3D Viewer & Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '65vh',
        minHeight: '500px',
        gap: '1rem',
      }}>
      <div style={{
        flex: 1,
        position: 'relative',
        background: 'var(--bg-deep)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {(!schema && !modelUrl) ? (
          isAdminRole ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', textAlign: 'center', padding: '2rem',
            }}>
              <Upload style={{ width: '4rem', height: '4rem', marginBottom: '1rem', color: '#64748b', opacity: 0.5 }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem', color: '#cbd5e1' }}>
                Upload 3D Template
              </h2>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '28rem', fontSize: '0.875rem' }}>
                Upload a .blend file with Geometry Nodes to extract schema, or upload a .glb to view directly.
              </p>
              {error && (
                <div style={{ marginBottom: '1rem', color: '#f87171', background: 'rgba(127,29,29,0.2)', padding: '0.75rem', borderRadius: '0.375rem' }}>
                  {error}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="btn btn-primary">
                {isUploading ? 'Extracting Schema...' : 'Select File (.blend, .glb)'}
              </button>
              <input type="file" accept=".blend,.glb,.gltf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', textAlign: 'center', padding: '2rem',
            }}>
              <Settings style={{ width: '4rem', height: '4rem', marginBottom: '1rem', color: '#64748b', opacity: 0.5 }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem', color: '#cbd5e1' }}>
                3D Model Unavailable
              </h2>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '28rem', fontSize: '0.875rem' }}>
                The 3D customization model for this product has not been set up yet.
              </p>
            </div>
          )
        ) : (
          <>
            {isGenerating && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  width: '3rem', height: '3rem',
                  border: '4px solid var(--brand-primary)', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ marginTop: '1rem', fontWeight: 600, color: '#fff' }}>Generating via Blender...</p>
              </div>
            )}
            {error && (
              <div style={{
                position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20,
                background: 'rgba(127,29,29,0.9)', color: '#f87171', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)', fontWeight: 'bold'
              }}>
                {error}
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0 }}>
              <ErrorBoundary>
                <BlenderViewer 
                  modelUrl={modelUrl} 
                  globalScale={globalScale} 
                  filledSlots={filledSlots}
                  slotUrls={slotUrls}
                  selectedSlot={selectedSlot}
                  onSlotClick={setSelectedSlot}
                  generatableObjectName={schema?.generatableObjectName}
                  slotDrillZOffset={schema?.slotDrillZOffset}
                  slotPrefix={schema?.slotPrefix}
                  lightingIntensity={lightingIntensity}
                  schema={schema}
                />
              </ErrorBoundary>
            </div>
            {isAdminRole && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', top: '1rem', left: '1rem', zIndex: 20,
                  padding: '0.5rem 1rem', background: 'rgba(15,23,42,0.8)',
                  backdropFilter: 'blur(4px)', fontSize: '0.75rem', borderRadius: '0.375rem',
                  border: '1px solid #475569', color: '#e2e8f0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <Upload size={14} /> Replace File
              </button>
            )}
            <input type="file" accept=".blend,.glb,.gltf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          </>
        )}
      </div>

      {(schema || isAdminRole) && (
        <div className="card" style={{
          width: '320px', flexShrink: 0, display: 'flex',
          flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0,
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Sliders style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Customization</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configure geometry parameters</p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {!schema ? (
              <div style={{
                color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '1rem',
                borderRadius: '0.5rem', border: '1px dashed var(--glass-border-subtle)',
                fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              }}>
                <Settings style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, color: '#94a3b8' }} />
                <p style={{ margin: 0 }}>No customizable parameters detected. Upload a valid .blend template.</p>
              </div>
            ) : (
              <BlenderControls
                schema={schema}
                onGenerate={handleGenerate}
                isLoading={isGenerating}
                isAdmin={isAdminRole}
                onSchemaUpdate={handleSchemaUpdate}
                selectedSlot={selectedSlot}
                onAddToSlot={handleAddToSlot}
                lightingIntensity={lightingIntensity}
                onLightingIntensityChange={setLightingIntensity}
              />
            )}
          </div>
        </div>
      )}
      </div>

      {/* Slot Order Panel Section */}
      {schema && (
        <div style={{ flexShrink: 0, marginTop: '1rem' }}>
          <SlotOrderPanel
            schema={schema}
            slots={filledSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onRemoveSlot={(slot) => {
              setFilledSlots(prev => {
                const next = { ...prev };
                delete next[slot];
                return next;
              });
              if (selectedSlot === slot) setSelectedSlot(null);
            }}
            onProceedToOrder={handleRequestQuote}
          />
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', margin: '0 1rem' }}>
            <div style={{
              width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#10b981'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Request Sent Successfully!
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Your custom kit configuration has been submitted. Our admin team will review your order and get back to you with a quote shortly.
            </p>
            <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)} style={{ width: '100%' }}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
