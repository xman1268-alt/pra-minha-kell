import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PlaylistResponse, Game, InsertGame } from "../../../shared/schema";

export function usePlaylist(playlistId: string | null) {
  return useQuery<PlaylistResponse>({
    queryKey: ["playlist", playlistId],
    queryFn: () => apiRequest<PlaylistResponse>("GET", `/api/playlist/${playlistId}`),
    enabled: !!playlistId,
    staleTime: Infinity,
  });
}

export function useLeaderboard(playlistId: string | null) {
  return useQuery<Game[]>({
    queryKey: ["leaderboard", playlistId],
    queryFn: () => apiRequest<Game[]>("GET", `/api/games/leaderboard/${playlistId}`),
    enabled: !!playlistId,
  });
}

export function useSubmitGame() {
  const qc = useQueryClient();
  return useMutation<Game, Error, InsertGame>({
    mutationFn: (data) => apiRequest<Game>("POST", "/api/games", data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["leaderboard", variables.playlistId] });
    },
  });
}
