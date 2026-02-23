import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabInventoryItem } from '../models/InventoryItem'

function todayBounds(){
  const start = new Date()
  start.setHours(0,0,0,0)
  const end = new Date()
  end.setHours(23,59,59,999)
  return { start, end }
}

export async function summary(_req: Request, res: Response){
  const { start, end } = todayBounds()

  const [ordersToday, completedToday, pendingReports, inventory] = await Promise.all([
    LabOrder.find({ createdAt: { $gte: start, $lte: end } }).select('tests status returnedTests').lean(),
    LabOrder.countDocuments({ status: 'completed', updatedAt: { $gte: start, $lte: end } } as any),
    LabOrder.countDocuments({ status: 'received' }),
    LabInventoryItem.find({}).select('onHand minStock').lean(),
  ])

  const todaysTests = ordersToday.reduce((s:any,o:any)=> s + (Array.isArray(o.tests)? o.tests.length : 0), 0)
  const samplesReceived = ordersToday.length
  const lowReagents = inventory.reduce((s:any,it:any)=> s + ((it.minStock!=null && Number(it.onHand||0) <= Number(it.minStock)) ? 1 : 0), 0)
  const outOfStock = inventory.reduce((s:any,it:any)=> s + ((Number(it.onHand||0) <= 0) ? 1 : 0), 0)

  res.json({
    todaysTests,
    pendingReports,
    completedToday,
    samplesReceived,
    lowReagents,
    outOfStock,
    at: new Date().toISOString(),
  })
}
