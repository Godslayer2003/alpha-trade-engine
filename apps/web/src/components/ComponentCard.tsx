import Link from 'next/link';

export type ComponentStatus = 'implemented' | 'new' | 'planned' | 'partial';

const STATUS_LABEL: Record<ComponentStatus, string> = {
  implemented: 'Implemented',
  new: 'New',
  planned: 'Planned',
  partial: 'Partial',
};

const STATUS_CLASS: Record<ComponentStatus, string> = {
  implemented: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  new: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
  planned: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  partial: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
};

interface ComponentCardProps {
  name: string;
  description: string;
  status: ComponentStatus;
  href?: string;
  note?: string;
}

export function ComponentCard({ name, description, status, href, note }: ComponentCardProps) {
  const body = (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-full flex flex-col gap-2 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</h3>
        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 flex-1">{description}</p>
      {note && <p className="text-[10px] text-slate-500 dark:text-slate-500 italic">{note}</p>}
      {href && <span className="text-xs text-emerald-600 dark:text-emerald-400 underline">Open →</span>}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
