import type { ReactNode } from 'react';

interface CalloutBoxProps {
  children: ReactNode;
  variant?: 'lime' | 'neutral';
  title?: string;
}

export function CalloutBox({ children, variant = 'lime', title }: CalloutBoxProps) {
  const bg = variant === 'lime' ? 'bg-[#E9FFD0]' : 'bg-neutral-50';

  return (
    <div className={`${bg} border-2 border-black p-5`}>
      {title && (
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
