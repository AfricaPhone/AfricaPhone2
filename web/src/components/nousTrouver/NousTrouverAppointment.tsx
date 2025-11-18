export function NousTrouverAppointment() {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-6 sm:px-8">
      <h2 className="text-xl font-semibold text-slate-900">Planifier un rendez-vous</h2>
      <p className="text-sm text-slate-600">
        Vous souhaitez un diagnostic, une reprise ou une configuration personnalisee ? Renseignez vos informations
        et un conseiller vous rappellera pour fixer un rendez-vous a l heure qui vous arrange.
      </p>
      <form className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Nom complet
          <input
            type="text"
            placeholder="Votre nom"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Contact WhatsApp
          <input
            type="tel"
            placeholder="+229 XX XX XX XX"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2">
          Sujet de la demande
          <textarea
            rows={3}
            placeholder="Exemple : Configuration iPhone, reprise smartphone, conseil achat"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
          >
            Envoyer la demande
          </button>
        </div>
      </form>
      <p className="text-xs text-slate-500">
        En soumettant ce formulaire vous acceptez d etre recontacte par un conseiller AfricaPhone pour finaliser votre
        demande.
      </p>
    </section>
  );
}
