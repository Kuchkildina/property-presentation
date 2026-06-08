'use client'
import { useState, useRef } from 'react'
import styles from './page.module.css'

const TABS = [
  { id: 'manual', label: 'A — Manual input' },
  { id: 'upload', label: 'B — Upload files' },
  { id: 'url', label: 'C — Developer site' },
]

const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'both', label: 'EN + RU' },
]

export default function Home() {
  const [tab, setTab] = useState('manual')
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [slides, setSlides] = useState([])
  const brochureRef = useRef(null)
  const priceRef = useRef(null)
  const [brochureName, setBrochureName] = useState('')
  const [priceName, setPriceName] = useState('')

  // Manual fields
  const [manual, setManual] = useState({
    name: '', address: '', developer: '', architect: '',
    type: '', price: '', area: '', floor: '', completion: '',
    lease: '', amenities: '', service: '', location: '', client: ''
  })

  // Upload fields
  const [upload, setUpload] = useState({ unit: '', client: '', notes: '' })

  // URL fields
  const [urlData, setUrlData] = useState({ url: '', name: '', unit: '', client: '', notes: '' })

  function setM(key, val) { setManual(p => ({ ...p, [key]: val })) }
  function setU(key, val) { setUpload(p => ({ ...p, [key]: val })) }
  function setUd(key, val) { setUrlData(p => ({ ...p, [key]: val })) }

  async function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result.split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  async function generate() {
    setLoading(true)
    setStatus('Generating your presentation…')
    setSlides([])

    try {
      let body = { mode: tab, lang }

      if (tab === 'manual') {
        body.data = manual
      } else if (tab === 'upload') {
        body.data = upload
        if (brochureRef.current?.files[0]) {
          body.brochureBase64 = await toBase64(brochureRef.current.files[0])
        }
        if (priceRef.current?.files[0]) {
          body.priceBase64 = await toBase64(priceRef.current.files[0])
        }
      } else {
        body.url = urlData.url
        body.data = urlData
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSlides(json.slides)
      setStatus('')
    } catch (e) {
      setStatus('Error: ' + e.message)
    }
    setLoading(false)
  }

  function downloadHTML() {
    if (!slides.length) return
    const title = slides[0]?.headline || 'Property Presentation'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Jost',sans-serif;background:#fff;color:#1a1a1a}
  .slide{width:100%;min-height:100vh;padding:5rem 6rem;display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid #e0dbd3;page-break-after:always}
  .slide:last-child{border-bottom:none;page-break-after:auto}
  .slide-num{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;margin-bottom:2rem}
  h2{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:300;letter-spacing:0.06em;margin-bottom:1.25rem;color:#1a1a1a;line-height:1.2}
  p{font-size:15px;line-height:1.85;color:#555;max-width:620px;white-space:pre-line}
  .kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.25rem;margin-top:2.5rem}
  .kv-item{padding:1.25rem 1.5rem;background:#f8f6f2;border-top:2px solid #B5935A}
  .kv-item .k{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#aaa;margin-bottom:6px}
  .kv-item .v{font-size:17px;font-weight:500;color:#1a1a1a}
  .cover{background:#1a1a1a;color:#fff}
  .cover h2{color:#fff;font-size:56px}
  .cover p{color:#888}
  .cover .slide-num{color:#444}
  .cover .kv-item{background:#2a2a2a;border-top-color:#B5935A}
  .cover .kv-item .k{color:#666}
  .cover .kv-item .v{color:#fff}
  @media print{
    .slide{page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
${slides.map((s, i) => `
<div class="slide${i === 0 ? ' cover' : ''}">
  <div class="slide-num">${String(s.slideNum).padStart(2, '0')} · ${s.tag.toUpperCase()}</div>
  <h2>${s.headline}</h2>
  ${s.body ? `<p>${s.body}</p>` : ''}
  ${s.kvPairs?.length ? `
  <div class="kv">
    ${s.kvPairs.map(kv => `<div class="kv-item"><div class="k">${kv.k}</div><div class="v">${kv.v}</div></div>`).join('')}
  </div>` : ''}
</div>`).join('\n')}
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = title.replace(/\s+/g, '-').toLowerCase() + '-presentation.html'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        <header className={styles.header}>
          <h1>Property Presentation</h1>
          <p>Generate a client presentation in minutes</p>
        </header>

        {/* Tabs */}
        <div className={styles.tabRow}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* Panel A — Manual */}
        {tab === 'manual' && (
          <div className={styles.panel}>
            <Field label="Development name">
              <input placeholder="e.g. The Broadley" value={manual.name} onChange={e => setM('name', e.target.value)} />
            </Field>
            <Field label="Address">
              <input placeholder="382-386 Edgware Road, London NW8 8DL" value={manual.address} onChange={e => setM('address', e.target.value)} />
            </Field>
            <div className={styles.row2}>
              <Field label="Developer">
                <input placeholder="Mount Anvil" value={manual.developer} onChange={e => setM('developer', e.target.value)} />
              </Field>
              <Field label="Architect">
                <input placeholder="Stiff + Trevillion" value={manual.architect} onChange={e => setM('architect', e.target.value)} />
              </Field>
            </div>
            <div className={styles.row3}>
              <Field label="Apartment type">
                <input placeholder="2-bedroom" value={manual.type} onChange={e => setM('type', e.target.value)} />
              </Field>
              <Field label="Price">
                <input placeholder="£1,326,500" value={manual.price} onChange={e => setM('price', e.target.value)} />
              </Field>
              <Field label="Area">
                <input placeholder="1,062 sq ft" value={manual.area} onChange={e => setM('area', e.target.value)} />
              </Field>
            </div>
            <div className={styles.row3}>
              <Field label="Floor">
                <input placeholder="10" value={manual.floor} onChange={e => setM('floor', e.target.value)} />
              </Field>
              <Field label="Completion">
                <input placeholder="Q3 2030" value={manual.completion} onChange={e => setM('completion', e.target.value)} />
              </Field>
              <Field label="Lease">
                <input placeholder="990 years" value={manual.lease} onChange={e => setM('lease', e.target.value)} />
              </Field>
            </div>
            <Field label="Amenities (comma separated)">
              <input placeholder="24h concierge, Peloton gym, cinema, residents lounge, podium garden" value={manual.amenities} onChange={e => setM('amenities', e.target.value)} />
            </Field>
            <Field label="Service charge">
              <input placeholder="£6.82 per sq ft" value={manual.service} onChange={e => setM('service', e.target.value)} />
            </Field>
            <Field label="Location highlights">
              <textarea placeholder="Near Regent's Park, Hyde Park. Edgware Road tube 3 min, Marylebone 12 min…" value={manual.location} onChange={e => setM('location', e.target.value)} />
            </Field>
            <Field label="Client name (optional)">
              <input placeholder="e.g. Andrei Petrov" value={manual.client} onChange={e => setM('client', e.target.value)} />
            </Field>
          </div>
        )}

        {/* Panel B — Upload */}
        {tab === 'upload' && (
          <div className={styles.panel}>
            <div className={styles.infoNote}>
              Upload the developer's brochure (PDF) and price list, then specify which apartment to present.
            </div>
            <Field label="Brochure PDF">
              <label className={styles.uploadZone}>
                <span className={styles.uploadIcon}>↑</span>
                <span>{brochureName || 'Drop brochure PDF here or click to browse'}</span>
                <input type="file" accept=".pdf" ref={brochureRef}
                  onChange={e => setBrochureName(e.target.files[0]?.name || '')}
                  style={{ display: 'none' }} />
              </label>
            </Field>
            <Field label="Price list (PDF or image)">
              <label className={styles.uploadZone}>
                <span className={styles.uploadIcon}>↑</span>
                <span>{priceName || 'Drop price list here or click to browse'}</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" ref={priceRef}
                  onChange={e => setPriceName(e.target.files[0]?.name || '')}
                  style={{ display: 'none' }} />
              </label>
            </Field>
            <div className={styles.row2}>
              <Field label="Apartment / unit">
                <input placeholder="e.g. Apt 105, Block Eliot" value={upload.unit} onChange={e => setU('unit', e.target.value)} />
              </Field>
              <Field label="Client name (optional)">
                <input placeholder="e.g. Andrei Petrov" value={upload.client} onChange={e => setU('client', e.target.value)} />
              </Field>
            </div>
            <Field label="Additional notes">
              <textarea placeholder="Investment angle, family use, rental yield…" value={upload.notes} onChange={e => setU('notes', e.target.value)} />
            </Field>
          </div>
        )}

        {/* Panel C — URL */}
        {tab === 'url' && (
          <div className={styles.panel}>
            <div className={styles.infoNote}>
              Claude will read the developer's website and extract property information automatically.
            </div>
            <Field label="Developer / project URL">
              <input placeholder="https://thebroadley.co.uk" value={urlData.url} onChange={e => setUd('url', e.target.value)} />
            </Field>
            <Field label="Development name (if known)">
              <input placeholder="The Broadley" value={urlData.name} onChange={e => setUd('name', e.target.value)} />
            </Field>
            <div className={styles.row2}>
              <Field label="Apartment type or unit">
                <input placeholder="e.g. 2-bedroom, floor 10" value={urlData.unit} onChange={e => setUd('unit', e.target.value)} />
              </Field>
              <Field label="Client name (optional)">
                <input placeholder="e.g. Andrei Petrov" value={urlData.client} onChange={e => setUd('client', e.target.value)} />
              </Field>
            </div>
            <Field label="Focus / angle">
              <textarea placeholder="Investment, primary residence, buy-to-let, specific client priorities…" value={urlData.notes} onChange={e => setUd('notes', e.target.value)} />
            </Field>
          </div>
        )}

        <div className={styles.divider} />

        {/* Language selector */}
        <div className={styles.langSection}>
          <div className={styles.langLabel}>Presentation language</div>
          <div className={styles.langRow}>
            {LANGS.map(l => (
              <button
                key={l.id}
                className={`${styles.langBtn} ${lang === l.id ? styles.langActive : ''}`}
                onClick={() => setLang(l.id)}
              >{l.label}</button>
            ))}
          </div>
        </div>

        <button
          className={styles.generateBtn}
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate presentation'}
        </button>

        {status && <p className={styles.status}>{status}</p>}

        {/* Preview */}
        {slides.length > 0 && (
          <div className={styles.previewWrap}>
            <div className={styles.previewHeader}>
              <span>Preview — {slides.length} slides</span>
              <button className={styles.downloadBtn} onClick={downloadHTML}>
                ↓ Download for print
              </button>
            </div>
            <div className={styles.slidesContainer}>
              {slides.map((s, i) => (
                <div key={i} className={`${styles.slide} ${i === 0 ? styles.slideCover : ''}`}>
                  <div className={styles.slideNum}>{String(s.slideNum).padStart(2, '0')} · {s.tag.toUpperCase()}</div>
                  <h2 className={styles.slideHeadline}>{s.headline}</h2>
                  {s.body && <p className={styles.slideBody}>{s.body}</p>}
                  {s.kvPairs?.length > 0 && (
                    <div className={styles.kvGrid}>
                      {s.kvPairs.map((kv, j) => (
                        <div key={j} className={styles.kvItem}>
                          <div className={styles.kvK}>{kv.k}</div>
                          <div className={styles.kvV}>{kv.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className={styles.printTip}>
              Open the downloaded file in your browser → File → Print → Save as PDF
            </p>
          </div>
        )}

      </div>
    </main>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={{
        display: 'block', fontSize: '10px', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#888', marginBottom: '6px'
      }}>{label}</label>
      {children}
    </div>
  )
}
