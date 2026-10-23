import React, { useState, useEffect } from 'react';
import { Settings2, Eye, EyeOff, Package } from 'lucide-react';

const controlMap = {
  float: 'range',
  integer: 'number',
  boolean: 'checkbox',
  color: 'color',
  string: 'text',
};

const UNIT_SCALERS = {
  none: { label: 'Raw / No Unit', scaler: 1, suffix: '' },
  m: { label: 'Meters (m)', scaler: 1, suffix: ' m' },
  cm: { label: 'Centimeters (cm)', scaler: 100, suffix: ' cm' },
  mm: { label: 'Millimeters (mm)', scaler: 1000, suffix: ' mm' },
  in: { label: 'Inches (in)', scaler: 39.3701, suffix: ' in' },
  ft: { label: 'Feet (ft)', scaler: 3.28084, suffix: ' ft' },
  rad: { label: 'Radians (rad)', scaler: 1, suffix: ' rad' },
  deg: { label: 'Degrees (°)', scaler: 57.2957795, suffix: '°' },
};

// ─── Scene Setup (admin only) ────────────────────────────────────────────────
function SceneSetupPanel({ schema, onSchemaUpdate }) {
  const objects = schema?.objects || [];
  const generatable = schema?.generatableObjectName || '';
  const slotPrefix = schema?.slotPrefix || 'Slot.';
  const slotCount = schema?.slotCount ?? 30;
  const zOffset = schema?.slotDrillZOffset ?? 0;
  const floatHeight = schema?.animationFloatHeight ?? 0.02;
  const animDuration = schema?.animationDurationMs ?? 300;

  const update = (field, value) => {
    if (onSchemaUpdate) onSchemaUpdate(prev => ({ ...prev, [field]: value }));
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--input-bg)',
    border: '1px solid var(--glass-border-subtle)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '13px',
  };

  return (
    <div style={{
      marginBottom: '22px',
      padding: '16px',
      border: '1px solid rgba(251,191,36,0.4)',
      borderRadius: '10px',
      background: 'rgba(251,191,36,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px', color: '#fbbf24', fontWeight: '700', fontSize: '13px' }}>
        <Settings2 size={15} /> Scene Setup
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#aaa', fontWeight: 'normal' }}>Admin Only</span>
      </div>

      {/* Generatable Object */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>
          Generatable Object (drill)
        </label>
        {objects.length > 0 ? (
          <select value={generatable} onChange={e => update('generatableObjectName', e.target.value)} style={inputStyle}>
            <option value="">— select object —</option>
            {objects.map(name => (
              <option key={name} value={name} style={{ background: '#333' }}>{name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={generatable}
            placeholder="e.g. DrillBit"
            onChange={e => update('generatableObjectName', e.target.value)}
            style={inputStyle}
          />
        )}
        {objects.length === 0 && (
          <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
            Re-upload the .blend file to populate the dropdown.
          </p>
        )}
      </div>

      {/* Slot Prefix */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>
          Slot Object Prefix
        </label>
        <input
          type="text"
          value={slotPrefix}
          placeholder="e.g. Slot."
          onChange={e => update('slotPrefix', e.target.value)}
          style={inputStyle}
        />
        <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
          Objects named <code style={{ color: '#fbbf24' }}>{slotPrefix}001</code>, <code style={{ color: '#fbbf24' }}>{slotPrefix}002</code>, … are treated as slots.
        </p>
      </div>

      {/* Slot Count + Z Offset */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>
            Slot Count
          </label>
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={slotCount}
            onChange={e => update('slotCount', parseInt(e.target.value) || 1)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>
            Drill Z Offset (m)
          </label>
          <input
            type="number"
            step="any"
            value={zOffset}
            onChange={e => update('slotDrillZOffset', parseFloat(e.target.value) || 0)}
            style={inputStyle}
          />
        </div>
      </div>
      <p style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
        Z offset nudges drills vertically inside each slot rubber.
      </p>

      {/* Animation Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>
            Float Height Offset
          </label>
          <input
            type="number"
            step="any"
            value={floatHeight}
            onChange={e => update('animationFloatHeight', parseFloat(e.target.value) || 0)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>
            Drop Duration (ms)
          </label>
          <input
            type="number"
            step="10"
            min="0"
            value={animDuration}
            onChange={e => update('animationDurationMs', parseInt(e.target.value, 10) || 0)}
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Controls ────────────────────────────────────────────────────────────
export default function BlenderControls({
  schema,
  onGenerate,
  isLoading,
  isAdmin,
  onSchemaUpdate,
  onAddToSlot,
  selectedSlot,
  lightingIntensity,
  onLightingIntensityChange,
}) {
  const [params, setParams] = useState({});

  // Initialize defaults
  useEffect(() => {
    if (schema?.inputs) {
      const initial = {};
      schema.inputs.forEach((input) => {
        if (input.default !== undefined) {
          initial[input.id] = input.default;
        } else if (input.type === 'color' || input.type === 'vector') {
          initial[input.id] = [1, 1, 1, 1];
        }
      });
      setParams(initial);

      if (typeof onGenerate === 'function') {
        onGenerate(initial);
      }
    }
  }, [schema]);

  const handleChange = (id, value) => setParams((prev) => ({ ...prev, [id]: value }));

  const handleColorChange = (id, hexValue) => {
    const r = parseInt(hexValue.slice(1, 3), 16) / 255;
    const g = parseInt(hexValue.slice(3, 5), 16) / 255;
    const b = parseInt(hexValue.slice(5, 7), 16) / 255;
    setParams((prev) => ({ ...prev, [id]: [r, g, b, 1] }));
  };

  const getHexFromRGBA = (rgbaArray) => {
    if (!rgbaArray || rgbaArray.length < 3) return '#ffffff';
    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgbaArray[0])}${toHex(rgbaArray[1])}${toHex(rgbaArray[2])}`;
  };

  const toggleGroupVisibility = (objectName, modifierName) => {
    if (!onSchemaUpdate) return;
    onSchemaUpdate(prevSchema => {
      const isHidden = prevSchema.inputs.find(i => i.object === objectName && i.modifier === modifierName)?.hidden;
      const newInputs = prevSchema.inputs.map(input => {
        if (input.object === objectName && input.modifier === modifierName) {
          return { ...input, hidden: !isHidden };
        }
        return input;
      });
      return { ...prevSchema, inputs: newInputs };
    });
  };

  if (!schema?.inputs) return <div style={{ color: '#aaa', padding: '20px' }}>No controls available</div>;

  // Group inputs by Object and Modifier
  const groups = {};
  schema.inputs.forEach(input => {
    if (!isAdmin && input.hidden) return;
    const key = `${input.object}::${input.modifier}`;
    if (!groups[key]) {
      groups[key] = { object: input.object, modifier: input.modifier, inputs: [] };
    }
    groups[key].inputs.push(input);
  });

  Object.values(groups).forEach(group => {
    group.hidden = group.inputs.length > 0 && group.inputs.every(i => i.hidden);
  });

  // The "Add to Slot" button is always available for non-admin users as long as
  // a schema exists. Visibility of individual inputs is independent of kit ordering.
  const hasSlotConfig = !isAdmin;
  const slotLabel = selectedSlot ? `Add to ${selectedSlot}` : 'Select a slot below first';

  const hasVisibleInputs = Object.keys(groups).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Geometry Controls</span>
        {isAdmin && <span style={{ fontSize: '12px', color: 'var(--brand-warning)', fontWeight: 'normal' }}>Admin Mode</span>}
      </h3>

      {/* Admin: Scene Setup */}
      {isAdmin && (
        <SceneSetupPanel schema={schema} onSchemaUpdate={onSchemaUpdate} />
      )}

      {/* Admin: Global Scale */}
      {isAdmin && (
        <div className="neu-surface" style={{ marginBottom: '15px', padding: '15px', border: '1px solid var(--brand-success)' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: 'var(--brand-success)' }}>Global Model Scale</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range"
              min={0.01}
              max={100.0}
              step={0.01}
              value={schema?.globalScale || 1.0}
              onChange={(e) => {
                if (onSchemaUpdate) onSchemaUpdate({ ...schema, globalScale: parseFloat(e.target.value) });
              }}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '40px' }}>{(schema?.globalScale || 1.0).toFixed(3)}x</span>
          </div>
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '5px' }}>This scaler adjusts the 3D viewer scale. Saved automatically.</p>
        </div>
      )}

      {/* Environment Controls */}
      <div className="neu-surface" style={{ marginBottom: '15px', padding: '15px' }}>
        <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Lighting Intensity</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0.1}
            max={5.0}
            step={0.1}
            value={lightingIntensity || 1.0}
            onChange={(e) => {
              if (onLightingIntensityChange) onLightingIntensityChange(parseFloat(e.target.value));
            }}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '40px' }}>{(lightingIntensity || 1.0).toFixed(1)}x</span>
        </div>
        {isAdmin && <p style={{ fontSize: '11px', color: '#aaa', marginTop: '5px' }}>Default value will be saved when you click "Update Model & Save Defaults".</p>}
      </div>

      {/* Geometry Input Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!hasVisibleInputs && !isAdmin && (
          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px dashed var(--glass-border-subtle)', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
            This product uses fixed parameters. Click &ldquo;Preview Drill&rdquo; to load the 3D model, then use the slot grid below to build your custom kit.
          </div>
        )}
        {Object.entries(groups).map(([key, group]) => {
          if (!isAdmin && group.inputs.length === 0) return null;

          return (
            <div key={key} className="neu-surface" style={{ padding: '15px', opacity: group.hidden && isAdmin ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid var(--brand-primary)', paddingBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--brand-primary)', fontWeight: '800', fontSize: '1.1rem' }}>{group.object} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>({group.modifier})</span></h4>
                {isAdmin && (
                  <button
                    onClick={() => toggleGroupVisibility(group.object, group.modifier)}
                    style={{ background: 'transparent', border: '1px solid var(--glass-border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    {group.hidden ? <><Eye size={12} /> Show</> : <><EyeOff size={12} /> Hide</>}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {group.inputs.map((input) => {
                  const type = controlMap[input.type] || 'text';
                  const unitKey = input.unit || 'none';
                  const unitInfo = UNIT_SCALERS[unitKey] || UNIT_SCALERS.none;
                  const scaler = unitInfo.scaler;
                  const suffix = unitInfo.suffix;

                  const effMin = input.overrideMin !== undefined ? input.overrideMin : (input.minimum !== undefined ? input.minimum : 0);
                  const effMax = input.overrideMax !== undefined ? input.overrideMax : (input.maximum !== undefined ? input.maximum : 100);
                  const defaultStep = (effMax !== undefined && effMin !== undefined) ? (effMax - effMin) / 100 : 0.1;
                  const effStep = input.overrideStep !== undefined ? input.overrideStep : defaultStep;

                  const val = params[input.id] !== undefined ? params[input.id] : '';
                  const displayVal = (typeof val === 'number') ? val * scaler : val;

                  const updateSchemaField = (field, value) => {
                    if (onSchemaUpdate) {
                      onSchemaUpdate(prevSchema => {
                        const newInputs = prevSchema.inputs.map(i => i.id === input.id ? { ...i, [field]: value } : i);
                        return { ...prevSchema, inputs: newInputs };
                      });
                    }
                  };

                  return (
                    <div key={input.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: isAdmin && input.hidden ? 'var(--glass-bg-subtle)' : 'transparent', padding: isAdmin && input.hidden ? '10px' : '0', borderRadius: '8px', border: isAdmin && input.hidden ? '1px dashed var(--glass-border-subtle)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {input.name}
                          {isAdmin && input.hidden && <span style={{ color: '#ff6b6b', marginLeft: '5px', fontSize: '12px' }}>(Hidden from client)</span>}
                        </label>
                        {isAdmin && (
                          <button
                            onClick={() => updateSchemaField('hidden', !input.hidden)}
                            style={{ background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            {input.hidden ? <><Eye size={10} /> Show</> : <><EyeOff size={10} /> Hide</>}
                          </button>
                        )}
                      </div>
                      {isAdmin && (type === 'range' || type === 'number') && (
                        <div style={{ display: 'grid', gridTemplateColumns: input.hidden ? '1fr 1fr' : '1fr 1fr 1fr', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', marginTop: '5px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label>Unit</label>
                            <select
                              value={unitKey}
                              onChange={(e) => {
                                const newUnitKey = e.target.value;
                                const newUnitInfo = UNIT_SCALERS[newUnitKey] || UNIT_SCALERS.none;
                                const newScaler = newUnitInfo.scaler;
                                const ratio = scaler / newScaler;
                                if (onSchemaUpdate) {
                                  onSchemaUpdate(prevSchema => {
                                    const newInputs = prevSchema.inputs.map(i => {
                                      if (i.id !== input.id) return i;
                                      const updated = { ...i, unit: newUnitKey };
                                      if (updated.overrideMin !== undefined) updated.overrideMin *= ratio;
                                      if (updated.overrideMax !== undefined) updated.overrideMax *= ratio;
                                      if (updated.overrideStep !== undefined) updated.overrideStep *= ratio;
                                      if (updated.default !== undefined) updated.default *= ratio;
                                      return updated;
                                    });
                                    return { ...prevSchema, inputs: newInputs };
                                  });
                                }
                                const currentVal = params[input.id];
                                if (currentVal !== undefined) handleChange(input.id, currentVal * ratio);
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--glass-border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', padding: '5.5px' }}
                            >
                              {Object.entries(UNIT_SCALERS).map(([k, info]) => (
                                <option key={k} value={k} style={{ background: '#333' }}>{info.label}</option>
                              ))}
                            </select>
                          </div>

                          {!input.hidden && (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label>Min (Native: {input.minimum ?? 'N/A'})</label>
                                <input type="number" step="any" value={input.overrideMin !== undefined ? Number((input.overrideMin * scaler).toFixed(5)) : ''} placeholder="Default" onChange={(e) => updateSchemaField('overrideMin', e.target.value === '' ? undefined : parseFloat(e.target.value) / scaler)} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--glass-border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label>Max (Native: {input.maximum ?? 'N/A'})</label>
                                <input type="number" step="any" value={input.overrideMax !== undefined ? Number((input.overrideMax * scaler).toFixed(5)) : ''} placeholder="Default" onChange={(e) => updateSchemaField('overrideMax', e.target.value === '' ? undefined : parseFloat(e.target.value) / scaler)} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--glass-border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label>Step</label>
                                <input type="number" step="any" value={input.overrideStep !== undefined ? Number((input.overrideStep * scaler).toFixed(5)) : ''} placeholder={`Default (${Number((defaultStep * scaler).toFixed(5))})`} onChange={(e) => updateSchemaField('overrideStep', e.target.value === '' ? undefined : parseFloat(e.target.value) / scaler)} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--glass-border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px' }} />
                              </div>
                            </>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label>{input.hidden ? 'Static Value' : 'Default'}</label>
                            <input
                              type="number"
                              step="any"
                              value={input.default !== undefined ? Number((input.default * scaler).toFixed(5)) : ''}
                              placeholder="N/A"
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : parseFloat(e.target.value) / scaler;
                                updateSchemaField('default', v);
                                if (v !== undefined) handleChange(input.id, v);
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--glass-border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px' }}
                            />
                          </div>
                        </div>
                      )}

                      {!isAdmin && type === 'range' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="range"
                            min={effMin * scaler}
                            max={effMax * scaler}
                            step={effStep * scaler}
                            value={displayVal}
                            onChange={(e) => handleChange(input.id, parseFloat(e.target.value) / scaler)}
                            style={{ flex: 1 }}
                          />
                          <span>{typeof displayVal === 'number' ? displayVal.toFixed(3) + suffix : displayVal}</span>
                        </div>
                      )}

                      {(!isAdmin || (isAdmin && !input.hidden)) && type === 'number' && (
                        <input
                          type="number"
                          min={input.overrideMin !== undefined ? effMin * scaler : (input.minimum !== undefined ? input.minimum * scaler : undefined)}
                          max={input.overrideMax !== undefined ? effMax * scaler : (input.maximum !== undefined ? input.maximum * scaler : undefined)}
                          step={scaler === 1 ? 1 : 'any'}
                          value={displayVal}
                          onChange={(e) => {
                            let parsed = parseFloat(e.target.value) / scaler;
                            if (input.type === 'integer') parsed = Math.round(parsed);
                            handleChange(input.id, parsed);
                          }}
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border-subtle)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                        />
                      )}

                      {(!isAdmin || (isAdmin && !input.hidden)) && type === 'checkbox' && (
                        <input type="checkbox" checked={!!val} onChange={(e) => handleChange(input.id, e.target.checked)} />
                      )}

                      {(!isAdmin || (isAdmin && !input.hidden)) && type === 'color' && (
                        <input
                          type="color"
                          value={getHexFromRGBA(val)}
                          onChange={(e) => handleColorChange(input.id, e.target.value)}
                          style={{ border: 'none', padding: 0, width: '40px', height: '40px', borderRadius: '4px', cursor: 'pointer' }}
                        />
                      )}

                      {(!isAdmin || (isAdmin && !input.hidden)) && type === 'text' && (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleChange(input.id, e.target.value)}
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border-subtle)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Preview / Save Defaults */}
        <button
          onClick={() => {
            if (isAdmin && onSchemaUpdate) {
              onSchemaUpdate(prevSchema => {
                const newInputs = prevSchema.inputs.map(input => ({
                  ...input,
                  default: params[input.id] !== undefined ? params[input.id] : input.default
                }));
                return { ...prevSchema, inputs: newInputs, defaultLightingIntensity: lightingIntensity };
              });
            }
            onGenerate(params);
          }}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '11px', display: 'flex', justifyContent: 'center' }}
        >
          {isLoading ? 'Generating...' : (isAdmin ? 'Update Model & Save Defaults' : 'Preview Drill')}
        </button>

        {/* Add to Slot — shown when slot kit is configured */}
        {hasSlotConfig && !isAdmin && (
          <button
            onClick={() => {
              if (selectedSlot && typeof onAddToSlot === 'function') {
                onAddToSlot(params);
              }
            }}
            disabled={!selectedSlot || isLoading}
            className={selectedSlot ? "btn btn-success" : "btn btn-secondary"}
            style={{ width: '100%', padding: '11px', display: 'flex', justifyContent: 'center' }}
          >
            <Package size={16} />
            {selectedSlot ? `Add to ${selectedSlot} →` : 'Select a slot below first'}
          </button>
        )}
      </div>
    </div>
  );
}
