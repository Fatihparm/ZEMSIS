import { useIsMobile } from "../hooks/useIsMobile";
import "./MobileWarning.css";

const SOIL_COLOR_MAP = {
    kum:   "#d4b87a",
    kil:   "#a98467",
    silt:  "#b8b89a",
    kaya:  "#8a8a8a",
    cakil: "#c4a96a",
};

const SOIL_NAMES = {
    en: { kum: "Sand", kil: "Clay", silt: "Silt", kaya: "Rock",  cakil: "Gravel" },
    tr: { kum: "Kum",  kil: "Kil",  silt: "Silt", kaya: "Kaya",  cakil: "Çakıl"  },
};

function MobileWarning({ lang, type = "generic", summaryData = {}, children, breakpoint = 768 }) {
    const isMobile = useIsMobile(breakpoint);
    const tr = lang === "tr";

    if (!isMobile) return <>{children}</>;

    const title = tr ? "Masaüstü / Tablet Gerekli" : "Desktop / Tablet Required";
    const desc  = tr
        ? "Bu bileşen dokunmatik ekranda tam olarak çalışmaz. Lütfen tablet (yatay) veya masaüstü kullanın."
        : "This component requires a larger screen for full functionality. Please use a tablet (landscape) or desktop.";

    return (
        <div className="mobile-warning">
            <div className="mobile-warning__icon">🖥️</div>
            <p className="mobile-warning__title">{title}</p>
            <p className="mobile-warning__desc">{desc}</p>
            <span className="mobile-warning__badge">
                📐 {tr ? "Tablet veya masaüstü önerilir" : "Tablet or desktop recommended"}
            </span>

            {type === "planView" && (
                <div className="mobile-warning__summary">
                    <div className="mobile-warning__summary-title">
                        {tr ? "Plan Özeti" : "Plan Summary"}
                    </div>
                    <div className="mobile-summary-cards">
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">🔴 {tr ? "Kolon" : "Columns"}</span>
                            <span className="mobile-summary-card__value">{summaryData.totalColumns ?? "—"}</span>
                        </div>
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">📐 {tr ? "Alan" : "Area"}</span>
                            <span className="mobile-summary-card__value">
                                {summaryData.area != null ? summaryData.area.toFixed(1) : "—"}
                            </span>
                            <span className="mobile-summary-card__unit">m²</span>
                        </div>
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">📏 {tr ? "Çevre" : "Perimeter"}</span>
                            <span className="mobile-summary-card__value">
                                {summaryData.perimeter != null ? summaryData.perimeter.toFixed(1) : "—"}
                            </span>
                            <span className="mobile-summary-card__unit">m</span>
                        </div>
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">📊 Ar</span>
                            <span className="mobile-summary-card__value">
                                {summaryData.ar != null ? summaryData.ar.toFixed(1) : "—"}
                            </span>
                            <span className="mobile-summary-card__unit">%</span>
                        </div>
                    </div>
                </div>
            )}

            {type === "soilSection" && Array.isArray(summaryData.layers) && summaryData.layers.length > 0 && (
                <div className="mobile-warning__summary">
                    <div className="mobile-warning__summary-title">
                        {tr ? "Zemin Profili" : "Soil Profile"}
                    </div>
                    <div className="mobile-layer-list">
                        {summaryData.layers.map((layer, i) => {
                            const start = summaryData.layers
                                .slice(0, i)
                                .reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0);
                            const end   = start + (parseFloat(layer.thickness) || 0);
                            const name  = SOIL_NAMES[lang]?.[layer.soilType] || layer.soilType;
                            const color = SOIL_COLOR_MAP[layer.soilType] || "#888";
                            return (
                                <div key={layer.id} className="mobile-layer-item">
                                    <div className="mobile-layer-item__dot" style={{ background: color }} />
                                    <span className="mobile-layer-item__name">{name}</span>
                                    <span className="mobile-layer-item__depth">
                                        {start.toFixed(1)}-{end.toFixed(1)} m
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {type === "crossSection" && (
                <div className="mobile-warning__summary">
                    <div className="mobile-warning__summary-title">
                        {tr ? "Kesit Parametreleri" : "Section Parameters"}
                    </div>
                    <div className="mobile-summary-cards">
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">D {tr ? "Çap" : "Diam."}</span>
                            <span className="mobile-summary-card__value">{summaryData.D ?? "—"}</span>
                            <span className="mobile-summary-card__unit">m</span>
                        </div>
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">s {tr ? "Aralık" : "Spacing"}</span>
                            <span className="mobile-summary-card__value">{summaryData.s ?? "—"}</span>
                            <span className="mobile-summary-card__unit">m</span>
                        </div>
                        <div className="mobile-summary-card">
                            <span className="mobile-summary-card__label">H {tr ? "Uzunluk" : "Length"}</span>
                            <span className="mobile-summary-card__value">{summaryData.H ?? "—"}</span>
                            <span className="mobile-summary-card__unit">m</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MobileWarning;