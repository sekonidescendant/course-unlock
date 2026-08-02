import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAssignmentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ assignmentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: assignment, error } = await context.supabase
      .from("assignments")
      .select("id, course_id, file_path, file_name")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (error || !assignment) throw new Error("Assignment not found");

    const { data: unlock } = await context.supabase
      .from("course_unlocks")
      .select("id")
      .eq("course_id", assignment.course_id)
      .maybeSingle();

    const isUploader = false;
    if (!unlock && !isUploader) {
      throw new Error("Unlock this course to download its assignments.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("assignments")
      .createSignedUrl(assignment.file_path, 60, { download: assignment.file_name });
    if (signError || !signed?.signedUrl) throw new Error("Could not prepare the download.");

    return { url: signed.signedUrl };
  });
