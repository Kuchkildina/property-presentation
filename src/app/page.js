'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

const TABS = [
  { id: 'manual', label: 'A — Manual' },
  { id: 'upload', label: 'B — Upload PDF' },
  { id: 'url', label: 'C — Website' },
  { id: 'database', label: 'D — My properties' },
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

  // Database state
  const [developments, setDevelopments] = useState([])
  const [units, setUnits] = useState([])
  const [selectedDev, setSelectedDev] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [dbClient, setDbClient] = useState(null)
  const [dbView, setDbView] = useState('list') // list | addDev | addUnit
  const [dbLoading, setDbLoading] = useState(false)
  const [clientName, setClientName] = useState('')

  // New development form
  const [newDev, setNewDev] = useState({
    name: '', address: '', developer: '', architect: '',
    completion: '', lease: '', service_charge: '', amenities: '',
    location_notes: '', brochure_url: ''
  })

  // New unit form
  const [newUnit, setNewUnit] = useState({
    unit_number: '', type: '', floor: '', block: '',
    bedrooms: '', area: '', price: '', features: ''
  })

  // Manual fields
  const [manual, setManual] = useState({
    name: '', address: '', developer: '', architect: '',
    type: '', price: '', area: '', floor: '', completion: '',
    lease: '', amenities: '', service: '', location: '', client: ''
  })

  const [upload, setUpload] = useState({ unit: '', client: '', notes: '' })
  const [urlData, setUrlData] = useState({ url: '', name: '', unit: '', client: '', notes: '' })

  useEffect(() => {
    async function initSupabase() {
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      setDbClient(client)
      loadDevelopments(client)
    }
    initSupabase()
  }, [])

  async function loadDevelopments(client) {
    setDbLoading(true)
    const { data } = await (client || dbClient).from('developments').select('*').order('name')
    if (data) setDevelopments(data)
    setDbLoading(false)
  }

  async function loadUnits(devId) {
    const { data } = await dbClient.from('units').select('*').eq('development_id', devId).order('unit_number')
    if (data) setUnits(data)
  }

  async function saveDevelopment() {
    if (!newDev.name) return
    setDbLoading(true)
    const { data } = await dbClient.from('developments').insert([newDev]).select()
    if (data) {
      setDevelopments(prev => [...prev, data[0]])
      setNewDev({ name: '', address: '', developer: '', architect: '', completion: '', lease: '', service_charge: '', amenities: '', location_notes: '', brochure_url: '' })
      setDbView('list')
    }
    setDbLoading(false)
  }

  async function saveUnit() {
    if (!newUnit.unit_number || !selectedDev) return
    setDbLoading(true)
    const { data } = await dbClient.from('units').insert([{ ...newUnit, development_id: selectedDev.id }]).select()
    if (data) {
      setUnits(prev => [...prev, data[0]])
      setNewUnit({ unit_number: '', type: '', floor: '', block: '', bedrooms: '', area: '', price: '', features: '' })
      setDbView('units')
    }
    setDbLoading(false)
  }

  async function deleteDevelopment(id) {
    await dbClient.from('developments').delete().eq('id', id)
    setDevelopments(prev => prev.filter(d => d.id !== id))
    if (selectedDev?.id === id) { setSelectedDev(null); setUnits([]) }
  }

  async function deleteUnit(id) {
    await dbClient.from('units').delete().eq('id', id)
    setUnits(prev => prev.filter(u => u.id !== id))
  }

  function setM(key, val) { setManual(p => ({ ...p, [key]: val })) }
  function setU(key, val) { setUpload(p => ({ ...p, [key]: val })) }
  function setUd(key, val) { setUrlData(p => ({ ...p, [key]: val })) }
  function setND(key, val) { setNewDev(p => ({ ...p, [key]: val })) }
  function setNU(key, val) { setNewUnit(p => ({ ...p, [key]: val })) }

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
      let body = { mode: tab === 'database' ? 'manual' : tab, lang }

      if (tab === 'manual') {
        body.data = manual
      } else if (tab === 'upload') {
        body.data = upload
        if (brochureRef.current?.files[0]) body.brochureBase64 = await toBase64(brochureRef.current.files[0])
        if (priceRef.current?.files[0]) body.priceBase64 = await toBase64(priceRef.current.files[0])
      } else if (tab === 'url') {
        body.url = urlData.url
        body.data = urlData
      } else if (tab === 'database') {
        if (!selectedDev || !selectedUnit) { setStatus('Please select a development and unit.'); setLoading(false); return }
        body.data = {
          name: selectedDev.name,
          address: selectedDev.address,
          developer: selectedDev.developer,
          architect: selectedDev.architect,
          completion: selectedDev.completion,
          lease: selectedDev.lease,
          service: selectedDev.service_charge,
          amenities: selectedDev.amenities,
          location: selectedDev.location_notes,
          type: selectedUnit.type,
          price: selectedUnit.price,
          area: selectedUnit.area,
          floor: selectedUnit.floor,
          block: selectedUnit.block,
          unit: selectedUnit.unit_number,
          client: clientName
        }
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
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Jost',sans-serif;background:#fff;color:#1a1a1a}
.slide{width:100%;min-height:100vh;padding:5rem 6rem;display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid #e0dbd3;page-break-after:always}
.slide:last-child{border-bottom:none;page-break-after:auto}
.slide-num{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#bbb;margin-bottom:2rem}
h2{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:300;letter-spacing:0.06em;margin-bottom:1.25rem;line-height:1.2}
p{font-size:15px;line-height:1.85;color:#555;max-width:620px;white-space:pre-line}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.25rem;margin-top:2.5rem}
.kv-item{padding:1.25rem 1.5rem;background:#f8f6f2;border-top:2px solid #B5935A}
.kv-k{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#bbb;margin-bottom:6px}
.kv-v{font-size:17px;font-weight:500}
.cover{background:#1a1a1a}
.cover h2,.cover .kv-v{color:#fff}
.cover p{color:#888}
.cover .slide-num{color:#444}
.cover .kv-item{background:#2a2a2a}
.cover .kv-k{color:#666}
@media print{.slide{page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${slides.map((s,i) => `<div class="slide${i===0?' cover':''}">
<div class="slide-num">${String(s.slideNum).padStart(2,'0')} · ${s.tag.toUpperCase()}</div>
<h2>${s.headline}</h2>
${s.body ? `<p>${s.body}</p>` : ''}
${s.kvPairs?.length ? `<div class="kv">${s.kvPairs.map(kv=>`<div class="kv-item"><div class="kv-k">${kv.k}</div><div class="kv-v">${kv.v}</div></div>`).join('')}</div>` : ''}
</div>`).join('\n')}
</body></html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = title.replace(/\s+/g, '-').toLowerCase() + '.html'
    a.click()
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Property Presentation</h1>
          <p>Generate a client presentation in minutes</p>
        </header>

        <div className={styles.tabRow}>
          {TABS.map((t, i) => (
            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Panel A — Manual */}
        {tab === 'manual' && (
          <div className={styles.panel}>
            <Field label="Development name"><input placeholder="e.g. The Broadley" value={manual.name} onChange={e => setM('name', e.target.value)} /></Field>
            <Field label="Address"><input placeholder="382-386 Edgware Road, London NW8 8DL" value={manual.address} onChange={e => setM('address', e.target.value)} /></Field>
            <div className={styles.row2}>
              <Field label="Developer"><input placeholder="Mount Anvil" value={manual.developer} onChange={e => setM('developer', e.target.value)} /></Field>
              <Field label="Architect"><input placeholder="Stiff + Trevillion" value={manual.architect} onChange={e => setM('architect', e.target.value)} /></Field>
            </div>
            <div className={styles.row3}>
              <Field label="Apartment type"><input placeholder="2-bedroom" value={manual.type} onChange={e => setM('type', e.target.value)} /></Field>
              <Field label="Price"><input placeholder="£1,326,500" value={manual.price} onChange={e => setM('price', e.target.value)} /></Field>
              <Field label="Area"><input placeholder="1,062 sq ft" value={manual.area} onChange={e => setM('area', e.target.value)} /></Field>
            </div>
            <div className={styles.row3}>
              <Field label="Floor"><input placeholder="10" value={manual.floor} onChange={e => setM('floor', e.target.value)} /></Field>
              <Field label="Completion"><input placeholder="Q3 2030" value={manual.completion} onChange={e => setM('completion', e.target.value)} /></Field>
              <Field label="Lease"><input placeholder="990 years" value={manual.lease} onChange={e => setM('lease', e.target.value)} /></Field>
            </div>
            <Field label="Amenities"><input placeholder="24h concierge, Peloton gym, cinema..." value={manual.amenities} onChange={e => setM('amenities', e.target.value)} /></Field>
            <Field label="Service charge"><input placeholder="£6.82 per sq ft" value={manual.service} onChange={e => setM('service', e.target.value)} /></Field>
            <Field label="Location highlights"><textarea placeholder="Near Regent's Park, Hyde Park. Edgware Road tube 3 min..." value={manual.location} onChange={e => setM('location', e.target.value)} /></Field>
            <Field label="Client name (optional)"><input placeholder="e.g. Andrei Petrov" value={manual.client} onChange={e => setM('client', e.target.value)} /></Field>
          </div>
        )}

        {/* Panel B — Upload */}
        {tab === 'upload' && (
          <div className={styles.panel}>
            <div className={styles.infoNote}>Upload the developer's brochure PDF. For files over 5MB, use tab C with a Google Drive link instead.</div>
            <Field label="Brochure PDF">
              <label className={styles.uploadZone}>
                <span className={styles.uploadIcon}>↑</span>
                <span>{brochureName || 'Drop brochure PDF here or click to browse'}</span>
                <input type="file" accept=".pdf" ref={brochureRef} onChange={e => setBrochureName(e.target.files[0]?.name || '')} style={{ display: 'none' }} />
              </label>
            </Field>
            <Field label="Price list (optional)">
              <label className={styles.uploadZone}>
                <span className={styles.uploadIcon}>↑</span>
                <span>{priceName || 'Drop price list here or click to browse'}</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" ref={priceRef} onChange={e => setPriceName(e.target.files[0]?.name || '')} style={{ display: 'none' }} />
              </label>
            </Field>
            <div className={styles.row2}>
              <Field label="Apartment / unit"><input placeholder="e.g. Apt 105, Block Eliot" value={upload.unit} onChange={e => setU('unit', e.target.value)} /></Field>
              <Field label="Client name (optional)"><input placeholder="e.g. Andrei Petrov" value={upload.client} onChange={e => setU('client', e.target.value)} /></Field>
            </div>
            <Field label="Additional notes"><textarea placeholder="Investment, family use, rental yield..." value={upload.notes} onChange={e => setU('notes', e.target.value)} /></Field>
          </div>
        )}

        {/* Panel C — URL */}
        {tab === 'url' && (
          <div className={styles.panel}>
            <div className={styles.infoNote}>Paste the developer's website URL or a Google Drive link to the brochure.</div>
            <Field label="URL"><input placeholder="https://thebroadley.co.uk" value={urlData.url} onChange={e => setUd('url', e.target.value)} /></Field>
            <Field label="Development name"><input placeholder="The Broadley" value={urlData.name} onChange={e => setUd('name', e.target.value)} /></Field>
            <div className={styles.row2}>
              <Field label="Apartment type or unit"><input placeholder="2-bedroom, floor 10" value={urlData.unit} onChange={e => setUd('unit', e.target.value)} /></Field>
              <Field label="Client name (optional)"><input placeholder="e.g. Andrei Petrov" value={urlData.client} onChange={e => setUd('client', e.target.value)} /></Field>
            </div>
            <Field label="Focus"><textarea placeholder="Investment, primary residence, buy-to-let..." value={urlData.notes} onChange={e => setUd('notes', e.target.value)} /></Field>
          </div>
        )}

        {/* Panel D — Database */}
        {tab === 'database' && (
          <div className={styles.panel}>
            {dbView === 'list' && (
              <>
                <div className={styles.dbHeader}>
                  <span className={styles.dbTitle}>Developments ({developments.length})</span>
                  <button className={styles.addBtn} onClick={() => setDbView('addDev')}>+ Add development</button>
                </div>
                {dbLoading && <p className={styles.dbLoading}>Loading...</p>}
                {developments.map(dev => (
                  <div key={dev.id} className={`${styles.devCard} ${selectedDev?.id === dev.id ? styles.devCardActive : ''}`}>
                    <div className={styles.devCardMain} onClick={() => { setSelectedDev(dev); loadUnits(dev.id); setDbView('units') }}>
                      <div className={styles.devName}>{dev.name}</div>
                      <div className={styles.devAddress}>{dev.address}</div>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deleteDevelopment(dev.id)}>×</button>
                  </div>
                ))}
                {developments.length === 0 && !dbLoading && (
                  <p className={styles.dbEmpty}>No developments yet. Add your first one.</p>
                )}
              </>
            )}

            {dbView === 'units' && selectedDev && (
              <>
                <div className={styles.dbHeader}>
                  <button className={styles.backBtn} onClick={() => setDbView('list')}>← {selectedDev.name}</button>
                  <button className={styles.addBtn} onClick={() => setDbView('addUnit')}>+ Add unit</button>
                </div>
                <div className={styles.unitsGrid}>
                  {units.map(unit => (
                    <div key={unit.id} className={`${styles.unitCard} ${selectedUnit?.id === unit.id ? styles.unitCardActive : ''}`}>
                      <div className={styles.unitCardMain} onClick={() => setSelectedUnit(unit)}>
                        <div className={styles.unitNum}>Unit {unit.unit_number}</div>
                        <div className={styles.unitType}>{unit.type}</div>
                        <div className={styles.unitPrice}>{unit.price}</div>
                        <div className={styles.unitDetails}>Floor {unit.floor} · {unit.area}</div>
                      </div>
                      <button className={styles.deleteBtn} onClick={() => deleteUnit(unit.id)}>×</button>
                    </div>
                  ))}
                  {units.length === 0 && <p className={styles.dbEmpty}>No units yet.</p>}
                </div>
                {selectedUnit && (
                  <div className={styles.selectedUnit}>
                    <div className={styles.selectedUnitInfo}>Selected: <strong>Unit {selectedUnit.unit_number}</strong> — {selectedUnit.type}, {selectedUnit.price}</div>
                    <Field label="Client name (optional)">
                      <input placeholder="e.g. Andrei Petrov" value={clientName} onChange={e => setClientName(e.target.value)} />
                    </Field>
                  </div>
                )}
              </>
            )}

            {dbView === 'addDev' && (
              <>
                <div className={styles.dbHeader}>
                  <button className={styles.backBtn} onClick={() => setDbView('list')}>← Back</button>
                  <span className={styles.dbTitle}>New development</span>
                </div>
                <Field label="Development name *"><input placeholder="The Broadley" value={newDev.name} onChange={e => setND('name', e.target.value)} /></Field>
                <Field label="Address"><input placeholder="382-386 Edgware Road, London NW8 8DL" value={newDev.address} onChange={e => setND('address', e.target.value)} /></Field>
                <div className={styles.row2}>
                  <Field label="Developer"><input placeholder="Mount Anvil" value={newDev.developer} onChange={e => setND('developer', e.target.value)} /></Field>
                  <Field label="Architect"><input placeholder="Stiff + Trevillion" value={newDev.architect} onChange={e => setND('architect', e.target.value)} /></Field>
                </div>
                <div className={styles.row3}>
                  <Field label="Completion"><input placeholder="Q3 2030" value={newDev.completion} onChange={e => setND('completion', e.target.value)} /></Field>
                  <Field label="Lease"><input placeholder="990 years" value={newDev.lease} onChange={e => setND('lease', e.target.value)} /></Field>
                  <Field label="Service charge"><input placeholder="£6.82 per sq ft" value={newDev.service_charge} onChange={e => setND('service_charge', e.target.value)} /></Field>
                </div>
                <Field label="Amenities"><input placeholder="24h concierge, Peloton gym, cinema..." value={newDev.amenities} onChange={e => setND('amenities', e.target.value)} /></Field>
                <Field label="Location notes"><textarea placeholder="Near Regent's Park, Hyde Park. Edgware Road tube 3 min..." value={newDev.location_notes} onChange={e => setND('location_notes', e.target.value)} /></Field>
                <Field label="Brochure URL (Google Drive or website)"><input placeholder="https://drive.google.com/..." value={newDev.brochure_url} onChange={e => setND('brochure_url', e.target.value)} /></Field>
                <button className={styles.saveBtn} onClick={saveDevelopment} disabled={dbLoading}>Save development</button>
              </>
            )}

            {dbView === 'addUnit' && selectedDev && (
              <>
                <div className={styles.dbHeader}>
                  <button className={styles.backBtn} onClick={() => setDbView('units')}>← Back</button>
                  <span className={styles.dbTitle}>New unit — {selectedDev.name}</span>
                </div>
                <div className={styles.row2}>
                  <Field label="Unit number *"><input placeholder="105" value={newUnit.unit_number} onChange={e => setNU('unit_number', e.target.value)} /></Field>
                  <Field label="Type"><input placeholder="2-bedroom" value={newUnit.type} onChange={e => setNU('type', e.target.value)} /></Field>
                </div>
                <div className={styles.row3}>
                  <Field label="Floor"><input placeholder="10" value={newUnit.floor} onChange={e => setNU('floor', e.target.value)} /></Field>
                  <Field label="Block"><input placeholder="The Eliot" value={newUnit.block} onChange={e => setNU('block', e.target.value)} /></Field>
                  <Field label="Bedrooms"><input placeholder="2" value={newUnit.bedrooms} onChange={e => setNU('bedrooms', e.target.value)} /></Field>
                </div>
                <div className={styles.row2}>
                  <Field label="Area"><input placeholder="1,062 sq ft" value={newUnit.area} onChange={e => setNU('area', e.target.value)} /></Field>
                  <Field label="Price"><input placeholder="£1,326,500" value={newUnit.price} onChange={e => setNU('price', e.target.value)} /></Field>
                </div>
                <Field label="Features"><input placeholder="balcony, 2 levels, city views..." value={newUnit.features} onChange={e => setNU('features', e.target.value)} /></Field>
                <button className={styles.saveBtn} onClick={saveUnit} disabled={dbLoading}>Save unit</button>
              </>
            )}
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.langSection}>
          <div className={styles.langLabel}>Presentation language</div>
          <div className={styles.langRow}>
            {LANGS.map(l => (
              <button key={l.id} className={`${styles.langBtn} ${lang === l.id ? styles.langActive : ''}`} onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
          </div>
        </div>

        <button className={styles.generateBtn} onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate presentation'}
        </button>
        {status && <p className={styles.status}>{status}</p>}

        {slides.length > 0 && (
          <div className={styles.previewWrap}>
            <div className={styles.previewHeader}>
              <span>Preview — {slides.length} slides</span>
              <button className={styles.downloadBtn} onClick={downloadHTML}>↓ Download for print</button>
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
            <p className={styles.printTip}>Open downloaded file in browser → Cmd+P / Ctrl+P → Save as PDF</p>
          </div>
        )}
      </div>
    </main>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}
