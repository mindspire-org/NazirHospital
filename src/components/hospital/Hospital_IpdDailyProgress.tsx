import DailyProgressSheet from './Hospital_IpdDailyProgressSheet'

export default function DailyProgress({ encounterId }: { encounterId: string }){
  return (
    <DailyProgressSheet encounterId={encounterId} />
  )
}
