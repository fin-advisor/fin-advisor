import React from "react";

export function GeminiStarIcon({ className }: { className?: string }) {
  // We use a unique ID for the gradient to prevent conflicts if
  // this icon is rendered multiple times on the same page.
  const gradientId = "gemini-star-gradient-vibrant";

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id={gradientId}
          /* Gradient Geometry:
             The gradient flows diagonally from Bottom-Left (0,24) to Top-Right (24,0).
          */
          x1="0"
          y1="24"
          x2="24"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          {/* Highly Saturated Blue at the bottom-left */}
          <stop offset="0" stopColor="#185BFF" />
          
          {/* Vibrant mid-point transition */}
          <stop offset="0.5" stopColor="#6381FF" />
          
          {/* Highly Saturated Purple at the top-right tip */}
          <stop offset="1" stopColor="#A96DFF" />
        </linearGradient>
      </defs>
      
      {/* Shape Geometry:
         The path creates the characteristic "fat", curved four-pointed star shape.
      */}
      <path
        d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}