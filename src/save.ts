import { type GameServices, getServices, type SaveStore } from '@mg/core'
import { SAVE_VERSION } from './logic/config'
import { initialSave, migrateSave } from './logic/saveData'
import type { SaveData } from './logic/types'

export function progressSave(services: GameServices = getServices()): SaveStore<SaveData> {
  return services.createSave<SaveData>({
    name: 'progress',
    version: SAVE_VERSION,
    initial: initialSave,
    migrate: migrateSave,
  })
}

export function hasProgress(save: SaveData): boolean {
  return save.producers.length > 0 || save.totalEarned > 0 || save.served > 0
}
