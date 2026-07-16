import { useState, useEffect } from "react";

/**
 * Returns true when the viewport width is below `breakpoint` pixels.
 * Updates reactively on window resize.
 */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);

    return isMobile;
}

/**
 * Returns true when the viewport width is below `breakpoint` pixels (default 1024 = tablet).
 */
export function useIsTablet(breakpoint = 1024) {
    const [isTablet, setIsTablet] = useState(() => window.innerWidth < breakpoint);

    useEffect(() => {
        const check = () => setIsTablet(window.innerWidth < breakpoint);
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);

    return isTablet;
}

export default useIsMobile;
