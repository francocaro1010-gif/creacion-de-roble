import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uipxwdtzhwcnodyecxgx.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zJdG6SshcpxCxXXsQej1AA_uC4U6czA'

export const supabase = createClient(supabaseUrl, supabaseKey)