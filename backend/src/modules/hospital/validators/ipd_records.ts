import { z } from 'zod'

export const createIpdVitalSchema = z.object({
  recordedAt: z.coerce.date().optional(),
  bp: z.string().optional(),
  hr: z.coerce.number().optional(),
  rr: z.coerce.number().optional(),
  temp: z.coerce.number().optional(),
  spo2: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  painScale: z.coerce.number().optional(),
  recordedBy: z.string().optional(),
  note: z.string().optional(),
  // Daily Monitoring Chart additions
  shift: z.enum(['morning','evening','night']).optional(),
  bsr: z.coerce.number().optional(),
  intakeIV: z.string().optional(),
  urine: z.string().optional(),
  nurseSign: z.string().optional(),
})
export const updateIpdVitalSchema = createIpdVitalSchema

export const createIpdNoteSchema = z.object({
  noteType: z.enum(['nursing','progress','discharge']),
  text: z.string().min(1),
  attachments: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
})
export const updateIpdNoteSchema = z.object({
  noteType: z.enum(['nursing','progress','discharge']).optional(),
  text: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
})

export const createIpdDoctorVisitSchema = z.object({
  doctorId: z.string().optional(),
  when: z.coerce.date().optional(),
  category: z.enum(['visit','progress']).optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  diagnosisCodes: z.array(z.string()).optional(),
  nextReviewAt: z.coerce.date().optional(),
})
export const updateIpdDoctorVisitSchema = createIpdDoctorVisitSchema.extend({
  done: z.coerce.boolean().optional(),
})

export const createIpdMedicationOrderSchema = z.object({
  drugId: z.string().optional(),
  drugName: z.string().optional(),
  dose: z.string().optional(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  prn: z.coerce.boolean().optional(),
  status: z.enum(['active','stopped']).optional(),
  prescribedBy: z.string().optional(),
}).refine((d)=> !!(d.drugId || d.drugName), { message: 'drugId or drugName required' })
export const updateIpdMedicationOrderSchema = createIpdMedicationOrderSchema

export const createIpdMedicationAdminSchema = z.object({
  givenAt: z.coerce.date().optional(),
  doseGiven: z.string().optional(),
  byUser: z.string().optional(),
  status: z.enum(['given','missed','held']).optional(),
  remarks: z.string().optional(),
})
export const updateIpdMedicationAdminSchema = createIpdMedicationAdminSchema

export const createIpdLabLinkSchema = z.object({
  externalLabOrderId: z.string().optional(),
  testIds: z.array(z.string()).optional(),
  status: z.string().optional(),
})
export const updateIpdLabLinkSchema = createIpdLabLinkSchema

export const createIpdBillingItemSchema = z.object({
  type: z.enum(['bed','procedure','medication','service']),
  description: z.string().min(1),
  qty: z.coerce.number().default(1),
  unitPrice: z.coerce.number().default(0),
  amount: z.coerce.number().optional(),
  date: z.coerce.date().optional(),
  refId: z.string().optional(),
  billedBy: z.string().optional(),
})
export const updateIpdBillingItemSchema = z.object({
  type: z.enum(['bed','procedure','medication','service']).optional(),
  description: z.string().optional(),
  qty: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  date: z.coerce.date().optional(),
  refId: z.string().optional(),
  billedBy: z.string().optional(),
})

export const createIpdPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  method: z.string().optional(),
  refNo: z.string().optional(),
  receivedBy: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
})
export const updateIpdPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01).optional(),
  method: z.string().optional(),
  refNo: z.string().optional(),
  receivedBy: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
})

// Clinical Notes (Preop / Operation / Postop / Consultant / Anesthesia* / Forms)
const clinicalNoteType = z.enum(['preop','operation','postop','consultant','anes-pre','anes-intra','anes-recovery','anes-post-recovery','anes-adverse','consent-form','infection-control','blood-transfusion','operation-consent','history-exam','surgical-signin','surgical-timeout','surgical-signout'])
const preopDataSchema = z.object({
  npoFrom: z.string().optional(),
  maintainIV: z.string().optional(),
  shavePrepare: z.string().optional(),
  specialConsent: z.string().optional(),
  medication: z.string().optional(),
  specialInstructions: z.string().optional(),
})
const operationDataSchema = z.object({
  incision: z.string().optional(),
  procedure: z.string().optional(),
  findings: z.string().optional(),
  drain: z.string().optional(),
  specimenRemoved: z.string().optional(),
  histopathology: z.string().optional(),
  conditionAtEnd: z.string().optional(),
})
const textDataSchema = z.object({ text: z.string().optional() })

// Anesthesia: Pre-Assessment
const anesPreExistingSchema = z.object({
  cvs: z.string().optional(),
  renal: z.string().optional(),
  respiration: z.string().optional(),
  hepatic: z.string().optional(),
  diabetic: z.string().optional(),
  git: z.string().optional(),
  neurology: z.string().optional(),
  anesthesiaHistory: z.string().optional(),
  eventful: z.string().optional(),
}).partial()
const anesPrePhysicalSchema = z.object({
  bp: z.string().optional(),
  pulse: z.string().optional(),
  temp: z.string().optional(),
  rr: z.string().optional(),
  cvs: z.string().optional(),
  chest: z.string().optional(),
  teeth: z.string().optional(),
  mallampatiClass: z.string().optional(),
  asaClass: z.string().optional(),
}).partial()
const anesPrePlanSchema = z.object({
  general: z.string().optional(),
  spinal: z.string().optional(),
  local: z.string().optional(),
  monitoringCare: z.string().optional(),
  npo: z.string().optional(),
  fluidsBlood: z.string().optional(),
  preAnesthesiaMedication: z.string().optional(),
}).partial()
const anesPreChecklistSchema = z.object({
  patientIdentified: z.coerce.boolean().optional(),
  consentRevised: z.coerce.boolean().optional(),
  siteChecked: z.coerce.boolean().optional(),
}).partial()
const anesPreInductionSchema = z.object({
  orientation: z.string().optional(),
  bp: z.string().optional(),
  pulse: z.string().optional(),
  temp: z.string().optional(),
  spo2: z.string().optional(),
}).partial()
const anesPlanChangeSchema = z.object({
  changed: z.coerce.boolean().optional(),
  general: z.string().optional(),
  spinal: z.string().optional(),
  local: z.string().optional(),
}).partial()
const anesPreDataSchema = z.object({
  existingProblems: anesPreExistingSchema.optional(),
  physicalExam: anesPrePhysicalSchema.optional(),
  plan: anesPrePlanSchema.optional(),
  checklist: anesPreChecklistSchema.optional(),
  preInduction: anesPreInductionSchema.optional(),
  planChange: anesPlanChangeSchema.optional(),
}).partial()

// Anesthesia: Intra (table rows + totals)
const anesIntraRowSchema = z.object({
  time: z.string(),
  pulse: z.string().optional(),
  bp: z.string().optional(),
  rr: z.string().optional(),
  spo2: z.string().optional(),
  drugs: z.string().optional(),
  ivFluidsBlood: z.string().optional(),
})
const anesIntraTotalsSchema = z.object({
  intakeFluidsBlood: z.string().optional(),
  bloodLoss: z.string().optional(),
  urineOutput: z.string().optional(),
  others: z.string().optional(),
}).partial()
const anesIntraDataSchema = z.object({
  rows: z.array(anesIntraRowSchema).default([]),
  totals: anesIntraTotalsSchema.optional(),
})

// Anesthesia: Recovery and Post-Recovery
const anesRecoveryDataSchema = z.object({
  loc: z.string().optional(),
  bp: z.string().optional(),
  pulse: z.string().optional(),
  rr: z.string().optional(),
  spo2: z.string().optional(),
  painStimulus: z.string().optional(),
}).partial()
const anesPostRecoveryDataSchema = z.object({
  bp: z.string().optional(),
  pulse: z.string().optional(),
  rr: z.string().optional(),
  spo2: z.string().optional(),
  pain: z.string().optional(),
  temp: z.string().optional(),
  aldreteScore: z.string().optional(),
  vomiting: z.string().optional(),
  shivering: z.string().optional(),
  siteBleedingHematoma: z.string().optional(),
}).partial()

// Anesthesia: Adverse Events
const anesAdverseDataSchema = z.object({
  anyEvent: z.coerce.boolean(),
  details: z.string().optional(),
}).partial()

// New Form Schemas
const consentFormDataSchema = z.object({
  guardianName: z.string().optional(),
  relation: z.string().optional(),
  cnic: z.string().optional(),
  contact: z.string().optional(),
  staffName: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
}).partial()

const infectionControlDataSchema = z.object({
  rows: z.array(z.object({
    id: z.number(),
    text: z.string(),
    gloves: z.boolean().optional(),
    mask: z.boolean().optional(),
    gown: z.boolean().optional(),
    cap: z.boolean().optional(),
    isolation: z.boolean().optional(),
  })).optional(),
  verifiedBy: z.string().optional(),
  date: z.string().optional(),
}).partial()

const bloodTransfusionDataSchema = z.object({
  bloodGroup: z.string().optional(),
  units: z.string().optional(),
  transfusionStartedAt: z.string().optional(),
  transfusionCompletedAt: z.string().optional(),
  observations: z.string().optional(),
  adverseReactions: z.string().optional(),
  nurseSign: z.string().optional(),
  doctorSign: z.string().optional(),
  date: z.string().optional(),
}).partial()

const operationConsentDataSchema = z.object({
  mrNumber: z.string().optional(),
  patientName: z.string().optional(),
  date: z.string().optional(),
  doctorName: z.string().optional(),
  sign: z.string().optional(),
  anesthesiaDate: z.string().optional(),
  anesthesiaTime: z.string().optional(),
  operationDate: z.string().optional(),
  operationTime: z.string().optional(),
  bloodDate: z.string().optional(),
  bloodTime: z.string().optional(),
}).partial()

const historyExamDataSchema = z.object({
  presentingComplaints: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  pastHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  personalHistory: z.string().optional(),
  allergies: z.string().optional(),
  generalExamination: z.string().optional(),
  systemicExamination: z.string().optional(),
  provisionalDiagnosis: z.string().optional(),
  planOfCare: z.string().optional(),
  examinedBy: z.string().optional(),
  date: z.string().optional(),
}).partial()

const surgicalSignInDataSchema = z.object({
  patientIdentity: z.boolean().optional(),
  procedureConfirmed: z.boolean().optional(),
  consentSigned: z.boolean().optional(),
  siteMarked: z.boolean().optional(),
  anesthesiaCheck: z.boolean().optional(),
  pulseOximeter: z.boolean().optional(),
  allergies: z.string().optional(),
  airwayRisk: z.string().optional(),
  bloodLossRisk: z.string().optional(),
  signedBy: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
}).partial()

const surgicalTimeOutDataSchema = z.object({
  teamIntroduced: z.boolean().optional(),
  patientIdentity: z.boolean().optional(),
  procedureConfirmed: z.boolean().optional(),
  siteConfirmed: z.boolean().optional(),
  antibioticsGiven: z.boolean().optional(),
  antibioticsTime: z.string().optional(),
  criticalSteps: z.string().optional(),
  bloodLossExpected: z.string().optional(),
  imagingDisplayed: z.boolean().optional(),
  signedBy: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
}).partial()

const surgicalSignOutDataSchema = z.object({
  procedureConfirmed: z.boolean().optional(),
  countsCorrect: z.boolean().optional(),
  specimenLabeled: z.boolean().optional(),
  equipmentProblems: z.string().optional(),
  postOpInstructions: z.string().optional(),
  recoveryPlan: z.string().optional(),
  signedBy: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
}).partial()

export const createIpdClinicalNoteSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('preop'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: preopDataSchema,
  }),
  z.object({
    type: z.literal('operation'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: operationDataSchema,
  }),
  z.object({
    type: z.literal('postop'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: textDataSchema,
  }),
  z.object({
    type: z.literal('consultant'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: textDataSchema,
  }),
  z.object({
    type: z.literal('anes-pre'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: anesPreDataSchema,
  }),
  z.object({
    type: z.literal('anes-intra'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: anesIntraDataSchema,
  }),
  z.object({
    type: z.literal('anes-recovery'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: anesRecoveryDataSchema,
  }),
  z.object({
    type: z.literal('anes-post-recovery'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: anesPostRecoveryDataSchema,
  }),
  z.object({
    type: z.literal('anes-adverse'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: anesAdverseDataSchema,
  }),
  // New Form Types
  z.object({
    type: z.literal('consent-form'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: consentFormDataSchema,
  }),
  z.object({
    type: z.literal('infection-control'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: infectionControlDataSchema,
  }),
  z.object({
    type: z.literal('blood-transfusion'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: bloodTransfusionDataSchema,
  }),
  z.object({
    type: z.literal('operation-consent'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: operationConsentDataSchema,
  }),
  z.object({
    type: z.literal('history-exam'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: historyExamDataSchema,
  }),
  z.object({
    type: z.literal('surgical-signin'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: surgicalSignInDataSchema,
  }),
  z.object({
    type: z.literal('surgical-timeout'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: surgicalTimeOutDataSchema,
  }),
  z.object({
    type: z.literal('surgical-signout'),
    recordedAt: z.coerce.date().optional(),
    createdBy: z.string().optional(),
    createdByRole: z.string().optional(),
    doctorName: z.string().optional(),
    sign: z.string().optional(),
    data: surgicalSignOutDataSchema,
  }),
])

export const updateIpdClinicalNoteSchema = z.object({
  type: clinicalNoteType.optional(),
  recordedAt: z.coerce.date().optional(),
  createdBy: z.string().optional(),
  createdByRole: z.string().optional(),
  doctorName: z.string().optional(),
  sign: z.string().optional(),
  data: z.any().optional(),
})
