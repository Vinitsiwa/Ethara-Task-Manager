import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const qk = {
  profile: ["profile"] as const,
  workspaces: ["workspaces"] as const,
  workspace: (id: number) => ["workspace", id] as const,
  collaborators: (id: number) => ["collaborators", id] as const,
  workItems: ["workItems"] as const,
  overview: ["overview"] as const,
  users: ["users"] as const,
};
