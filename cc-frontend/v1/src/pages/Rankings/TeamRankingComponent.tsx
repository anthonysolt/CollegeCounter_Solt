import { useState } from "react";
import type { PublicTeam } from "@/services/api";
import { usePublicPlayers } from "@/services/hooks";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import Logo from "@/components/Logo";
import { NavLink } from "react-router";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface TeamRankingComponentProps {
  team: PublicTeam;
  rank: number;
  rankChange?: number;
}

function TeamRankingComponent(props: TeamRankingComponentProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, error, isLoading } = usePublicPlayers(
    {
      team_id: props.team.id,
      sort: "elo",
      order: "desc",
      visible: true,
      benched: false,
      page_size: 5,
    },
    { enabled: expanded },
  );

  function expandedCard() {
    if (isLoading || !data) {
      return (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      );
    }
    if (error) {
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
      <div className="mx-12 flex justify-between pt-3">
        {data.results.map((player, i) => (
          <div key={i}>
            <div className="flex w-32 justify-center">
              <Logo
                src={player.picture}
                className="h-32"
                alt="Player"
                type="player"
              />
            </div>
            <p className="border-t-2 text-center">{player.name}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={
        "team-ranking-component w-full cursor-pointer rounded-xl border-2 p-2 pl-4"
      }
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <span className="mr-3 text-end font-mono text-xl">{props.rank}</span>
          <Logo
            src={props.team.picture}
            className="h-8 w-8 rounded-sm"
            alt="pfp"
            type="team"
          />
          <NavLink to={`/teams/${props.team.id}`}>
            <span className="truncate overflow-ellipsis whitespace-nowrap text-xl underline transition-colors hover:text-blue-400">
              {props.team.name}
            </span>
          </NavLink>
        </div>
        <div className="flex items-center space-x-2">
          <div>
            <div className="flex items-center space-x-1">
              {props.rankChange !== undefined && (
                <span
                  className={
                    "flex items-center font-mono text-lg " +
                    (props.rankChange > 0
                      ? "text-green-500"
                      : props.rankChange < 0
                        ? "text-red-500"
                        : "text-muted-foreground")
                  }
                >
                  {props.rankChange > 0 && (
                    <svg
                      className="mr-1 inline-block h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  )}
                  {props.rankChange < 0 && (
                    <svg
                      className="mr-1 inline-block h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                  {props.rankChange === 0 ? "-" : Math.abs(props.rankChange)}
                </span>
              )}
            </div>
          </div>
          <div className="bg-secondary drop-shadow-secondary drop-shadow-lg/50 rounded-md p-1 px-2 font-mono text-lg">
            {props.team.elo}
          </div>
        </div>
      </div>
      <div
        className={`hidden transition-all duration-300 md:block ${expanded ? "h-[165px]" : "h-0 overflow-hidden"}`}
      >
        <div
          className={`bg-background z-10 transition-all duration-300 ${expanded ? "opacity-100" : "opacity-0"}`}
        >
          {expandedCard()}
        </div>
      </div>
    </div>
  );
}

export default TeamRankingComponent;
