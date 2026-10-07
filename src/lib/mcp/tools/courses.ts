import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export const listCourses = defineTool({
  name: "list_courses",
  title: "List courses",
  description: "List Mass Communication courses, optionally filtered by level and semester.",
  inputSchema: {
    level: z.number().int().optional().describe("Level, e.g. 100."),
    semester: z.string().optional().describe("Semester, e.g. 'first' or 'second'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ level, semester }, ctx) => {
    let q = supabaseForUser(ctx).from("courses").select("id, code, title, level, semester, units").order("code");
    if (level !== undefined) q = q.eq("level", level);
    if (semester) q = q.eq("semester", semester);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const courses = (data ?? []).map((c) => ({
      id: String(c.id), code: String(c.code), title: String(c.title),
      level: Number(c.level), semester: String(c.semester), units: Number(c.units),
    }));
    return { content: [{ type: "text", text: JSON.stringify(courses) }], structuredContent: { courses } };
  },
});

export const getCourseOutline = defineTool({
  name: "get_course_outline",
  title: "Get course outline",
  description: "Get the 10-week outline for a course by its code (e.g. 'MCM 101').",
  inputSchema: { code: z.string().min(2).describe("Course code.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ code }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("courses").select("code, title, outline").ilike("code", code.trim()).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError(`No course found with code ${code}.`);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

export const listMyUnlocks = defineTool({
  name: "list_my_unlocked_courses",
  title: "List my unlocked courses",
  description: "List the courses the signed-in student has paid to unlock.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("course_unlocks").select("created_at, courses(code, title)").eq("user_id", ctx.getUserId()!);
    if (error) throw new ToolError(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
  },
});

export const listMyUploads = defineTool({
  name: "list_my_uploads",
  title: "List my uploads",
  description: "List assignments the signed-in student has uploaded.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("assignments").select("title, file_name, created_at, courses(code, title)")
      .eq("uploaded_by", ctx.getUserId()!).order("created_at", { ascending: false });
    if (error) throw new ToolError(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
  },
});
