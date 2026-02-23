import { z } from 'zod'

export const patientFindOrCreateSchema = z.object({
  fullName: z.string().min(1),
  guardianName: z.string().optional(),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  age: z.string().optional(),
  guardianRel: z.string().optional(),
  // If multiple name+guardian matches are returned, client can send a selection
  selectId: z.string().optional(),
  // Explicitly create a new patient even if phone matches exist (client must opt-in)
  forceCreate: z.boolean().optional(),
})
