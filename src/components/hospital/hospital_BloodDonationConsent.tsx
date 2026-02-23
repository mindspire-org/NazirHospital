import React, { useState } from 'react'
import Hospital_PrintHeader, { type HospitalBrand } from './hospital_PrintHeader'

const pageBorder = '2px solid #000'
const tableBorder = '1px solid #000'
const bold: React.CSSProperties = { fontWeight: 700 }
const tiny: React.CSSProperties = { fontSize: 12 }
const line: React.CSSProperties = { borderBottom: '1px solid #000', minHeight: 18 }
const box: React.CSSProperties = { border: tableBorder, minHeight: 26 }

export type BloodDonationProps = { patient?: { name?: string; fatherOrSpouse?: string; cnic?: string; phone?: string; address?: string }; brand?: Partial<HospitalBrand> }

export default function Hospital_BloodDonationConsent({ patient, brand }: BloodDonationProps) {
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
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', ...bold, fontSize: 20 }}>اجازت نامہ برائے عطیہ خون</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', columnGap: 6 }}>
            <div style={bold}>تاریخ:</div>
            <div style={line} />
          </div>
        </div>

        {/* Body */}
        <div style={{ marginTop: 12, lineHeight: 1.9, fontSize: 16 }}>
          <p>
            میں اپنے خون کا عطیہ رضامندی اور بغیر کسی دباؤ یا لالچ کے دے رہا / رہی ہوں۔ اور مجھے خون کا عطیہ ضرورت مند مریض کی جان بچانے کے لیے دیا جا رہا ہے۔
            اگر میرے خون کی بوتل جس ضرورت مند کو دی جا رہی ہے، اس کو کسی وجہ سے نہ لگ سکے یا مریض خون کی یہ بوتل کسی دوسرا مستحق مریض کو لگ جائے تو مجھے اس پر کوئی اعتراض نہ ہوگا۔
          </p>
          <p>
            ادارہ انتقال خون میں عطیہ شدہ خون طبی استعمال کے لئے محفوظ طریقہ کار کے تحت استعمال کیا جاتا ہے اور کسی تجارتی مقصد کے لیے استعمال نہیں کیا جاتا۔
            عطیہ دہندہ ہر طرح کی طبی پیچیدگیوں سے آگاہ ہے اور کسی بھی ممکنہ پریشانی کی صورت میں ادارہ اور عملہ قانونی چارہ جوئی کے مجاز نہ ہونگے۔
          </p>
        </div>

        {/* Donor and witnesses */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 1fr', columnGap: 8, alignItems: 'end' }}>
            <div style={bold}>عطیہ دینے والے کا نام:</div>
            <div style={line}>{patient?.name || ''}</div>
            <div style={{ ...bold, textAlign: 'left' }}>Father/Spouse:</div>
            <div style={line}>{patient?.fatherOrSpouse || ''}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 1fr', columnGap: 8, alignItems: 'end', marginTop: 10 }}>
            <div style={bold}>شناختی کارڈ نمبر:</div>
            <div style={line}>{patient?.cnic || ''}</div>
            <div style={{ ...bold, textAlign: 'left' }}>فون نمبر:</div>
            <div style={line}>{patient?.phone || ''}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 1fr', columnGap: 8, alignItems: 'end', marginTop: 10 }}>
            <div style={bold}>پتہ:</div>
            <div style={line}>{patient?.address || ''}</div>
            <div style={{ ...bold, textAlign: 'left' }}>دستخط عطیہ دہندہ:</div>
            <div style={line} />
          </div>

          <div style={{ marginTop: 16, ...bold }}>گواہان</div>
          <div style={{ border: tableBorder, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 180px 1fr', alignItems: 'stretch' }}>
              <div style={{ ...box, display: 'grid', placeItems: 'center' }}>1</div>
              <div style={{ ...box, borderLeft: tableBorder, padding: '0 8px', display: 'grid', alignItems: 'center' }}>نام</div>
              <div style={{ ...box, borderLeft: tableBorder, padding: '0 8px', display: 'grid', alignItems: 'center' }}>شناختی کارڈ نمبر</div>
              <div style={{ ...box }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 180px 1fr', alignItems: 'stretch' }}>
              <div style={{ ...box, borderTop: 'none', display: 'grid', placeItems: 'center' }}>2</div>
              <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, padding: '0 8px', display: 'grid', alignItems: 'center' }}>نام</div>
              <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, padding: '0 8px', display: 'grid', alignItems: 'center' }}>شناختی کارڈ نمبر</div>
              <div style={{ ...box, borderTop: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, ...tiny, textAlign: 'center' }}>MS DHQ HOSPITAL • فرم قابلِ طباعت (A4)</div>
      </div>
    </div>
  )
}
