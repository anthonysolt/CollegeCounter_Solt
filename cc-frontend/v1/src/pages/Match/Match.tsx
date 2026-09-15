import { CompetitionLabel } from "@/components/CompetitionLabel";
import { CountdownTimer } from "@/components/CountdownTimer";
import Logo from "@/components/Logo";
import { PlayerStatsTable } from "@/components/PlayerStatsTable";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PublicMatch } from "@/services/api";
import { fetchFaceItStats, proxyNWES } from "@/services/api";
import { calculateMatchStars } from "@/services/elo";
import { usePublicMatches, usePublicTeams } from "@/services/hooks";
import { Star } from "lucide-react";
import { NavLink, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FaceItStatsTable } from "@/components/FaceItStatsTable";
import { useState } from "react";

import ancientImage from "@/assets/cs2_maps/Ancient.jpg";
import anubisImage from "@/assets/cs2_maps/Anubis.webp";
import cacheImage from "@/assets/cs2_maps/cache.png";
import dust2Image from "@/assets/cs2_maps/Dust II.jpg";
import infernoImage from "@/assets/cs2_maps/Inferno.jpg";
import mirageImage from "@/assets/cs2_maps/Mirage.jpg";
import nukeImage from "@/assets/cs2_maps/Nuke.jpeg";
import overpassImage from "@/assets/cs2_maps/Overpass.webp";
import trainImage from "@/assets/cs2_maps/Train.png";

const FACEIT_MAP_IMAGES: Record<string, string> = {
  ancient: ancientImage,
  anubis: anubisImage,
  cache: cacheImage,
  dust2: dust2Image,
  inferno: infernoImage,
  mirage: mirageImage,
  nuke: nukeImage,
  overpass: overpassImage,
  train: trainImage,
};

const FACEIT_MAP_NAMES: Record<string, string> = {
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_cache: "Cache",
  de_dust2: "Dust II",
  de_inferno: "Inferno",
  de_mirage: "Mirage",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_train: "Train",
};

const getFaceItMapImage = (mapName: string): string | undefined =>
  FACEIT_MAP_IMAGES[mapName.toLowerCase().replace(/^de_/, "")];

export function Match() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = usePublicMatches({ id });

  const match = data?.results[0];

  const {
    data: team1,
    isLoading: team1Loading,
    error: team1Error,
  } = usePublicTeams({ id: match?.team1.id });
  const {
    data: team2,
    isLoading: team2Loading,
    error: team2Error,
  } = usePublicTeams({ id: match?.team2.id });

  const matchDate = match?.date ? new Date(match.date) : null;

  const stars = calculateMatchStars(
    match?.team1.elo || 1000,
    match?.team2.elo || 1000,
  );

  if (isLoading || team1Loading || team2Loading || !data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error || team1Error || team2Error || !match) {
    return (
      <div className="mt-4">
        <Alert variant="destructive" className="mt-4">
          <AlertTitle className="text-lg">Error</AlertTitle>
          <AlertDescription>
            There was an error loading the team. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="app-container flex justify-center">
      <div className="mx-4 w-full max-w-[800px]">
        <div className="relative mb-4 overflow-hidden rounded-2xl border-2 p-4">
          {/* Gradient overlay for completed matches */}
          {match.status === "completed" && (
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-15"
              style={{
                background:
                  match.score_team1 > match.score_team2
                    ? "linear-gradient(to right, rgb(34, 197, 94) 0%, transparent 43%, transparent 57%, rgb(239, 68, 68) 100%)"
                    : "linear-gradient(to right, rgb(239, 68, 68) 0%, transparent 35%, transparent 65%, rgb(34, 197, 94) 100%)",
              }}
            />
          )}
          <div className="flex items-center justify-between">
            <NavLink to={`/teams/${match.team1.id}`}>
              <span className="flex flex-col items-center justify-center space-x-4">
                <Logo
                  src={match.team1.picture}
                  className="h-32 w-32 rounded-md"
                  alt="Team"
                  type="team"
                />
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2 mt-1 text-sm">
                    #{team1?.results[0]?.current_ranking?.rank}
                  </span>
                  <h2
                    className={`text-center text-xl ${match.score_team1 < match.score_team2 ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {match.team1.name}
                  </h2>
                </div>
              </span>
            </NavLink>
            <div className="hidden sm:block">
              {Scoreboard(match, stars, matchDate)}
            </div>
            <NavLink to={`/teams/${match.team2.id}`}>
              <span className="ml-4 flex flex-col items-center justify-center space-x-4">
                <Logo
                  src={match.team2.picture}
                  className="h-32 w-32 rounded-md"
                  alt="Team"
                  type="team"
                />
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2 mt-1 text-sm">
                    #{team2?.results[0]?.current_ranking?.rank}
                  </span>
                  <h2
                    className={`overflow-hidden text-center text-xl ${match.score_team2 < match.score_team1 ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {match.team2.name}
                  </h2>
                </div>
              </span>
            </NavLink>
          </div>

          <div className="block sm:hidden">
            {Scoreboard(match, stars, matchDate)}
          </div>
        </div>
        <div className="mt-4">
          <div className="hidden justify-between sm:flex">
            {match.status === "scheduled" && (
              <div className="inline w-40">
                <CountdownTimer targetDate={new Date(match.date)} size="sm" />
              </div>
            )}
            {match.url && (
              <div className="w-full flex justify-center">
                <a
                  href={
                    match.url.includes("{lang}")
                      ? match.url.replace("{lang}", navigator.language || "en")
                      : match.url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="cursor-pointer">
                    View Match on Original Platform -{">"}
                  </Button>
                </a>
              </div>
            )}
          </div>
          <div className="block sm:hidden">{MatchInfo(match, stars)}</div>
        </div>
        {match.url && (
          <div className="mt-4 flex w-full justify-center text-right sm:hidden">
            <a
              href={
                match.url.includes("{lang}")
                  ? match.url.replace("{lang}", navigator.language || "en")
                  : match.url
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="cursor-pointer">
                View Match on Original Platform -{">"}
              </Button>
            </a>
          </div>
        )}
        <div className="mt-4">
          <div className="flex w-full items-center justify-center rounded-2xl border-2 p-2 lg:col-span-3">
            <Stats match={match} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchInfo(match: PublicMatch, stars: number) {
  return (
    <div className="flex flex-col items-center justify-center text-base">
      {match.status === "scheduled" && (
        <>
          <div className="text-lg font-semibold">
            {new Date(match.date).toLocaleString(
              typeof navigator !== "undefined" ? navigator.language : "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </div>
          <div className="text-xl font-bold">
            {new Date(match.date).toLocaleString(
              typeof navigator !== "undefined" ? navigator.language : "en-US",
              {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              },
            )}
          </div>
        </>
      )}
      {match.competition && (
        <CompetitionLabel competition={match.competition?.name} h={12} />
      )}

      {match.status === "scheduled" && (
        <span className="text-muted-foreground space-x-.5 mt-1 flex items-center justify-center">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} size={14} className="fill-muted-foreground" />
          ))}
          {Array.from({ length: 5 - stars }).map((_, i) => (
            <Star key={i} size={14} className="text-gray-700" />
          ))}
        </span>
      )}
    </div>
  );
}

function Scoreboard(match: PublicMatch, stars: number, matchDate: Date | null) {
  return (
    <div className="mx-4 my-4 text-center text-3xl font-bold sm:mt-0">
      {matchDate && match.status === "scheduled" && (
        <div className="hidden sm:block">{MatchInfo(match, stars)}</div>
      )}
      {(match.status === "completed" || match.status === "in_progress") && (
        <div className="mt-4 text-4xl">
          <span
            className={
              match.score_team1 < match.score_team2
                ? "text-muted-foreground"
                : "text-foreground"
            }
          >
            {match.score_team1}
          </span>{" "}
          -{" "}
          <span
            className={
              match.score_team2 < match.score_team1
                ? "text-muted-foreground"
                : "text-foreground"
            }
          >
            {match.score_team2}
          </span>
        </div>
      )}
      {match.competition && match.status === "completed" && (
        <div className="text-base">
          <CompetitionLabel competition={match.competition?.name} h={12} />
        </div>
      )}
    </div>
  );
}

function Stats({ match }: { match: PublicMatch; }){
  if (match.platform=== "faceit") {
    return <FaceITStats match={match} />;
  }

  const externalMatchIds = match.event_match?.extra_info?.external_match_ids as
    | string[]
    | undefined;

  const hasExternalIds = externalMatchIds && externalMatchIds.length > 0;
  const isMatchCompleted = match.status === "completed";

  // Check early if match is not completed or doesn't have external IDs
  if (!isMatchCompleted || !hasExternalIds) {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-lg font-semibold">
          Stats are Unavailable
        </div>
      </div>
    );
  }

  // Extract unique tournament IDs from the external match IDs
  const tournamentIds = externalMatchIds
    ? [...new Set(externalMatchIds.map((id) => id.split(":")[0]))]
    : [];

  // Use React Query to fetch tournament data
  const {
    data: tournamentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tournament-stats", tournamentIds.join(",")],
    queryFn: async () => {
      if (tournamentIds.length === 0) {
        return [];
      }

      // Fetch all tournaments in parallel
      const results = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          try {
            const data = await proxyNWES({
              tournament_id: tournamentId,
            });
            return {
              tournamentId,
              data,
            };
          } catch (error) {
            console.error(`Error fetching tournament ${tournamentId}:`, error);
            return null;
          }
        }),
      );

      return results.filter((r) => r !== null);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: tournamentIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <Spinner />
        <div className="text-muted-foreground mt-2 text-sm">
          Loading match statistics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-destructive text-base font-semibold">
          Error loading stats
        </div>
        <div className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  // Extract matches from tournament data
  const allMatches: Array<{
    matchId: string;
    tournamentId: string;
    nwesMatchId: string;
    matchData: any;
  }> = [];

  if (tournamentData && externalMatchIds) {
    externalMatchIds.forEach((externalId) => {
      const [tournamentId, nwesMatchId] = externalId.split(":");
      const tournament = tournamentData.find(
        (t: any) => t?.tournamentId === tournamentId,
      );

      if (tournament?.data?.matches && Array.isArray(tournament.data.matches)) {
        // Find match by pug_id (which is the match identifier in NWES)
        const matchData = tournament.data.matches.find(
          (m: any) =>
            m.pug_id?.toString() === nwesMatchId ||
            m.id?.toString() === nwesMatchId ||
            m.match_id?.toString() === nwesMatchId,
        );

        if (matchData) {
          allMatches.push({
            matchId: externalId,
            tournamentId,
            nwesMatchId,
            matchData,
          });
        }
      }
    });
  }

  if (allMatches.length === 0) {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-lg font-semibold">No Stats Found</div>
      </div>
    );
  }

  // Only show tabs if there are multiple matches
  if (allMatches.length === 1) {
    const stat = allMatches[0];
    return (
      <div className="flex w-full flex-col gap-4 p-4">
        <h3 className="text-center text-xl font-bold">
          Match Statistics - Map 1
        </h3>
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              Map: {stat.matchData.map}
            </span>
          </div>

          {/* Team 1 Stats */}
          <div className="mb-6">
            <span className="flex items-center gap-4 text-xl">
              <h2 className="text-4xl font-bold">
                {stat.matchData.team1_score}
              </h2>
              <span className="font-semibold">{stat.matchData.team1_name}</span>
            </span>
            <PlayerStatsTable
              teamName={stat.matchData.team1_name}
              players={stat.matchData.team1_stats}
            />
          </div>

          {/* Team 2 Stats */}
          <div>
            <span className="flex items-center gap-4 text-xl">
              <span className="font-semibold">{stat.matchData.team2_name}</span>
              <h2 className="text-4xl font-bold">
                {stat.matchData.team2_score}
              </h2>
            </span>
            <PlayerStatsTable
              teamName={stat.matchData.team2_name}
              players={stat.matchData.team2_stats}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <h3 className="text-center text-xl font-bold">Match Statistics</h3>
      <Tabs defaultValue="map-0" className="w-full">
        <TabsList
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${allMatches.length}, minmax(0, 1fr))`,
          }}
        >
          {allMatches.map((_, index) => (
            <TabsTrigger
              key={`tab-${index}`}
              value={`map-${index}`}
              className="cursor-pointer"
            >
              Map {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        {allMatches.map((stat, index) => (
          <TabsContent key={stat.matchId} value={`map-${index}`}>
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Map: {stat.matchData.map}
                </span>
              </div>

              {/* Team 1 Stats */}
              <div className="mb-6">
                <span className="flex items-center gap-4 text-xl">
                  <h2 className="text-4xl font-bold">
                    {stat.matchData.team1_score}
                  </h2>
                  <span className="font-semibold">
                    {stat.matchData.team1_name}
                  </span>
                </span>
                <PlayerStatsTable players={stat.matchData.team1_stats} />
              </div>

              {/* Team 2 Stats */}
              <div>
                <span className="flex items-center gap-4 text-xl">
                  <h2 className="text-4xl font-bold">
                    {stat.matchData.team2_score}
                  </h2>
                  <span className="font-semibold">
                    {stat.matchData.team2_name}
                  </span>
                </span>
                <PlayerStatsTable players={stat.matchData.team2_stats} />
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FaceITStats({ match }: { match: PublicMatch }) {
  // State to keep track of the selected map index
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);

  // Use React Query to fetch FACEIT match stats
  const { data, isLoading, error } = useQuery({
    queryKey: ["faceit-match-stats", match.id],
    queryFn: () => fetchFaceItStats({ matchId: match.id }),
    enabled: Boolean(match.id) && match.status === "completed",
    staleTime: 1000 * 60 * 3,
  });

  // Handle different states of the query (loading, error, no data, etc.)
  if (match.status !== "completed") {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-lg font-semibold">
          Pending Match Stats (Match Not Completed)
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <Spinner />
        <div className="text-muted-foreground mt-2 text-sm">
          Loading FACEIT match statistics...
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-destructive text-base font-semibold">
          Error loading FACEIT stats
        </div>
        <div className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  // Handle case where no data is returned
  if (!data) {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-lg font-semibold">No FACEIT Stats Found</div>
      </div>
    );
  }

  // Extract available maps and select the current map based on the selected index
  const availableMaps = data.rounds.slice(0, 5);
  const selectedMap = availableMaps[selectedMapIndex] ?? availableMaps[0];

  if (selectedMap == undefined || !selectedMap.teams || selectedMap.teams.length === 0) {
    return (
      <div className="text-md flex min-w-48 flex-col items-center justify-center px-4 py-1">
        <div className="text-lg font-semibold">No FACEIT Rounds Found</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4">
      <h3 className="text-center text-xl font-bold">Match Statistics</h3>

      <div
        // Map Selection Tabs
        className="grid w-full overflow-hidden rounded-md border"
        style={{
          gridTemplateColumns: `repeat(${availableMaps.length}, minmax(0, 1fr))`,
        }}
        role="tablist"
        aria-label="Select a map"
      >
        {availableMaps.map((round, index) => {
          const mapImage = getFaceItMapImage(round.stats_map);
          const mapName = FACEIT_MAP_NAMES[round.stats_map];
          const isSelected = index === selectedMapIndex;
          const winningTeam = round.teams.reduce<
            (typeof round.teams)[number] | undefined
          >(
            (winner, team) =>
              !winner || team.score > winner.score ? team : winner,
            undefined,
          );
          const winningTeamLogo =
            winningTeam?.team_id === match.team1.faceit_id
              ? match.team1.picture
              : winningTeam?.team_id === match.team2.faceit_id
                ? match.team2.picture
                : undefined;

          return (
            <button
              key={round.round}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedMapIndex(index)}
              className={`relative min-h-28 overflow-hidden border-r last:border-r-0 ${
                isSelected ? "ring-primary ring-2 ring-inset" : "opacity-50"
              }`}
            >
              {mapImage && (
                <img
                  src={mapImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <span className="absolute inset-0 bg-black/55" />
              <span className="relative z-10 flex flex-col px-2 py-5 text-white">
                <span className="text-lg font-bold">
                  {mapName || round.stats_map}
                </span>
                <span className="text-sm font-semibold">{round.score.replace("/", "-")}</span>
                {winningTeamLogo && winningTeam && (
                  <Logo
                    src={winningTeamLogo}
                    type="team"
                    alt={`${winningTeam.team_name} logo`}
                    className="mx-auto mt-2 h-8 w-8 object-contain"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <section className="flex flex-col gap-4 rounded-md border p-4">
        {selectedMap.teams.map((team) => (
          <FaceItStatsTable
            key={team.team_id}
            teamName={`${team.team_name} — ${team.score}`}
            teamLogo={
              team.team_id === match.team1.faceit_id
                ? match.team1.picture
                : team.team_id === match.team2.faceit_id
                  ? match.team2.picture
                  : undefined
            }
            players={team.players}
          />
        ))}
      </section>
    </div>
  );
}
