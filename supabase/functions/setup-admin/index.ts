import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create admin user
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@aipippip.com",
      password: "babyKEN99@",
      email_confirm: true,
    });

    if (createError && !createError.message.includes("already been registered")) {
      throw createError;
    }

    // Get user id
    let userId = user?.user?.id;
    if (!userId) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = users?.users?.find((u: any) => u.email === "admin@aipippip.com");
      userId = adminUser?.id;
    }

    if (!userId) throw new Error("Could not find user");

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    if (roleError) throw roleError;

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
