import type { LaunchService } from '@/lib/launch-readiness';

const labels = { closed: 'Activation switch off', incomplete: 'Setup incomplete', configured: 'Configuration present · real-world verification pending' };
export function LaunchConfiguration({ services }: { services: LaunchService[] }) {
  return <div className="divide-y">
    {services.map(service => <section key={service.id} className="py-6">
      <h3 className="font-heading text-2xl">{service.name}</h3>
      <p className="font-semibold mt-2">{labels[service.state]}</p>
      <p className="text-muted-foreground mt-2 max-w-2xl">{service.verify}</p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm underline underline-offset-4">
          Configuration checklist · {service.requirements.filter(item => !item.met).length} outstanding
        </summary>
        <ul className="mt-3 space-y-2 text-sm">
          {service.requirements.map(item => <li key={item.label} className="break-words">
            <span className={item.met ? 'text-muted-foreground' : 'font-semibold'}>{item.met ? 'Present' : 'Needed'}: {item.label}</span>
          </li>)}
        </ul>
      </details>
    </section>)}
  </div>;
}
