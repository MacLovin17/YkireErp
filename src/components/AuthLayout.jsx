import React from "react";
import YkireBrand from '@/components/YkireBrand';

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <YkireBrand eager className="w-full max-w-[335px] h-auto" />
          {title && <h1 className="text-xl font-bold tracking-tight text-foreground mt-4">{title}</h1>}
          {subtitle && <p className="text-muted-foreground mt-3 text-sm">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
