import logo from '../assets/logo.webp'
import { site } from '../config/site'
import { instagramHandle, instagramUrl } from '../lib/links'
import { normalizePhone } from '../lib/order'
import { IconChat, IconInstagram, IconMapPin } from './Icons'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { brand, campus, contact } = site
  const socials = [
    { href: instagramUrl, label: `Instagram ${instagramHandle}`, text: instagramHandle, Icon: IconInstagram },
    {
      href: `https://wa.me/${normalizePhone(contact.whatsapp)}`,
      label: `WhatsApp ${contact.whatsapp}`,
      text: 'WhatsApp admin',
      Icon: IconChat,
    },
  ]

  return (
    <footer className="on-dark border-t-2 border-chocolate bg-chocolate px-4 pb-10 pt-14 text-vanilla">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <img src={logo} alt={brand.name} width={720} height={669} className="h-32 w-auto rounded-card bg-cream p-3" />
          <p className="mt-4 font-display text-lg text-caramel">{brand.slogan}</p>
          <p className="mt-3 max-w-xs text-sm text-vanilla/80">{brand.tagline}</p>
        </div>

        <div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-caramel">Lokasi</h2>
          <p className="mt-3 flex items-start gap-2">
            <IconMapPin className="mt-1 size-4 shrink-0" />
            <span>{campus.name}</span>
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-caramel">Sosial media</h2>
          <ul className="mt-2">
            {socials.map(({ href, label, text, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex min-h-11 items-center gap-2 wrap-anywhere hover:text-caramel"
                >
                  <Icon className="size-5 shrink-0" />
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-vanilla/20 pt-6 font-mono text-xs text-vanilla/70 sm:flex-row sm:justify-between">
        <p>
          © {brand.name} {YEAR}
        </p>
        <p>
          {brand.version} · dibuat dengan es krim &amp; kode
        </p>
      </div>
    </footer>
  )
}
