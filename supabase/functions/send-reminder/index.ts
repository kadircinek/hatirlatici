// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Hello from Functions!")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Bugünün tarihini al
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Hatırlatmaları kontrol et
    const { data: reminders, error: reminderError } = await supabaseClient
      .from('reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('due_date', today.toISOString())

    if (reminderError) throw reminderError

    // Her hatırlatma için müşteri bilgilerini güncelle
    for (const reminder of reminders) {
      const { data: customer, error: customerError } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('id', reminder.customer_id)
        .single()

      if (customerError) throw customerError

      // Müşteri bilgilerini güncelle
      const updateData = {
        last_call: reminder.type === 'call' ? new Date().toISOString() : customer.last_call,
        last_visit: reminder.type === 'visit' ? new Date().toISOString() : customer.last_visit,
        next_call: reminder.type === 'call' ? 
          new Date(new Date().getTime() + customer.call_interval * 24 * 60 * 60 * 1000).toISOString() : 
          customer.next_call,
        next_visit: reminder.type === 'visit' ? 
          new Date(new Date().getTime() + customer.visit_interval * 24 * 60 * 60 * 1000).toISOString() : 
          customer.next_visit
      }

      const { error: updateError } = await supabaseClient
        .from('customers')
        .update(updateData)
        .eq('id', customer.id)

      if (updateError) throw updateError

      // Hatırlatma durumunu güncelle
      const { error: reminderUpdateError } = await supabaseClient
        .from('reminders')
        .update({ status: 'completed' })
        .eq('id', reminder.id)

      if (reminderUpdateError) throw reminderUpdateError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-reminder' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
