import type { Patient } from '../types'

/** 病人基本資料卡:床邊快速確認身分用,字體加大 */
export default function PatientCard({ patient }: { patient: Patient }) {
  return (
    <div className="patient-card" aria-label="病人基本資料">
      <div className="patient-card-name-row">
        <span className="patient-card-name">{patient.name}</span>
        <span className="patient-card-meta">
          {patient.gender}・{patient.age} 歲
        </span>
      </div>
      <div className="patient-card-detail-row">
        <span>
          病歷號 <strong>{patient.chartNo}</strong>
        </span>
        <span>
          床號 <strong>{patient.bed}</strong>
        </span>
      </div>
    </div>
  )
}
