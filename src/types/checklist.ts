export type ChecklistStatus = 'PENDING' | 'IN_PROGRESS' | 'GO' | 'NO_GO';

export type ChecklistCategory = 
  | 'POWER' 
  | 'AVIONICS' 
  | 'RF_COMMS' 
  | 'RECOVERY' 
  | 'GROUND_STATION' 
  | 'RANGE_SAFETY';

export interface ChecklistItem {
  id: string;
  title: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  description: string;
  responsible: string;
  telemetryParam?: 'battery' | 'rssi' | 'altitude' | 'gyro' | 'gps' | 'rate' | 'temperature' | 'humidity';
  nominalCriteria: string;
  lastUpdated?: string;
}
