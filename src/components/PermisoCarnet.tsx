import { Permit } from '@/types'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef, useCallback } from 'react'

interface PermisoCarnetProps {
  permit: Permit
}


export function PermisoCarnet({ permit }: PermisoCarnetProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const vigenciaStr = permit.fecha_vencimiento
    ? new Date(permit.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'


  const handlePrint = useCallback(() => {
    const node = printRef.current
    if (!node) return

    const origin = window.location.origin
    const rawHtml = node.outerHTML
      .replace(/src="\/((?!\/).+?)"/g, `src="${origin}/$1"`)
      .replace(/url\(\/((?!\/).+?)\)/g, `url(${origin}/$1)`)

    const win = window.open('', '_blank', 'width=620,height=780,toolbar=0,menubar=0,scrollbars=0')
    if (!win) {
      alert('Desactiva el bloqueador de ventanas emergentes para poder imprimir.')
      return
    }

    let printed = false
    const executePrint = () => {
      if (printed || win.closed) return
      printed = true
      win.focus()
      win.print()
      win.addEventListener('afterprint', () => { if (!win.closed) win.close() }, { once: true })
    }

    win.onload = () => setTimeout(executePrint, 500)

    win.document.open()
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Credencial-${permit.numero_permiso ?? 'conductor'}</title>
  <style>
    @page { margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: white; }
    .carnet-print-target { display: block !important; margin: 0; padding: 0; }
    .carnet-page-break {
      display: block !important;
      page-break-after: always !important;
      break-after: page !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 200px !important;
      height: 312px !important;
      overflow: hidden !important;
    }
    .carnet-page-break:last-child { page-break-after: avoid !important; break-after: avoid !important; }
    .carnet-face {
      width: 200px !important;
      height: 312px !important;
      min-width: 200px !important;
      min-height: 312px !important;
      max-height: 312px !important;
      overflow: hidden !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
  </style>
</head>
<body>${rawHtml}</body>
</html>`)
    win.document.close()

    setTimeout(executePrint, 1500)
  }, [permit])
  const NAVY = '#0A2342'
  const GOLD = '#F5A623'
  const WHITE = '#FFFFFF'
  const LIGHT_GRAY = '#F0F4F8'
  const cardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    position: 'relative',
    background: WHITE,
  }
  const IconUser = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={WHITE}>
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  )
  const IconCard = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={WHITE}>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
    </svg>
  )
  const IconLicense = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={WHITE}>
      <path d="M20 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-9 7H7v-2h4v2zm6 0h-4v-2h4v2zm0-4H7V8h10v1z"/>
    </svg>
  )
  const IconCar = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={WHITE}>
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  )
  const IconShield = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={WHITE}>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
  )
  const IconCalendar = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={WHITE}>
      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
    </svg>
  )
  function FieldRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%',
          backgroundColor: NAVY, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '5px', fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
            {label}
          </div>
          <div style={{
            height: '15px', backgroundColor: '#E8EDF5', borderRadius: '4px',
            padding: '0 6px', display: 'flex', alignItems: 'center',
            fontSize: '7px', fontWeight: 700, color: '#1a2e4a',
          }}>
            {value || <span style={{ color: '#aaa' }}>—</span>}
          </div>
        </div>
      </div>
    )
  }

  
  function CarnetFooter() {
    return (
      <div style={{
        background: NAVY,
        padding: '6px 8px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}>
        {[
          { icon: '🛡️', lines: ['Seguridad', 'y Confianza'] },
          { icon: '🚗', lines: ['Tránsito', 'Seguro'] },
          { icon: '👥', lines: ['Compromiso', 'con la Ciudad'] },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px' }}>{item.icon}</span>
            <div>
              {item.lines.map((line, j) => (
                <div key={j} style={{ fontSize: '4.5px', fontWeight: 700, color: '#90adc4', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  
  const FrontFace = () => (
    <div className="carnet-face" style={{ ...cardStyle, background: WHITE }}>
      {}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 60%, #1a3a5c 100%)`,
        padding: '10px 10px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Adorno superior derecho */}
        <div style={{
          position: 'absolute', bottom: -1, right: 0,
          width: '45px', height: '18px',
          background: GOLD, borderRadius: '24px 0 0 0',
        }} />
        <img
          src="/Marcona_Escudo.png"
          alt="Escudo Marcona"
          style={{ width: '30px', height: '30px', objectFit: 'contain', flexShrink: 0, position: 'relative', zIndex: 1 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '5.5px', fontWeight: 600, color: '#a8c4e0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Municipalidad Distrital de
          </div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: WHITE, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            MARCONA
          </div>
        </div>
      </div>

      {/* Franja Título */}
      <div style={{
        background: `linear-gradient(180deg, #e8f0f8 0%, ${WHITE} 100%)`,
        padding: '6px 10px 4px',
        textAlign: 'center',
        borderBottom: `2px solid ${LIGHT_GRAY}`,
      }}>
        <div style={{ fontSize: '6px', fontWeight: 800, color: NAVY, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          — Credencial de —
        </div>
        <div style={{ fontSize: '15px', fontWeight: 900, color: NAVY, letterSpacing: '0.05em', lineHeight: 1 }}>
          CONDUCTOR
        </div>
        <div style={{ width: '25px', height: '2px', background: GOLD, borderRadius: '1px', margin: '4px auto 0' }} />
      </div>

      {/* Contenido Central */}
      <div style={{ flex: 1, padding: '6px 10px 4px', position: 'relative', overflow: 'hidden' }}>
        {/* Marca de agua */}
        <div style={{
          position: 'absolute', right: '-10px', top: '10px',
          width: '90px', height: '90px', opacity: 0.06,
          backgroundImage: 'url(/Marcona_Escudo.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }} />

        {/* Datos Personales - Ocupa todo el ancho ahora */}
        <div style={{ width: '100%' }}>
          <FieldRow icon={<IconUser />} label="Nombres y Apellidos" value={permit.nombre_completo || ''} />
          <FieldRow icon={<IconCard />} label="DNI" value={permit.dni || ''} />
          <FieldRow icon={<IconLicense />} label="Nº de Licencia" value={permit.numero_licencia || ''} />
          <FieldRow icon={<IconCar />} label="Categoría" value={permit.categoria || ''} />
          <FieldRow icon={<IconShield />} label="Nº de Credencial" value={permit.numero_permiso} />
          <FieldRow icon={<IconCalendar />} label="Vigencia" value={vigenciaStr} />
        </div>
      </div>

      {/* Footer (franja inferior) */}
      <CarnetFooter />
    </div>
  )

  
  const BackFace = () => (
    <div className="carnet-face" style={{ ...cardStyle }}>
      {/* Cabecera Trasera */}
      <div style={{
        background: `linear-gradient(160deg, #e8f0f8 0%, ${WHITE} 60%, #f5e8c8 100%)`,
        padding: '10px 10px 8px',
        textAlign: 'center',
        borderBottom: `2px solid ${LIGHT_GRAY}`,
      }}>
        <img
          src="/Marcona_Escudo.png"
          alt="Escudo Marcona"
          style={{ width: '40px', height: '40px', objectFit: 'contain', marginBottom: '5px' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div style={{ fontSize: '6px', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Municipalidad Distrital de
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: NAVY, letterSpacing: '0.03em' }}>
          MARCONA
        </div>
        <div style={{ width: '32px', height: '2px', background: GOLD, borderRadius: '1px', margin: '4px auto 0' }} />
      </div>

      {/* Contenido Central: QR Code grande */}
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {permit.qr_code && permit.qr_code !== 'FAKE_QR' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: '90px', height: '90px',
              border: `2px solid ${NAVY}`,
              borderRadius: '6px', padding: '4px',
              background: WHITE, marginBottom: '4px',
            }}>
              <img
                src={`data:image/png;base64,${permit.qr_code}`}
                alt="QR Code"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{
              background: GOLD, borderRadius: '4px',
              padding: '4px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '6.5px', fontWeight: 900, color: NAVY, lineHeight: 1.2 }}>
                📱 ESCANEA PARA VERIFICAR
              </div>
            </div>
          </div>
        )}
        <p style={{ fontSize: '6.5px', lineHeight: 1.3, color: '#334155', margin: 0, textAlign: 'center', marginTop: '6px' }}>
          La presente credencial es de uso personal e intransferible. En caso de pérdida, comuníquese con la Subgerencia de Serenazgo, Tránsito y Seguridad Vial.
        </p>
      </div>

      {/* Footer (franja inferior) */}
      <CarnetFooter />
    </div>
  )

  
  return (
    <div>
      <div className="flex justify-center mb-4">
        <Button
          onClick={() => handlePrint()}
          className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-bold px-8 h-12 rounded-xl shadow-lg flex items-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Imprimir Carnet (Doble Cara)
        </Button>
      </div>

      {/* Vista de pantalla: lado a lado, solo visible en pantalla */}
      <div className="flex flex-row gap-5 justify-center items-start p-2">
        <div>
          <div
            style={{
              fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'center',
              marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            CARA DELANTERA
          </div>
          <FrontFace />
        </div>
        <div>
          <div
            style={{
              fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'center',
              marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            CARA TRASERA
          </div>
          <BackFace />
        </div>
      </div>

      {/* El wrapper maneja el off-screen. El printRef NO tiene estilos de posición → el clon en el iframe queda visible */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={printRef} className="carnet-print-target">
          <div className="carnet-page-break"><FrontFace /></div>
          <div className="carnet-page-break"><BackFace /></div>
        </div>
      </div>
    </div>
  )
}
