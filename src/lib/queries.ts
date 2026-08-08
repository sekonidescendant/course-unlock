import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WeekEntry = { title: string; description: string };

export type Course = {
  id: string;
  code: string;
  title: string;
  level: number;
  semester: string;
  credit_units: number;
  outline: WeekEntry[];
};

export type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  uploader_name: string | null;
  file_name: string;
  created_at: string;
};

export const UNLOCK_PRICE_NAIRA = 1000;

export const coursesQuery = (level: number, semester: string) =>
  queryOptions({
    queryKey: ["courses", level, semester],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, level, semester, credit_units, outline")
        .eq("level", level)
        .eq("semester", semester)
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as Course[];
    },
  });

export const allCoursesQuery = () =>
  queryOptions({
    queryKey: ["courses", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, level, semester, credit_units, outline")
        .order("level")
        .order("semester")
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as Course[];
    },
  });

export const courseQuery = (id: string) =>
  queryOptions({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, level, semester, credit_units, outline")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Course) ?? null;
    },
  });

export const assignmentsQuery = (courseId: string) =>
  queryOptions({
    queryKey: ["assignments", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, course_id, title, description, uploader_name, file_name, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Assignment[];
    },
  });

export const unlockQuery = (courseId: string, userId: string | undefined) =>
  queryOptions({
    queryKey: ["unlock", courseId, userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_unlocks")
        .select("id")
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

export type CourseProgress = {
  id: string;
  course_id: string;
  completed_weeks: number[];
};

export const courseProgressQuery = (courseId: string, userId: string | undefined) =>
  queryOptions({
    queryKey: ["progress", courseId, userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("id, course_id, completed_weeks")
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as CourseProgress) ?? null;
    },
  });

// One row per course the student has touched — used to badge the browse/library cards
// without firing a separate request per course.
export const allProgressQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["progress", "all", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("id, course_id, completed_weeks");
      if (error) throw error;
      return (data ?? []) as unknown as CourseProgress[];
    },
  });
