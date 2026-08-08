import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { redirect: search.redirect } });
  },
});
