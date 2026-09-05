import axios from "axios";
import { getAuth } from "firebase/auth";

// Use Vite's import.meta.env for environment variables in frontend
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.collegecounter.org/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Check if we're in development mode
const isDevelopment =
  API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1");

// Add an interceptor to attach the Firebase auth token to every request TODO: CHANGE THIS TO NOT PUT IT ON ALL REQUESTS
api.interceptors.request.use(
  async (config) => {
    // In development mode, use the dev token to bypass Firebase auth
    if (isDevelopment) {
      config.headers.Authorization = "Bearer dev";
      return config;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting auth token:", error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// API interfaces
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export interface Team {
  id: string;
  name: string;
  picture?: string;
  school_name?: string;
  elo: number;
  captain?: Player;
}

export interface Player {
  id: string;
  name: string;
  picture?: string;
  skill_level: number;
  steam_id?: string;
  faceit_id?: string;
  elo: number;
  team?: Team;
  benched: boolean;
  visible: boolean;
}

export interface Match {
  id: string;
  team1: Team;
  team2: Team;
  date: string;
  status: string;
  url?: string;
  winner?: Team;
  score_team1: number;
  score_team2: number;
  platform: string;
  season?: {
    id: string;
    name: string;
  };
  competition?: {
    id: string;
    name: string;
  };
  event_match?: EventMatch; // Optional, present if this match is part of an event
}

export interface EventMatch {
  id: string;
  event: {
    id: string;
    name: string;
  };
  round: number;
  num_in_bracket: number;
  is_bye: boolean;
  extra_info: Record<string, any>;
}

export interface ImportMatchesRequest {
  platform: "faceit" | "leaguespot" | "regentsleague";
  competition_name: string;
  season_id: string;
  data: any; // The raw API response data
  participant_matches?: Record<string, string>; // Map of participant_id to team_id
  event_id?: string; // For importing matches as event matches
  import_type?: "league" | "event"; // Type of import
}

export interface ImportMatchesResponse {
  message: string;
  matches_imported: number;
  matches_updated: number;
  matches_skipped: number;
  new_match_ids: string[];
  updated_match_ids: string[];
  skipped_match_ids: string[];
}

export interface Participant {
  id: string;
  team_id: string | null;
  team_name: string | null;
  competition_id: string | null;
  competition_name: string | null;
  season_id: string | null;
  season_name: string | null;
  faceit_id?: string;
  playfly_id?: string;
  playfly_participant_id?: string;
}

export interface ParticipantMatchRequest {
  participant_id: string;
  team_id: string;
}

export interface PublicSearchQueryParams {
  q: string;
  limit?: number;
}

export interface PublicSearchTeam {
  id: string;
  name: string;
  school_name?: string;
  picture?: string;
  elo: number;
}

export interface PublicSearchPlayer {
  id: string;
  name: string;
  picture?: string;
  elo: number;
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface PublicSearchEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  picture?: string;
  season?: {
    id: string;
    name: string;
  } | null;
  winner?: {
    id: string;
    name: string;
  } | null;
}

export interface PublicSearchResponse {
  query: string;
  limit: number;
  total_results: number;
  teams: PublicSearchTeam[];
  players: PublicSearchPlayer[];
  events: PublicSearchEvent[];
}

/*

ADMIN API FUNCTIONS

*/

// API client functions
export const fetchSeasons = async (): Promise<Season[]> => {
  const response = await api.get(`/seasons/`);
  return response.data;
};

export const fetchPublicSearch = async (
  params: PublicSearchQueryParams,
): Promise<PublicSearchResponse> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/search${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};
export const createSeason = async (
  name: string,
  start_date: string,
  end_date: string,
): Promise<Season> => {
  const response = await api.post(`/seasons/create/`, {
    name,
    start_date,
    end_date,
  });
  return response.data;
};

export interface CreateEventRequest {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  season_id?: string;
  picture?: string;
}

export interface CreateEventResponse {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  season_id?: string;
  picture?: string;
}

export const createEvent = async (
  data: CreateEventRequest,
): Promise<CreateEventResponse> => {
  const response = await api.post(`/events/create/`, data);
  return response.data;
};

export const importMatches = async (
  request: ImportMatchesRequest,
): Promise<ImportMatchesResponse> => {
  const response = await api.post(`/import-matches/`, request);
  return response.data;
};

// Database viewer API functions
export const fetchAllTeams = async (): Promise<Team[]> => {
  const response = await api.get(`/teams/`);
  return response.data;
};

export const fetchAllPlayers = async (): Promise<Player[]> => {
  const response = await api.get(`/players/`);
  return response.data;
};

export const fetchAllMatches = async (): Promise<Match[]> => {
  const response = await api.get(`/matches/`);
  return response.data;
};

// Participant matching API functions
export const fetchParticipants = async (): Promise<{
  participants: Participant[];
  teams: Team[];
}> => {
  const response = await api.get(`/participants/`);
  return response.data;
};

export const matchParticipant = async (
  request: ParticipantMatchRequest,
): Promise<{ message: string; participant: Participant }> => {
  const response = await api.post(`/participants/`, request);
  return response.data;
};

// Database clearing API function
export const clearDatabase = async (
  securityKey: string,
): Promise<{ message: string }> => {
  const response = await api.post(`/clear-database/`, {
    security_key: securityKey,
  });
  return response.data;
};

// Competition management functions
export interface Competition {
  id: string;
  name: string;
  participants_count: number;
  matches_count: number;
  teams_count: number;
}

export interface CompetitionsResponse {
  competitions: Competition[];
  total_competitions: number;
}

export interface DeleteCompetitionResponse {
  message: string;
  competition_name: string;
  competition_id: string;
  deleted_data: {
    participants: number;
    matches: number;
    events: number;
    event_matches: number;
    competition: number;
  };
  total_records_deleted: number;
}

export const listCompetitions = async (): Promise<CompetitionsResponse> => {
  const response = await api.get(`/competitions/`);
  return response.data;
};

export interface CreateCompetitionRequest {
  name: string;
}

export interface CreateCompetitionResponse {
  message: string;
  competition: Competition;
}

export const createCompetition = async (
  data: CreateCompetitionRequest,
): Promise<CreateCompetitionResponse> => {
  const response = await api.post(`/competitions/create/`, data);
  return response.data;
};

export const deleteCompetition = async (
  competitionId: string,
  securityKey: string,
): Promise<DeleteCompetitionResponse> => {
  const response = await api.delete(`/competitions/${competitionId}/`, {
    data: {
      security_key: securityKey,
    },
  });
  return response.data;
};

// Player ELO management functions
export interface PlayerEloResponse {
  message: string;
  updated_players: number;
  not_found?: number;
}

export interface TeamEloResponse {
  message: string;
  updated_teams: number;
  teams_without_enough_players?: number;
  only_default_elo?: boolean;
  default_elo_value?: number;
  total_teams_processed?: number;
}

export interface RecalculateEloResponse {
  message: string;
  summary: {
    total_matches: number;
    processed_count: number;
    error_count: number;
    reset_to_default: boolean;
    default_elo?: number;
  };
  elo_changes: Array<{
    match_id: string;
    date: string | null;
    team1: string;
    team2: string;
    winner: string;
    team1_elo_change: string;
    team2_elo_change: string;
  }>;
  total_elo_changes: number;
}

export interface UpdateMatchesResponse {
  message: string;
  updated_count: number;
  error_count: number;
  total_processed: number;
  results: Array<{
    match_id: string;
    status: "updated" | "no_changes" | "error";
    new_status?: string;
    new_date?: string;
    error?: string;
  }>;
}

export interface RankingSnapshotResponse {
  success: boolean;
  ranking_id: string;
  season_name: string;
  teams_ranked: number;
  snapshot_date: string;
  message: string;
}

export const updatePlayerElo = async (
  apiKey?: string,
): Promise<PlayerEloResponse> => {
  const response = await api.post(`/player-elo/update/`, {
    api_key: apiKey,
  });
  return response.data;
};

export const resetPlayerElo = async (
  defaultElo: number = 1000,
  defaultSkillLevel: number = 1,
): Promise<PlayerEloResponse> => {
  const response = await api.post(`/player-elo/reset/`, {
    default_elo: defaultElo,
    default_skill_level: defaultSkillLevel,
  });
  return response.data;
};

export const calculateTeamElos = async (
  options: {
    only_default_elo?: boolean;
    default_elo?: number;
  } = {},
): Promise<TeamEloResponse> => {
  const response = await api.post(`/team-elo/calculate/`, {
    only_default_elo: options.only_default_elo || false,
    default_elo: options.default_elo || 1000,
  });
  return response.data;
};

export const recalculateAllElos = async (
  options: {
    reset_to_default?: boolean;
    default_elo?: number;
  } = {},
): Promise<RecalculateEloResponse> => {
  const response = await api.post(`/team-elo/recalculate/`, {
    reset_to_default:
      options.reset_to_default !== undefined ? options.reset_to_default : true,
    default_elo: options.default_elo || 1000,
  });
  return response.data;
};

export const updateMatches = async (
  options: {
    match_ids?: string[];
    platform?: "faceit" | "leaguespot";
    status_filter?: "scheduled" | "in_progress" | "completed" | "";
    auto_detect?: boolean;
  } = {},
): Promise<UpdateMatchesResponse> => {
  const response = await api.post(`/matches/update/`, {
    match_ids: options.match_ids || [],
    platform: options.platform || "",
    status_filter: options.status_filter || "",
    auto_detect: options.auto_detect !== undefined ? options.auto_detect : true,
  });
  return response.data;
};

export const createRankingSnapshot = async (
  options: {
    season_id?: string;
  } = {},
): Promise<RankingSnapshotResponse> => {
  const response = await api.post(`/rankings/snapshot/`, {
    season_id: options.season_id || "",
  });
  return response.data;
};

// fetch data from Faceit API
export const fetchFaceitMatches = async (eventId: string): Promise<any> => {
  const limit = 100;
  let offset = 0;
  let allItems: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const FACEIT_API_KEY = "12bf8e56-3e9d-4f80-8c0a-09cacbe319bd";
    if (!FACEIT_API_KEY) {
      throw new Error("FACEIT API key is not set in environment variables");
    }
    const response = await axios.get(
      `https://open.faceit.com/data/v4/championships/${eventId}/matches`,
      {
        headers: {
          Authorization: `Bearer ${FACEIT_API_KEY}`,
        },
        params: {
          offset,
          limit,
        },
      },
    );
    const data = response.data;
    const items = data.items || [];
    allItems = allItems.concat(items);

    if (items.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return {
    ...((allItems.length && { items: allItems }) || { items: [] }),
  };
};

// Function to fetch data from Playfly API
export const fetchPlayflyMatches = async (eventId: string): Promise<any> => {
  // Implement based on Playfly API documentation
  // This is a placeholder
  const response = await axios.get(
    `https://api.playfly.com/events/${eventId}/matches`,
  );
  return response.data;
};

export const fetchRegentsLeagueMatches = async (
  division: string,
): Promise<any> => {
  const response = await axios.get(
    `https://regent-league-api.poopdealer.lol/cc/matches?div=${division}`,
  );
  return response.data;
};

// LeagueSpot API interfaces
export interface LeagueSpotSeason {
  id: string;
  currentStageId: string;
  name: string;
  state: number;
  [key: string]: any;
}

export interface LeagueSpotStage {
  id: string;
  name: string;
  currentRoundId: string;
  participants: any[];
  rounds: any[];
  [key: string]: any;
}

export interface LeagueSpotMatch {
  id: string;
  participants: any[];
  startTimeUtc: string;
  currentState: number;
  [key: string]: any;
}

export interface LeagueSpotParticipant {
  participantId: string;
  teamId: string;
  name: string;
  users: any[];
  [key: string]: any;
}

// LeagueSpot API functions for reverse engineering Playfly matches
// Using backend proxy to avoid CORS issues
export const fetchLeagueSpotSeason = async (
  seasonId: string,
): Promise<LeagueSpotSeason> => {
  const response = await api.get(`/proxy/leaguespot/seasons/${seasonId}/`);
  return response.data;
};

export const fetchLeagueSpotStage = async (
  stageId: string,
): Promise<LeagueSpotStage> => {
  const response = await api.get(`/proxy/leaguespot/stages/${stageId}/`);
  return response.data;
};

export const fetchLeagueSpotRoundMatches = async (
  roundId: string,
): Promise<LeagueSpotMatch[]> => {
  const response = await api.get(
    `/proxy/leaguespot/rounds/${roundId}/matches/`,
  );
  return response.data;
};

export const fetchLeagueSpotMatch = async (
  matchId: string,
): Promise<LeagueSpotMatch> => {
  const response = await api.get(`/proxy/leaguespot/matches/${matchId}/`);
  return response.data;
};

export const fetchLeagueSpotParticipants = async (
  matchId: string,
): Promise<LeagueSpotParticipant[]> => {
  const response = await api.get(
    `/proxy/leaguespot/matches/${matchId}/participants/`,
  );
  return response.data;
};

/*

CLIENT API FUNCTIONS

*/

// Public API interfaces
export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  results: T[];
}

export interface PublicTeam {
  id: string;
  name: string;
  picture?: string;
  school_name?: string;
  elo: number;
  captain?: {
    id: string;
    name: string;
    picture?: string;
  };
  current_competitions?: Array<{
    id: string;
    name: string;
  }>;
  current_ranking?: {
    id: string;
    rank: number;
    elo: number;
    ranking: {
      id: string;
      date: string;
    };
    season: {
      id: string;
      name: string;
    };
  };
}

export interface PublicPlayer {
  id: string;
  name: string;
  picture?: string;
  skill_level: number;
  steam_id?: string;
  faceit_id?: string;
  elo: number;
  team?: {
    id: string;
    name: string;
    picture?: string;
  };
  benched: boolean;
  visible: boolean;
}

export interface PublicMatch {
  id: string;
  team1: {
    id: string;
    name: string;
    picture?: string;
    elo: number;
  };
  team2: {
    id: string;
    name: string;
    picture?: string;
    elo: number;
  };
  date: string;
  status: string;
  url?: string;
  winner?: {
    id: string;
    name: string;
    picture?: string;
  };
  score_team1: number;
  score_team2: number;
  platform: string;
  competition?: {
    id: string;
    name: string;
  };
  season?: {
    id: string;
    name: string;
  };
  event_match?: EventMatch; // Optional, present if this match is part of an event
}

export interface PublicSeason {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface PublicRanking {
  id: string;
  date: string;
  season: {
    id: string;
    name: string;
  } | null;
}

export interface PublicRankingItem {
  id: string;
  rank: number;
  elo: number;
  team: {
    id: string;
    name: string;
    picture?: string;
    school_name?: string;
  };
  ranking: {
    id: string;
    date: string;
  };
}

// Public API query parameters
export interface TeamQueryParams {
  id?: string | string[];
  name?: string;
  school_name?: string;
  season_id?: string;
  competition_id?: string;
  event_id?: string;
  page?: number;
  page_size?: number;
  sort?: "name" | "school_name" | "elo";
  order?: "asc" | "desc";
}

export interface PlayerQueryParams {
  id?: string | string[];
  name?: string;
  team_id?: string;
  steam_id?: string;
  season_id?: string;
  faceit_id?: string;
  visible?: boolean;
  benched?: boolean;
  page?: number;
  page_size?: number;
  sort?: "name" | "elo" | "skill_level";
  order?: "asc" | "desc";
}

export interface MatchQueryParams {
  id?: string | string[];
  team_id?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  platform?: "faceit" | "playfly";
  date_from?: string;
  date_to?: string;
  season_id?: string;
  competition_name?: string;
  page?: number;
  page_size?: number;
  sort?: "date" | "status";
  order?: "asc" | "desc";
  event_id?: string;
}

export interface SeasonQueryParams {
  id?: string | string[];
  current?: boolean;
  page?: number;
  page_size?: number;
  sort?: "name" | "start_date" | "end_date";
  order?: "asc" | "desc";
}

export interface RankingQueryParams {
  season_id?: string;
  page?: number;
  page_size?: number;
  sort?: "date";
  order?: "asc" | "desc";
}

export interface RankingItemQueryParams {
  ranking_id: string;
  page?: number;
  page_size?: number;
  sort?: "rank" | "elo";
  order?: "asc" | "desc";
}

// Helper function to convert query params to URL search params
const convertToQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(","));
      } else if (typeof value === "boolean") {
        searchParams.append(key, value.toString());
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
};

// Public API client functions

/**
 * Fetch teams with optional filtering parameters
 *
 * @example
 * // Get teams that participated in a specific event
 * const teams = await fetchPublicTeams({ event_id: "event-uuid-here" });
 *
 * // Get teams from a specific school that participated in an event
 * const schoolTeams = await fetchPublicTeams({
 *   event_id: "event-uuid-here",
 *   school_name: "University of"
 * });
 *
 * @returns Teams with current ranking information (rank, elo from latest ranking snapshot)
 */
export const fetchPublicTeams = async (
  params: TeamQueryParams = {},
): Promise<PaginatedResponse<PublicTeam>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/teams${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

export const fetchPublicPlayers = async (
  params: PlayerQueryParams = {},
): Promise<PaginatedResponse<PublicPlayer>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/players${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

export const fetchPublicMatches = async (
  params: MatchQueryParams = {},
): Promise<PaginatedResponse<PublicMatch>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/matches${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

export const fetchPublicSeasons = async (
  params: SeasonQueryParams = {},
): Promise<PaginatedResponse<PublicSeason>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/seasons${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

export const fetchPublicRankings = async (
  params: RankingQueryParams = {},
): Promise<PaginatedResponse<PublicRanking>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/rankings${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

export const fetchPublicRankingItems = async (
  params: RankingItemQueryParams,
): Promise<PaginatedResponse<PublicRankingItem>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/ranking-items${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

// Legacy function - consider deprecating or updating to use public API
export const fetchTeams = async (): Promise<Team[]> => {
  const response = await api.get(`/teams/`);
  return response.data;
};

// Admin API Functions
export const fetchAdminTeams = async (): Promise<Team[]> => {
  const response = await api.get(`/teams/`);
  return response.data;
};

export const fetchAdminPlayers = async (): Promise<Player[]> => {
  const response = await api.get(`/players/`);
  return response.data;
};

export const fetchAdminMatches = async (): Promise<Match[]> => {
  const response = await api.get(`/matches/`);
  return response.data;
};

// Merge Teams API
export interface MergeTeamsRequest {
  primary_team_id: string;
  secondary_team_id: string;
}

export interface MergeTeamsResponse {
  message: string;
  primary_team: {
    id: string;
    name: string;
    player_count: number;
  };
  secondary_team: {
    id: string;
    name: string;
    player_count: number;
  };
  merged_data: {
    players_moved: number;
    participants_merged: number;
    matches_updated: number;
  };
}

export const mergeTeams = async (
  data: MergeTeamsRequest,
): Promise<MergeTeamsResponse> => {
  const response = await api.post(`/merge-teams/`, data);
  return response.data;
};

// Match management API interfaces
export interface CreateMatchRequest {
  team1_id: string;
  team2_id: string;
  date?: string; // ISO datetime string
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  url?: string;
  score_team1?: number;
  score_team2?: number;
  platform?: "faceit" | "playfly" | "regentsleague" | "other";
  season_id?: string;
  competition_id?: string;
  winner_id?: string; // Must be team1_id or team2_id
  // Event match specific fields
  event_id?: string; // If provided, creates an EventMatch
  round?: number; // Required if event_id is provided
  num_in_bracket?: number; // Required if event_id is provided
  is_bye?: boolean; // Optional, defaults to false
  extra_info?: Record<string, any>; // Optional, extra information for event matches
}

export interface CreateEventMatchRequest {
  team1_id: string;
  team2_id: string;
  event_id: string;
  round: number;
  num_in_bracket: number;
  date?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  url?: string;
  score_team1?: number;
  score_team2?: number;
  platform?: "faceit" | "playfly" | "regentsleague" | "other";
  season_id?: string;
  competition_id?: string;
  winner_id?: string;
  is_bye?: boolean;
  extra_info?: Record<string, any>;
}

export interface UpdateMatchRequest {
  team1_id?: string; // Required for PUT, optional for PATCH
  team2_id?: string; // Required for PUT, optional for PATCH
  date?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  url?: string;
  score_team1?: number;
  score_team2?: number;
  platform?: "faceit" | "playfly" | "regentsleague" | "other";
  season_id?: string;
  competition_id?: string;
  winner_id?: string;
}

export interface DeleteMatchRequest {
  security_key?: string; // Optional security key for extra protection
}

export interface CreateMatchResponse {
  id: string;
  team1: {
    id: string;
    name: string;
    picture?: string;
  };
  team2: {
    id: string;
    name: string;
    picture?: string;
  };
  date: string | null;
  status: string;
  url?: string;
  winner?: {
    id: string;
    name: string;
  };
  score_team1: number;
  score_team2: number;
  platform: string;
  season?: {
    id: string;
    name: string;
  };
  competition?: {
    id: string;
    name: string;
  };
}

export interface DeleteMatchResponse {
  message: string;
  deleted_match: {
    id: string;
    team1_name: string;
    team2_name: string;
    date: string | null;
    status: string;
  };
}

export interface ApplyMatchEloResponse {
  message: string;
  match_id: string;
  team1: {
    id: string;
    name: string;
    old_elo: number;
    new_elo: number;
  };
  team2: {
    id: string;
    name: string;
    old_elo: number;
    new_elo: number;
  };
  winner_id: string;
}

// Match management API functions
export const createMatch = async (
  data: CreateMatchRequest,
): Promise<CreateMatchResponse> => {
  const response = await api.post("/admin/matches", data);
  return response.data;
};

export const createEventMatch = async (
  data: CreateEventMatchRequest,
): Promise<CreateMatchResponse> => {
  const response = await api.post("/event-matches/create/", data);
  return response.data;
};

export interface UpdateEventMatchRequest {
  team1_id?: string;
  team2_id?: string;
  event_id?: string;
  round?: number;
  num_in_bracket?: number;
  date?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  url?: string;
  score_team1?: number;
  score_team2?: number;
  platform?: "faceit" | "playfly" | "regentsleague" | "other";
  season_id?: string;
  competition_id?: string;
  winner_id?: string;
  is_bye?: boolean;
  extra_info?: Record<string, any>;
}

export const updateEventMatch = async (
  matchId: string,
  data: UpdateEventMatchRequest,
  method: "PUT" | "PATCH" = "PATCH",
): Promise<CreateMatchResponse> => {
  const response = await api({
    method: method.toLowerCase(),
    url: `/event-matches/${matchId}/update/`,
    data,
  });
  return response.data;
};

// Fetch all events for admin use (includes both regular events and custom events)
export const fetchAllEvents = async (): Promise<PublicEvent[]> => {
  const response = await fetchPublicEvents({ page_size: 100 }); // Get a large page size
  return response.results;
};

export const updateMatch = async (
  matchId: string,
  data: UpdateMatchRequest,
  method: "PUT" | "PATCH" = "PATCH",
): Promise<CreateMatchResponse> => {
  const response = await api({
    method: method.toLowerCase(),
    url: `/matches/${matchId}/update/`,
    data,
  });
  return response.data;
};

export const deleteMatch = async (
  matchId: string,
  data?: DeleteMatchRequest,
): Promise<DeleteMatchResponse> => {
  const response = await api.delete(`/matches/${matchId}/delete/`, {
    data: data || {},
  });
  return response.data;
};

export const applyMatchElo = async (
  matchId: string,
): Promise<ApplyMatchEloResponse> => {
  const response = await api.post(`/matches/${matchId}/apply-elo/`);
  return response.data;
};

export interface PublicTeamRankingRequest {
  season_id?: string;
  team_id?: string;
}

export interface PublicTeamRankingResponse {
  id: string;
  rank: number;
  elo: number;
  team: {
    id: string;
    name: string;
    picture?: string;
    school_name?: string;
  };
  ranking: {
    id: string;
    date: string;
  };
  season?: {
    id: string;
    name: string;
  } | null;
}

export const fetchPublicTeamRanking = async (
  params: PublicTeamRankingRequest,
): Promise<PublicTeamRankingResponse> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/team-current-ranking${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

// Events API

export interface PublicEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  picture?: string;
  winner?: {
    id: string;
    name: string;
    picture?: string;
    school_name?: string;
  };
  season?: {
    id: string;
    name: string;
  };
  custom_details?: {
    id: string;
    bracket_link?: string;
    stream_link?: string;
    secondary_stream_link?: string;
    discord_link?: string;
    registration_link?: string;
    rules_document?: string;
    prize_pool?: string;
    prize_currency: string;
    max_teams?: number;
    entry_fee?: string;
    format?: string;
    game_mode?: string;
    division?: string;
    is_featured: boolean;
    is_trophycase: boolean;
    is_public: boolean;
    registration_open: boolean;
    registration_deadline?: string;
    twitter_hashtag?: string;
    metadata: Record<string, any>;
  };
}

export interface EventQueryParams {
  id?: string | string[];
  name?: string;
  season_id?: string;
  winner_id?: string;
  featured?: boolean;
  trophycase?: boolean;
  public_only?: boolean;
  page?: number;
  page_size?: number;
  sort?: "name" | "start_date" | "end_date";
  order?: "asc" | "desc";
}

// Public Events API
export const fetchPublicEvents = async (
  params: EventQueryParams = {},
): Promise<PaginatedResponse<PublicEvent>> => {
  const queryString = convertToQueryString(params);
  const response = await api.get(
    `/public/events${queryString ? `?${queryString}` : ""}`,
  );
  return response.data;
};

export const fetchPublicEvent = async (id: string): Promise<PublicEvent> => {
  const response = await api.get(`/public/events/${id}`);
  return response.data;
};

// Admin Custom Events API

export interface CustomEvent {
  id: string;
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    description?: string;
    picture?: string;
    winner?: {
      id: string;
      name: string;
    };
  };
  bracket_link?: string;
  stream_link?: string;
  secondary_stream_link?: string;
  discord_link?: string;
  registration_link?: string;
  rules_document?: string;
  prize_pool?: string;
  prize_currency: string;
  max_teams?: number;
  entry_fee?: string;
  format?: string;
  game_mode?: string;
  division?: string;
  is_featured: boolean;
  is_trophycase: boolean; 
  is_public: boolean;
  registration_open: boolean;
  registration_deadline?: string;
  twitter_hashtag?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomEventCreateRequest {
  event_id?: string; // If extending existing event
  name?: string; // For new events
  start_date?: string;
  end_date?: string;
  description?: string;
  picture?: string;
  winner_id?: string; // ID of the winning team
  bracket_link?: string;
  stream_link?: string;
  secondary_stream_link?: string;
  discord_link?: string;
  registration_link?: string;
  rules_document?: string;
  prize_pool?: number;
  prize_currency?: string;
  max_teams?: number;
  entry_fee?: number;
  format?: string;
  game_mode?: string;
  division?: string;
  is_featured?: boolean;
  is_trophycase: boolean; 
  is_public?: boolean;
  registration_open?: boolean;
  registration_deadline?: string;
  twitter_hashtag?: string;
  metadata?: Record<string, any>;
}

export interface CustomEventUpdateRequest
  extends Partial<CustomEventCreateRequest> {
  // All fields are optional for updates
}

export interface CustomEventsResponse {
  custom_events: CustomEvent[];
}

// Admin Custom Events API Functions
export const fetchAdminCustomEvents =
  async (): Promise<CustomEventsResponse> => {
    const response = await api.get("/custom-events/");
    return response.data;
  };

export const fetchAdminCustomEvent = async (
  id: string,
): Promise<CustomEvent> => {
  const response = await api.get(`/custom-events/${id}/`);
  return response.data;
};

export const createAdminCustomEvent = async (
  data: CustomEventCreateRequest,
): Promise<{ message: string; custom_event_id: string; event_id: string }> => {
  const response = await api.post("/custom-events/", data);
  return response.data;
};

export const updateAdminCustomEvent = async (
  id: string,
  data: CustomEventUpdateRequest,
): Promise<{ message: string }> => {
  const response = await api.put(`/custom-events/${id}/`, data);
  return response.data;
};

export const deleteAdminCustomEvent = async (
  id: string,
): Promise<{ message: string }> => {
  const response = await api.delete(`/custom-events/${id}/`);
  return response.data;
};

// NWES API Proxy
export interface NWESProxyParams {
  tournament_id?: string;
  [key: string]: any; // Allow any other query parameters
}

/**
 * Proxy request to NWES API. The API key is automatically added on the backend.
 *
 * @param params - Query parameters to send to NWES API (excluding api_key)
 * @returns Promise with the NWES API response
 */
export const proxyNWES = async (params: NWESProxyParams): Promise<any> => {
  const response = await api.get("/proxy/nwes/", { params });
  return response.data;
};
