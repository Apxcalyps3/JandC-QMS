import React from "react";

export interface JNConnectLogoProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  variant?: "full" | "mark" | "compact";
  theme?: "dark" | "light" | "auto";
}

/**
 * JNConnect Emblem Image (calling /logo-mark.png)
 */
export function JNConnectEmblem({
  className = "h-8 w-auto object-contain",
  alt = "JNConnect Logo",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/logo-mark.png"
      alt={alt}
      className={`select-none ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}

/**
 * Primary JNConnect Logo Component
 * Loads crisp PNG assets directly instead of inline SVG code
 */
export function JNConnectLogo({
  className = "h-9 w-auto object-contain",
  variant = "mark",
  theme = "auto",
  alt = "JNConnect",
  ...props
}: JNConnectLogoProps) {
  if (variant === "full") {
    return (
      <img
        src="/logo.png"
        alt={alt || "JNConnect - A QMS for JandC Internet Cafe and Services"}
        className={`select-none ${className}`}
        loading="eager"
        decoding="async"
        {...props}
      />
    );
  }

  if (variant === "compact") {
    const isDark = theme === "dark";
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <img
          src="/logo-mark.png"
          alt={alt}
          className="h-full max-h-8 w-auto object-contain select-none flex-shrink-0"
          loading="eager"
          decoding="async"
        />
        <span
          className={`font-black text-xl tracking-tight leading-none ${
            isDark ? "text-white" : "text-slate-900 dark:text-white"
          }`}
        >
          JNConnect
        </span>
      </div>
    );
  }

  // Default: mark
  return (
    <img
      src="/logo-mark.png"
      alt={alt}
      className={`select-none ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}

export default JNConnectLogo;
