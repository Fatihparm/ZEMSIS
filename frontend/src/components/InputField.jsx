import './InputField.css';

function InputField({
    label,
    name,
    value,
    onChange,
    unit,
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
                {unit && <span className="unit">{unit}</span>}
            </div>
        </div>
    );
}

export default InputField;
