import { site } from '../config/site'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const STEPS = [
  {
    title: 'Pilih menu',
    body: 'Cek menu & bundle di atas, lalu tentukan tekstur favoritmu: crunchy, sandwich, atau crispy.',
    bg: 'bg-caramel/50',
  },
  {
    title: 'Isi form PO',
    body: 'Isi form pre-order paling lambat H-1 sebelum tanggal ambil, lalu tekan “Kirim ke WhatsApp”.',
    bg: 'bg-sky',
  },
  {
    title: 'Konfirmasi & bayar',
    body: `Admin mengonfirmasi pesananmu di WhatsApp. Bayar pakai ${site.payment.methods.join(' atau ')}, lalu tinggal ambil!`,
    bg: 'bg-coral-light',
  },
]

export function HowToOrder() {
  return (
    <section id="cara-pesan" aria-labelledby="cara-pesan-title" className="border-y-2 border-chocolate bg-white px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            id="cara-pesan-title"
            eyebrow="04 · cara pesan"
            title="Tiga langkah, langsung deploy ke tanganmu"
          />
        </Reveal>

        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 100} className="card h-full p-6">
                <span
                  aria-hidden="true"
                  className={`mb-4 flex size-12 items-center justify-center rounded-field border-2 border-chocolate font-mono text-lg font-bold ${step.bg}`}
                >
                  0{index + 1}
                </span>
                <h3 className="text-xl font-semibold">
                  <span className="sr-only">Langkah {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-cocoa">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <a href="#pesan" className="btn btn-primary">
            Isi form pre-order
          </a>
        </div>
      </div>
    </section>
  )
}
