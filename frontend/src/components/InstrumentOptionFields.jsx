export default function InstrumentOptionFields({ fields, values, onChange }) {
  return (
    <div className="product-config-grid">
      {fields.map(({ id, field_name: name, field_type: type, options }) => (
        <label key={id ?? name} className="product-config-field">
          <span>{name}</span>
          {type === 'dropdown' && options?.length ? (
            <select className="input-field" value={values[name] || ''} onChange={(e) => onChange(name, e.target.value)}>
              <option value="">Select {name}</option>
              {options.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : (
            <input
              className="input-field"
              type={type === 'number' ? 'number' : 'text'}
              value={values[name] || ''}
              onChange={(e) => onChange(name, e.target.value)}
              placeholder={`Enter ${name}`}
            />
          )}
        </label>
      ))}
    </div>
  );
}
