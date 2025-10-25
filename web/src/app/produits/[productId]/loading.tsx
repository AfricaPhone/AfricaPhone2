export default function Loading() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 h-4 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="grid gap-10 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="aspect-[4/5] w-full animate-pulse rounded-3xl bg-slate-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
            <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="h-6 w-3/4 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            <div className="h-10 w-32 animate-pulse rounded-full bg-slate-200" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-3 animate-pulse rounded-full bg-slate-100" />
              ))}
            </div>
            <div className="h-12 animate-pulse rounded-full bg-slate-200" />
            <div className="h-12 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
