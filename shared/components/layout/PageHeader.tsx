import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-2 border-b border-neutral-100 pb-4 shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight leading-none">{title}</h1>
        {description && (
          <p className="text-sm text-neutral-400 font-medium mt-2 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
