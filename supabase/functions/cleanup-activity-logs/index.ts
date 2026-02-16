import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error, count } = await supabase
      .from('activity_logs')
      .delete({ count: 'exact' })
      .lt('created_at', sevenDaysAgo.toISOString());

    if (error) {
      console.error('Error deleting old activity logs:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to clean activity logs'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const deletedCount = count || 0;

    console.log(`Successfully deleted ${deletedCount} activity logs older than 7 days`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} activity logs older than 7 days`,
        cleanupDate: sevenDaysAgo.toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Unexpected error during cleanup',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
