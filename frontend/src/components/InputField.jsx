import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './InputField.css';

function Tooltip({ text, anchorRef }) {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return createPortal(
        <div
            className="tooltip-portal-box"
            style={{
                top: rect.top - 8,
                left: rect.left + rect.width / 2
            }}
        >
            {text}
        </div>,
        document.body
    );
}

function InputField({
    label,
    name,
    value,
    onChange,
    unit,
    unitOptions,
    selectedUnit,
    onUnitChange,
    placeholder,
    min,
    max,
    step = 0.1,
    tooltip
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const iconRef = useRef(null);

    const handleEnter = useCallback(() => setShowTooltip(true), []);
    const handleLeave = useCallback(() => setShowTooltip(false), []);

    return (
        <div className="input-field">
            <label htmlFor={name}>
                {label}
                {tooltip && (
                    <span
                        className="tooltip-trigger"
                        ref={iconRef}
                        onMouseEnter={handleEnter}
                        onMouseLeave={handleLeave}
                    >
                        ⓘ
                    </span>
                )}
                {showTooltip && tooltip && (
                    <Tooltip text={tooltip} anchorRef={iconRef} />
                )}
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
