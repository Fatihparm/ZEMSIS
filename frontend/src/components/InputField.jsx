import './InputField.css';

function InputField({
    label,
    name,
    value,
    onChange,
    unit,
    unitOptions,  // ['kPa', 'MPa'] for toggle
    selectedUnit, // current selected unit
    onUnitChange, // callback for unit change
    placeholder,
    min,
    max,
    step = 0.1,
    tooltip
}) {
    return (
        <div className="input-field">
            <label htmlFor={name}>
                {label}
                {tooltip && <span className="tooltip" title={tooltip}>ⓘ</span>}
            </label>
            <div className="input-wrapper">
                <input
                    type="number"
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    step={step}
                />
                {unitOptions ? (
                    <div className="unit-toggle">
                        {unitOptions.map(u => (
                            <button
                                key={u}
                                type="button"
                                className={`unit-btn ${selectedUnit === u ? 'active' : ''}`}
                                onClick={() => onUnitChange && onUnitChange(name, u)}
                            >
                                {u}
                            </button>
                        ))}
                    </div>
                ) : (
                    unit && <span className="unit">{unit}</span>
                )}
            </div>
        </div>
    );
}

export default InputField;

