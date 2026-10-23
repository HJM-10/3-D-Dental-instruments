import React, { useEffect, useRef } from 'react';

const CustomCursor = () => {
  const glowRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        // Smooth interpolation for the cursor glow
        glowRef.current.animate({
          left: `${e.clientX}px`,
          top: `${e.clientY}px`
        }, { duration: 300, fill: "forwards" });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div className="cursor-glow" ref={glowRef}></div>;
};

export default CustomCursor;
