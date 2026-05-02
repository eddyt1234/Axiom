import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://xnesddhqikajefyptiit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZXNkZGhxaWthamVmeXB0aWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MzY0NDAsImV4cCI6MjA5MzIxMjQ0MH0.eKSaueMd-HobiW8IMQc-xei09IyL8EGFhFbcrXkFeAE'
)