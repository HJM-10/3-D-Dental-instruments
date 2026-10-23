import React, { useState, useEffect } from 'react';
import api from '../services/api';

const UNIT_SCALERS = {
  none: { suffix: '' },
  m: { suffix: ' m' },
  cm: { suffix: ' cm' },
  mm: { suffix: ' mm' },
  in: { suffix: ' in' },
  ft: { suffix: ' ft' },
  rad: { suffix: ' rad' },
  deg: { suffix: '°' },
};

export default function OrderConfigurationDisplay({ configuration, productId }) {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (configuration.display_slots && Object.keys(configuration.display_slots).length > 0) {
      setLoading(false);
      return;
    }
    
    // We only need to fetch schema if we have raw slots
    if (!configuration.slots) {
      setLoading(false);
      return;
    }

    const fetchSchema = async () => {
      try {
        const res = await api.get(`/blender/models/${productId}/schema`);
        setSchema(res.data);
      } catch (err) {
        console.error("Failed to fetch schema", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchema();
  }, [productId, configuration]);

  if (loading) {
    return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading configuration...</div>;
  }

  // Helper to format param
  const formatValue = (raw, inputDef) => {
    const unitKey = inputDef?.unit || 'none';
    const suffix = UNIT_SCALERS[unitKey]?.suffix ?? '';
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
    return displayVal;
  };

  // Helper to group slots by identical configuration
  const renderGroupedSlots = (parsedSlotsMap) => {
    const grouped = {};
    Object.entries(parsedSlotsMap).forEach(([slot, entries]) => {
      if (!entries || entries.length === 0) return;
      const hash = JSON.stringify(entries);
      if (!grouped[hash]) {
        grouped[hash] = { slots: [], entries };
      }
      grouped[hash].slots.push(slot);
    });

    const groupedArray = Object.values(grouped);

    if (groupedArray.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {groupedArray.map((group, idx) => {
          // Format slot label nicely
          let slotLabel = '';
          if (group.slots.length === 1) {
            slotLabel = group.slots[0];
          } else if (group.slots.length <= 3) {
            slotLabel = group.slots.join(', ');
          } else {
            slotLabel = `${group.slots.length} slots (e.g. ${group.slots.slice(0, 3).join(', ')})`;
          }

          return (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
              <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '0.25rem' }}>
                {slotLabel}
              </div>
              {group.entries.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k}>
                    {k}:
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // If display_slots exists, just use it
  if (configuration.display_slots && Object.keys(configuration.display_slots).length > 0) {
    const parsedMap = {};
    for (const [slot, params] of Object.entries(configuration.display_slots)) {
      parsedMap[slot] = Object.entries(params);
    }
    return renderGroupedSlots(parsedMap);
  }

  // If we have slots and schema
  if (configuration.slots) {
    const parsedMap = {};
    for (const [slot, params] of Object.entries(configuration.slots)) {
      let filteredEntries = [];
      if (schema?.inputs) {
         const schemaInputs = schema.inputs.filter(i => !i.hidden);
         filteredEntries = schemaInputs.map(input => {
            const raw = params[input.id];
            if (raw === undefined || raw === null) return null;
            return [input.name, formatValue(raw, input)];
         }).filter(Boolean);
      } else {
         filteredEntries = Object.entries(params)
           .filter(([k]) => !k.includes('Smooth by Angle') && !k.includes('Boolean'))
           .map(([k, v]) => {
              const shortName = k.split('::').pop().replace('Socket_', 'Param ');
              return [shortName, typeof v === 'number' ? v.toFixed(3) : String(v)];
           });
      }
      parsedMap[slot] = filteredEntries;
    }
    return renderGroupedSlots(parsedMap);
  }

  // Total fallback
  return (
    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8, background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
      {JSON.stringify(configuration)}
    </div>
  );
}
