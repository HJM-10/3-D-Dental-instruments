import React, { useMemo } from 'react';
import { ShoppingCart, X, Plus, Package, ChevronRight } from 'lucide-react';

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

// Build the list of slot names based on schema config, e.g. ['Slot.001', ..., 'Slot.030']
function buildSlotNames(prefix = 'Slot.', count = 30) {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(3, '0');
    return `${prefix}${num}`;
  });
}

// Format a param value for display using visible inputs from the schema
function formatParamSummary(params, schema) {
  if (!schema?.inputs || !params) return [];
  return schema.inputs
    .filter((input) => !input.hidden)
    .map((input) => {
      const raw = params[input.id];
      if (raw === undefined || raw === null) return null;
      const unitKey = input.unit || 'none';
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
      } else if (Array.isArray(raw) && raw.length === 4) {
        // RGBA color
        const hex = raw.slice(0, 3).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
        displayVal = `#${hex}`;
      } else if (typeof raw === 'boolean') {
        displayVal = raw ? 'Yes' : 'No';
      } else {
        displayVal = String(raw);
      }
      return { label: input.name, value: displayVal, isColor: Array.isArray(raw) && raw.length === 4, colorHex: Array.isArray(raw) ? `#${raw.slice(0,3).map(c=>Math.round(c*255).toString(16).padStart(2,'0')).join('')}` : null };
    })
    .filter(Boolean);
}

// ─── Single Slot Card ─────────────────────────────────────────────────────────
function SlotCard({ slotName, slotNumber, params, schema, isSelected, onSelect, onRemove }) {
  const summary = useMemo(() => formatParamSummary(params, schema), [params, schema]);
  const isFilled = !!params;

  if (isFilled) {
    return (
      <div style={{
        position: 'relative',
        padding: '12px',
        borderRadius: '10px',
        border: '1.5px solid var(--brand-success)',
        background: 'var(--glow-success)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minHeight: '90px',
        transition: 'border-color 0.2s',
      }}>
        {/* Slot label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand-success)', letterSpacing: '0.05em' }}>
            {slotName}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(slotName); }}
            style={{
              background: 'var(--glow-danger)',
              border: '1px solid var(--brand-danger)',
              color: 'var(--brand-danger)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <X size={11} />
          </button>
        </div>

        {/* Param summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
          {summary.slice(0, 3).map((item, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '10px', lineHeight: '1.2' }}>
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {item.label}
              </span>
              {item.isColor ? (
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', background: item.colorHex, border: '1px solid var(--border-color)', marginTop: '2px' }} />
              ) : (
                <span style={{ color: 'var(--text-primary)', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', marginTop: '1px' }}>
                  {item.value}
                </span>
              )}
            </div>
          ))}
          {summary.length > 3 && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>+{summary.length - 3} more</span>
          )}
        </div>
      </div>
    );
  }

  // Empty slot
  return (
    <button
      onClick={() => onSelect(slotName)}
      style={{
        padding: '12px',
        borderRadius: '10px',
        border: isSelected
          ? '1.5px solid var(--brand-primary)'
          : '1.5px dashed var(--border-color)',
        background: isSelected
          ? 'var(--glow-primary)'
          : 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        cursor: 'pointer',
        minHeight: '90px',
        width: '100%',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        background: isSelected ? 'var(--brand-primary)' : 'var(--bg-deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
      }}>
        <Plus size={13} color={isSelected ? '#fff' : 'var(--text-muted)'} />
      </div>
      <span style={{ fontSize: '10px', color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)', letterSpacing: '0.04em', fontWeight: '600' }}>
        {slotName.split('.')[1] ? `#${slotName.split('.')[1]}` : slotName}
      </span>
      {isSelected && (
        <span style={{ fontSize: '9px', color: 'var(--brand-primary)' }}>← active</span>
      )}
    </button>
  );
}

// ─── Order Summary Row ────────────────────────────────────────────────────────
function OrderSummaryRow({ slotName, params, schema, onRemove }) {
  const summary = useMemo(() => formatParamSummary(params, schema), [params, schema]);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'var(--glow-success)',
        border: '1px solid var(--brand-success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Package size={14} color="var(--brand-success)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{slotName}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {summary.map((item, i) => (
            <span key={i} style={{
              fontSize: '11px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 6px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
              {item.isColor
                ? <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: item.colorHex }} />
                : <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{item.value}</span>
              }
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => onRemove(slotName)}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SlotOrderPanel({
  schema,
  slots = {},
  selectedSlot,
  onSelectSlot,
  onRemoveSlot,
  onProceedToOrder,
  isAdding = false,
}) {
  const slotPrefix = schema?.slotPrefix || 'Slot.';
  const slotCount = schema?.slotCount ?? 30;
  const slotNames = useMemo(() => buildSlotNames(slotPrefix, slotCount), [slotPrefix, slotCount]);

  const filledCount = Object.keys(slots).length;
  const canOrder = filledCount > 0;

  return (
    <div className="card" style={{
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-surface)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Kit Configuration
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Click an empty slot to select it, then click &ldquo;Add to Slot&rdquo; in the panel above.
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: filledCount > 0 ? 'var(--glow-success)' : 'var(--bg-deep)',
          border: `1px solid ${filledCount > 0 ? 'var(--brand-success)' : 'var(--border-color)'}`,
          borderRadius: '8px',
          padding: '8px 14px',
        }}>
          <Package size={16} color={filledCount > 0 ? 'var(--brand-success)' : 'var(--text-muted)'} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: filledCount > 0 ? 'var(--brand-success)' : 'var(--text-muted)' }}>
            {filledCount} / {slotCount}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>drills</span>
        </div>
      </div>

      {/* Slot Grid */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px',
        }}>
          {slotNames.map((slotName) => (
            <SlotCard
              key={slotName}
              slotName={slotName}
              params={slots[slotName] || null}
              schema={schema}
              isSelected={selectedSlot === slotName}
              onSelect={onSelectSlot}
              onRemove={onRemoveSlot}
            />
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {filledCount > 0 && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          padding: '20px 24px',
        }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Order Summary
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {filledCount} drill{filledCount !== 1 ? 's' : ''} configured — this kit will be added as a single product.
          </p>

          {/* Slot rows */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
            {Object.entries(slots).map(([slotName, params]) => (
              <OrderSummaryRow
                key={slotName}
                slotName={slotName}
                params={params}
                schema={schema}
                onRemove={onRemoveSlot}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onProceedToOrder}
            disabled={!canOrder || isAdding}
            style={{
              width: '100%',
              padding: '14px',
              background: canOrder
                ? 'var(--brand-primary)'
                : 'var(--bg-deep)',
              color: canOrder ? 'var(--text-inverse)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '10px',
              cursor: canOrder && !isAdding ? 'pointer' : 'not-allowed',
              fontWeight: '700',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: isAdding ? 0.7 : 1,
              transition: 'all 0.2s ease',
              boxShadow: canOrder ? '0 4px 20px var(--glow-primary)' : 'none',
            }}
          >
            <ShoppingCart size={18} />
            {isAdding ? 'Adding to cart...' : `Add Kit to Cart (${filledCount} drill${filledCount !== 1 ? 's' : ''})`}
            {!isAdding && <ChevronRight size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
