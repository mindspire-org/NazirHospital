import { Request, Response } from 'express'

// Aesthetic does not maintain POS/Sales. Provide no-op endpoints so the UI can render.
export async function list(_req: Request, res: Response){
  res.json({ items: [], total: 0, page: 1, totalPages: 1 })
}

export async function summary(_req: Request, res: Response){
  res.json({ totalAmount: 0, totalProfit: 0, count: 0 })
}
