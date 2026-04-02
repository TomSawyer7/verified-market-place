import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with service role to bypass RLS
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find user by email via auth admin API
    const { data: users, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) {
      return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const targetUser = users.users.find((u: any) => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already admin
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (existingRole) {
      return new Response(JSON.stringify({ message: "User is already an admin" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert admin role
    const { error: insertErr } = await adminClient.from("user_roles").insert({
      user_id: targetUser.id,
      role: "admin",
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ message: `${email} is now an admin` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
