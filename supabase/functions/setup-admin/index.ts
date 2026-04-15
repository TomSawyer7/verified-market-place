
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isCallerAdmin = (callerRoles || []).some((r: any) => r.role === "admin");
    if (!isCallerAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existingUser = users?.find((u: any) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user with a temporary password
      const tempPassword = crypto.randomUUID() + "!Aa1";
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name: "Admin", last_name: "User" },
      });
      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
    }

    // Ensure profile exists
    const { data: existingProfile } = await adminClient.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!existingProfile) {
      await adminClient.from("profiles").insert({ id: userId, first_name: "Admin", last_name: "User", status: "verified" });
    } else {
      await adminClient.from("profiles").update({ status: "verified" }).eq("id", userId);
    }

    // Ensure verification row exists
    const { data: existingVer } = await adminClient.from("verifications").select("id").eq("user_id", userId).maybeSingle();
    if (!existingVer) {
      await adminClient.from("verifications").insert({ user_id: userId, philsys_status: "verified", biometric_status: "verified" });
    }

    // Assign admin role (upsert)
    const { data: existingRole } = await adminClient.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!existingRole) {
      await adminClient.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    const isNew = !existingUser;
    return new Response(
      JSON.stringify({
        message: isNew
          ? `Admin account created for ${email}. A password reset email should be sent.`
          : `${email} has been promoted to admin.`,
        userId,
        isNew,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
