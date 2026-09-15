export interface FaceItApiPlayer {
  player_id: string;
  nickname: string;
  player_stats: Record<string, string | undefined>;
}

export interface FaceItApiTeam {
  team_id: string;
  team_stats: Record<string, string | undefined>;
  players: FaceItApiPlayer[];
}

export interface FaceItApiRound {
  match_round: string;
  round_stats: Record<string, string | undefined>;
  teams: FaceItApiTeam[];
}

export interface FaceItApiResponse {
  rounds?: FaceItApiRound[];
}

export interface FaceItPlayerStats {
  player_id: string;
  stat_username: string;
  stat_kills: number;
  stat_deaths: number;
  stat_assists: number;
  stat_adr?: string;
  stat_kd?: string;
  stat_hsp?: string;
}

export interface FaceItTeamStats {
  team_id: string;
  team_name: string;
  score: number;
  players: FaceItPlayerStats[];
}

export interface FaceItMapStats {
  round: number;
  stats_map: string;
  score: string;
  teams: FaceItTeamStats[];
}

export interface FaceItMatchStatsResponse {
  round_count: number;
  rounds: FaceItMapStats[];
}

const toFaceItNumber = (value?: string): 
  number => {const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const normalizeFaceItStats = (data: FaceItApiResponse,): FaceItMatchStatsResponse => {
  const rounds = (data.rounds ?? []).map((round, roundIndex) => ({
    round: toFaceItNumber(round.match_round) || roundIndex + 1,
    stats_map: round.round_stats.Map ?? "Unknown Map",
    score: round.round_stats.Score ?? "",
    teams: (round.teams ?? []).map((team) => ({
      team_id: team.team_id,
      team_name: team.team_stats.Team ?? "Unknown Team",
      score: toFaceItNumber(team.team_stats["Final Score"]),
      players: (team.players ?? []).map((player) => ({
        player_id: player.player_id,
        stat_username: player.nickname,
        stat_kills: toFaceItNumber(player.player_stats.Kills),
        stat_deaths: toFaceItNumber(player.player_stats.Deaths),
        stat_assists: toFaceItNumber(player.player_stats.Assists),
        stat_adr: player.player_stats.ADR,
        stat_kd: player.player_stats["K/D Ratio"],
        stat_hsp: player.player_stats["Headshots %"],
      })),
    })),
  }));

  return {
    round_count: rounds.length,
    rounds,
  };
};
