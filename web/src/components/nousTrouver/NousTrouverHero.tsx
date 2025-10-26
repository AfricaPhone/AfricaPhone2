export function NousTrouverHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">{eyebrow}</p>
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
      <p className="max-w-3xl text-base text-slate-600">{description}</p>
    </section>
  );
}
