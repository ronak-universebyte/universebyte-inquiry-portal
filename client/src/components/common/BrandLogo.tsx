import React from "react";

interface BrandLogoProps {
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  size = "md",
  showTagline = true,
  className = "",
}) => {
  const sizeClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
  };

  if (variant === "icon") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src="/logo-icon.svg"
          alt="UniverseByte Logo"
          className={`${sizeClasses[size]} w-auto object-contain drop-shadow-sm`}
          onError={(e) => {
            // Fallback to favicon if svg is unavailable
            (e.target as HTMLImageElement).src = "/favicon-32x32.png";
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <img
            src="/universebyte-logo.png"
            alt="UniverseByte – Technology Redefined."
            className={`${sizeClasses[size]} w-auto max-w-[210px] object-contain drop-shadow-sm`}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/images/universebyte-logo-clean.png";
            }}
          />
        </div>
        {showTagline && (
          <p className="text-[10px] font-semibold tracking-wider text-[#7138F5] uppercase mt-0.5 ml-1">
            {/* Technology Redefined. */}
          </p>
        )}
      </div>
    </div>
  );
};
