import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://bjvcpbxlngredtebwasd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdmNwYnhsbmdyZWR0ZWJ3YXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDk5MjUsImV4cCI6MjA5MTIyNTkyNX0.yxI4vuFsw8Oh3qkBCITuNr3c14dn5cuEfJqpggvaE_U'
)
