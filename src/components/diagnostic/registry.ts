import React from 'react'

export type ReportRendererProps = { value: string; onChange: (text: string)=>void }

import UltrasoundGeneric from './diagnostic_UltrasoundGeneric'
import CTScan from './diagnostic_CTScan'
import Echocardiography from './diagnostic_Echocardiography'
import Colonoscopy from './diagnostic_Colonoscopy'
import UpperGIEndoscopy from './diagnostic_UpperGIEndoscopy'
import { printUltrasoundReport } from './diagnostic_UltrasoundGeneric'
import { printCTScanReport } from './diagnostic_CTScan'
import { printEchocardiographyReport } from './diagnostic_Echocardiography'
import { printColonoscopyReport } from './diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from './diagnostic_UpperGIEndoscopy'

export const DiagnosticFormRegistry: Record<string, React.ComponentType<ReportRendererProps>> = {
  Ultrasound: UltrasoundGeneric,
  CTScan: CTScan,
  Echocardiography: Echocardiography,
  Colonoscopy: Colonoscopy,
  UpperGiEndoscopy: UpperGIEndoscopy,
}

export type DiagnosticPrintArgs = {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: any
  value: string
  images?: string[]
  referringConsultant?: string
}

export const DiagnosticTemplateRegistry: Record<string, { Form: React.ComponentType<ReportRendererProps>; print: (args: DiagnosticPrintArgs)=> Promise<void> | void }> = {
  Ultrasound: { Form: UltrasoundGeneric, print: printUltrasoundReport },
  CTScan: { Form: CTScan, print: printCTScanReport },
  Echocardiography: { Form: Echocardiography, print: printEchocardiographyReport },
  Colonoscopy: { Form: Colonoscopy, print: printColonoscopyReport },
  UpperGiEndoscopy: { Form: UpperGIEndoscopy, print: printUpperGIEndoscopyReport },
}
