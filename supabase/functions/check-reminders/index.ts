// Supabase Edge Function: check-reminders
// This function checks for due reminders and sends push notifications
// Called every minute by cron-job.org

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Send a push notification
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, unknown> },
  vapidDetails: { subject: string; publicKey: string; privateKey: string }
): Promise<boolean> {
  try {
    console.log('Sending push to:', subscription.endpoint)

    // Set VAPID details for this request
    webpush.setVapidDetails(
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    )

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )

    console.log('Push sent successfully')
    return true
  } catch (error: any) {
    console.error('Error sending push:', error)

    // If subscription is invalid (410 Gone), we should return false so the caller knows
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('Subscription expired or invalid')
    }

    return false
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('check-reminders function called')

    // Get environment variables
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@pensebete.app'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Check if required variables are present
    const missingVars = []
    if (!VAPID_PUBLIC_KEY) missingVars.push('VAPID_PUBLIC_KEY')
    if (!VAPID_PRIVATE_KEY) missingVars.push('VAPID_PRIVATE_KEY')
    if (!supabaseUrl) missingVars.push('SUPABASE_URL')
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')

    if (missingVars.length > 0) {
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`
      console.error(errorMsg)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const vapidDetails = {
      subject: VAPID_SUBJECT,
      publicKey: VAPID_PUBLIC_KEY!,
      privateKey: VAPID_PRIVATE_KEY!
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Get current time and window
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    const oneMinuteFromNow = new Date(now.getTime() + 60000)

    console.log('Checking reminders between', oneMinuteAgo.toISOString(), 'and', oneMinuteFromNow.toISOString())

    // Fetch due reminders that haven't been sent
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select(`
        id,
        user_id,
        reminder_time,
        is_sent,
        list_items (
          content
        )
      `)
      .eq('is_sent', false)
      .gte('reminder_time', oneMinuteAgo.toISOString())
      .lte('reminder_time', oneMinuteFromNow.toISOString())

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      return new Response(JSON.stringify({ error: remindersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Found', reminders?.length || 0, 'due reminders')

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: 'No due reminders', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let sentCount = 0

    // Process each reminder
    for (const reminder of reminders) {
      const itemContent = (reminder.list_items as any)?.content || 'Élément'

      console.log('Processing reminder for:', itemContent)

      // Get push subscriptions for this user
      const { data: subscriptions, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', reminder.user_id)

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError)
        continue
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscriptions for user', reminder.user_id)
        continue
      }

      console.log('Found', subscriptions.length, 'subscriptions for user')

      // Send push to each subscription
      for (const sub of subscriptions) {
        const success = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth
          },
          {
            title: `Pense-Bête`,
            body: `N'oubliez pas de faire : ${itemContent}`,
            data: { reminderId: reminder.id }
          },
          vapidDetails
        )

        if (success) {
          sentCount++
        }
      }

      // Mark reminder as sent
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ is_sent: true })
        .eq('id', reminder.id)

      if (updateError) {
        console.error('Error marking reminder as sent:', updateError)
      } else {
        console.log('Marked reminder', reminder.id, 'as sent')
      }
    }

    return new Response(JSON.stringify({
      message: 'Reminders processed',
      remindersChecked: reminders.length,
      notificationsSent: sentCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error in check-reminders:', error)
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
