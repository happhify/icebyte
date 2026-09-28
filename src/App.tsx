import { useState } from 'react'
import { About } from './components/About'
import { Bundles } from './components/Bundles'
import { ByteSquad } from './components/ByteSquad'
import { Faq } from './components/Faq'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { HowToOrder } from './components/HowToOrder'
import { Menu } from './components/Menu'
import { Navbar } from './components/Navbar'
import { PatchUpdate } from './components/PatchUpdate'
import { PreorderForm } from './components/PreorderForm'
import { Testimonials } from './components/Testimonials'
import { createLine, getItemName } from './lib/order'
import type { ItemKind, OrderLine } from './types'

export default function App() {
  const [lines, setLines] = useState<OrderLine[]>(() => [createLine()])
  const [notice, setNotice] = useState('')

  // Tombol "Tambah ke PO" di kartu menu/bundle: isi baris kosong atau tambah baris baru.
  const addItem = (kind: ItemKind, itemId: string) => {
    const empty = lines.find((l) => !l.itemId)
    const target: OrderLine = empty ? { ...empty, kind, itemId, options: {} } : createLine(kind, itemId)
    setLines(empty ? lines.map((l) => (l.key === empty.key ? target : l)) : [...lines, target])
    setNotice(`${getItemName(target)} ditambahkan ke form pre-order.`)

    requestAnimationFrame(() => {
      document.getElementById(target.key)?.scrollIntoView({ block: 'center' })
      document.getElementById(`${target.key}-item`)?.focus({ preventScroll: true })
    })
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-chocolate focus:px-4 focus:text-vanilla"
      >
        Lewati ke konten utama
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <About />
        <Menu onAdd={addItem} />
        <Bundles onAdd={addItem} />
        <HowToOrder />
        <PreorderForm lines={lines} onLinesChange={setLines} notice={notice} />
        <ByteSquad />
        <Testimonials />
        <PatchUpdate />
        <Faq />
      </main>
      <Footer />
    </>
  )
}
