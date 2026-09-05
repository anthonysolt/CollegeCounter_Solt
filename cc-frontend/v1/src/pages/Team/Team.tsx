import Logo from "@/components/Logo";
import {
  usePublicPlayers,
  usePublicEvents,
  usePublicTeams,
  useTeamRanking,
} from "@/services/hooks";
import { useParams } from "react-router";
import UpcomingMatchesWidget from "../Home/UpcomingMatchesWidget";
import ResultsWidget from "../Home/ResultsWidget";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { CompetitionLabel } from "@/components/CompetitionLabel";
import RankBadge from "@/components/RankBadge";
import { Link } from "react-router";
import { Trophy } from "lucide-react";

export function Team() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = usePublicTeams({ id });
  const team = data?.results[0];

  const {
    data: rankingData,
    isLoading: rankingIsLoading,
    error: rankingError,
  } = useTeamRanking({
    team_id: id,
  });

  const RankingDate = rankingData?.ranking.date
    ? new Date(rankingData.ranking.date)
    : null;
  if (isLoading || !data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error || !team) {
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

  const uniqueCompetitions = Array.from(
    new Map(
      (team.current_competitions || [])
        .filter((comp) => comp.name && !comp.name.includes("(p)"))
        .map((comp) => [comp.name, comp]),
    ).values(),
  );

  return (
    <div className="app-container flex justify-center">
      <div className="w-full max-w-[800px]">
        <div className="mb-8 items-center justify-between sm:flex">
          <span className="ml-4 flex items-center space-x-4">
            <Logo
              src={team.picture}
              className="h-32 w-32 rounded-md"
              alt="Team"
              type="team"
            />
            <div>
              <h2 className="text-4xl">{team.name}</h2>
              <TrophycaseLogos teamId={id} />
              <h4 className="text-muted-foreground text-lg">
                {team.school_name}
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {uniqueCompetitions.map((comp) => (
                  <CompetitionLabel key={comp.name} competition={comp.name} />
                ))}
              </div>
            </div>
          </span>
          <div className="ml-4 mr-8 mt-4 sm:mt-0 sm:text-right">
            <h2 className="text-6xl">
              #
              {rankingData ? (
                rankingData.rank
              ) : rankingIsLoading ? (
                <Spinner />
              ) : rankingError ? (
                "N/A"
              ) : (
                "-"
              )}
            </h2>
            <p className="text-muted-foreground">
              Ranking as of{" "}
              {rankingData ? RankingDate?.toLocaleDateString() : "-"}
            </p>
          </div>
        </div>

        <PlayerComponent team_id={id} />

        {/* <Trophycase teamId={id} /> */}

        <div className="mx-4 mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <UpcomingMatchesWidget teamId={id} limit={20} />
          <ResultsWidget teamId={id} limit={20} />
        </div>
      </div>
    </div>
  );
}

interface TrophycaseProps {
  teamId?: string;
}

interface EventTrophyLogoProps {
  eventName: string;
  eventPicture?: string;
  className: string;
}

function EventTrophyLogo({eventName, eventPicture, className,}: 
  EventTrophyLogoProps) {
  return (
    <span className="relative block">
      <Logo
        src={eventPicture}
        className={className}
        alt={eventName}
        type="team"
      />
      <Trophy
        className="absolute bottom-0 right-0 h-4 w-4 text-yellow-500"
        aria-hidden="true"
      />
    </span>
  );
}

function TrophycaseLogos({ teamId }: TrophycaseProps) {
  const { data, isLoading, error } = usePublicEvents(
    {
      winner_id: teamId,
      trophycase: true,
      page_size: 100,
      sort: "start_date",
      order: "desc",
    },
    {
      enabled: Boolean(teamId),
    },
  );

  if (!teamId) return null;

  if (isLoading) {
    return (
      <div className="mt-2" aria-label="Loading trophy case">
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          There was an error loading the trophy case. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const trophies = (data?.results ?? []).filter(
    (event) =>
      event.winner?.id === teamId &&
      event.custom_details?.is_trophycase === true
  );

  if (trophies.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Trophy case">
      {trophies.map((event) => (
        <Link
          key={event.id}
          to={`/events/${event.id}`}
          className="group block rounded p-0.5"
          title={`${event.name} Champions`}
          aria-label={event.name}
        >
          <EventTrophyLogo
            eventPicture={event.picture}
            eventName={event.name}
            className="h-12 w-12 rounded object-contain transition-transform group-hover:scale-110"
          />
        </Link>
      ))}
    </div>
  );
}

interface PlayerComponentProps {
  team_id?: string;
}

function PlayerComponent(props: PlayerComponentProps) {
  if (!props.team_id) return <div>No team ID provided</div>;
  const {
    data: playerData,
    isLoading: playerIsLoading,
    error: playerError,
  } = usePublicPlayers({
    team_id: props.team_id,
    visible: true,
    sort: "elo",
    order: "desc",
    page_size: 5,
  });
  return (
    <div className="mx-4 rounded-xl border-2 p-4">
      {playerIsLoading && <div>Loading players...</div>}
      {playerError && <div>Error loading players</div>}
      {playerData && playerData.results.length === 0 && (
        <div>No players found for this team.</div>
      )}
      {playerData && playerData.results.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {playerData.results.map((player) => (
            <div
              key={player.id}
              className="flex flex-col items-center space-y-2"
            >
              <div className="flex w-32 justify-center">
                <Logo
                  src={player.picture}
                  className="h-32 rounded-md"
                  alt="Player"
                  type="player"
                />
              </div>
              <div className="space-y-0.5 text-center">
                <p className="font-semibold">{player.name}</p>
                <RankBadge elo={player.elo || 0} className="mx-auto h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  ELO: {player.elo || "N/A"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
