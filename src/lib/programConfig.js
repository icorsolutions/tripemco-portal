// src/lib/programConfig.js
// Read/write the program_config key-value table.
import { supabase } from './supabase'

export async function getProgramConfig() {
  const { data, error } = await supabase.from('program_config').select('key, value')
  if (error) throw error
  const out = {}
  for (const row of data) out[row.key] = row.value
  return out
}

export async function updateProgramConfig(key, value) {
  const { error } = await supabase
    .from('program_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw error
}