import React, { useState } from 'react'
import Hospital_PrintHeader, { type HospitalBrand } from './hospital_PrintHeader'

const pageBorder = '2px solid #000'
const tableBorder = '1px solid #000'
const bold: React.CSSProperties = { fontWeight: 700 }
const tiny: React.CSSProperties = { fontSize: 12 }
const line: React.CSSProperties = { borderBottom: '1px solid #000', minHeight: 18 }
const box: React.CSSProperties = { border: tableBorder, minHeight: 26 }

export type TestTubeConsentProps = { patient?: { name?: string; cnic?: string; phone?: string; address?: string }; brand?: Partial<HospitalBrand> }

export default function Hospital_TestTubeConsent({ patient, brand }: TestTubeConsentProps) {
  const [editable, setEditable] = useState(true)

  const printView = () => window.print()

  return (
    <div style={{ position: 'relative' }}>
      <div className="print-hide" style={{ position: 'sticky', top: 8, left: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, zIndex: 10 }}>
        <button onClick={() => setEditable(e => !e)} style={{ padding: '6px 10px', border: '1px solid #aaa', borderRadius: 6, background: editable ? '#e0f2fe' : '#f1f5f9', cursor: 'pointer', fontSize: 12 }}>
          {editable ? 'Editing Enabled' : 'Enable Edit'}
        </button>
        <button onClick={printView} style={{ padding: '6px 10px', border: '1px solid #aaa', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: 12 }}>Print</button>
      </div>

      <div dir="rtl" style={{ border: pageBorder, padding: 16, background: '#fff' }} contentEditable={editable} suppressContentEditableWarning>
        <Hospital_PrintHeader brand={brand} />
        {/* Hospital Heading (optional) */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>NOOR MEDICAL COMPLEX</div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', ...bold, fontSize: 20 }}>رضامندی فارم برائے چیسٹ ٹیوب</div>

        {/* Intro */}
        <div style={{ marginTop: 12, lineHeight: 1.9, fontSize: 16 }}>
          <p>
            ہمیں مریض کو بیماری کی نوعیت اور تشخیصی/علاجی طریقہ کار کے بارے میں آگاہ کر دیا گیا ہے۔ ہم اپنے مریض کے
            پھیپھڑوں کے بیرونی جھلیوں میں زیرِ علاج پریشر کے سبب "چیسٹ ٹیوب" ڈالنے کی اجازت دیتے ہیں۔
          </p>
          <p>
            ہمیں یہ بھی بتایا گیا ہے کہ طریقۂ کار کے دوران اور بعد ازاں ممکنہ پیچیدگیاں ہو سکتی ہیں، اور ہم اس بارے میں
            آگاہ ہیں۔ کسی ممکنہ پیچیدگی کی صورت میں معالجین کے خلاف کسی قسم کی قانونی چارہ جوئی کے مجاز نہ ہوں گے۔
          </p>
        </div>

        {/* Patient / Guardian */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px 1fr', columnGap: 8, alignItems: 'end' }}>
            <div style={bold}>مریض / سرپرست کا نام:</div>
            <div style={line}>{patient?.name || ''}</div>
            <div style={{ ...bold, textAlign: 'left' }}>شناختی کارڈ نمبر:</div>
            <div style={line}>{patient?.cnic || ''}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px 1fr', columnGap: 8, alignItems: 'end', marginTop: 10 }}>
            <div style={bold}>رابطہ نمبر:</div>
            <div style={line}>{patient?.phone || ''}</div>
            <div style={{ ...bold, textAlign: 'left' }}>پتہ:</div>
            <div style={line}>{patient?.address || ''}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px 1fr', columnGap: 8, alignItems: 'end', marginTop: 10 }}>
            <div style={bold}>دستخط مریض/سرپرست:</div>
            <div style={line} />
            <div style={{ ...bold, textAlign: 'left' }}>تاریخ:</div>
            <div style={line} />
          </div>
        </div>

        {/* Doctor block */}
        <div style={{ marginTop: 18, border: tableBorder }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', alignItems: 'stretch' }}>
            <div style={{ ...box, display: 'grid', gridTemplateRows: 'auto 1fr', padding: '0 8px' }}>
              <div>معالج ڈاکٹر کا نام:</div>
              <div style={{ borderTop: tableBorder, padding: 6 }}>Stamp</div>
            </div>
            <div style={{ ...box, borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>دستخط</div>
            <div style={{ ...box, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>تاریخ</div>
            <div style={{ ...box, display: 'grid', alignItems: 'center', padding: '0 8px' }}>وقت</div>
          </div>
        </div>

        <div style={{ marginTop: 12, ...tiny, textAlign: 'center' }}>فارم قابلِ طباعت (A4)</div>
      </div>
    </div>
  )
}
