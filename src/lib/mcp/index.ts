import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { listCourses, getCourseOutline, listMyUnlocks, listMyUploads } from "./tools/courses";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "course-unlock",
  title: "Course Unlock",
  version: "0.1.0",
  instructions:
    "Tools for Course Correct, a FUOYE Mass Communication study platform. Browse courses and outlines, and see the signed-in student's unlocked courses and uploads.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCourses, getCourseOutline, listMyUnlocks, listMyUploads],
});
