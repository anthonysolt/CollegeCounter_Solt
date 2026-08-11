import Logo from "@/components/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import type { PublicPlayer } from "@/services/api";
import { usePublicPlayers } from "@/services/hooks";
import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router";

function PlayerRankingsWidget() {
  const { data, isLoading, error } = usePublicPlayers(
    {
      sort: "elo",
      order: "desc",
      page: 1,
      page_size: 10,
      season_id: import.meta.env.VITE_CURRENT_SEASON_ID,
    },
    {
      staleTime: 1000 * 60 * 5,
    },
  );

  if (error) {
    return (
      <div className="rankings-widget h-103 rounded-xl border-2 px-4 py-2">
        <NavLink
          to="/rankings#player"
          className="group flex cursor-pointer items-center justify-between"
        >
          <h2>Player Rankings</h2>
          <ChevronRight className="text-muted-foreground mr-2 h-6 w-6 transition-all group-hover:mr-0" />
        </NavLink>
        <hr />
        <Alert variant="destructive" className="mt-4">
          <AlertTitle className="text-lg">Error</AlertTitle>
          <AlertDescription>
            There was an error loading the player rankings. Please try again
            later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="rankings-widget h-103 rounded-xl border-2 px-4 py-2">
        <NavLink
          to="/rankings#player"
          className="group flex cursor-pointer items-center justify-between"
        >
          <h2>Player Rankings</h2>
          <ChevronRight className="text-muted-foreground mr-2 h-6 w-6 transition-all group-hover:mr-0" />
        </NavLink>
        <hr />
        <div>
          <Spinner className="mx-auto my-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="rankings-widget h-103 rounded-xl border-2 px-4 py-2">
      <NavLink
        to="/rankings#player"
        className="group flex cursor-pointer items-center justify-between"
      >
        <h2>Player Rankings</h2>
        <ChevronRight className="text-muted-foreground mr-2 h-6 w-6 transition-all group-hover:mr-0" />
      </NavLink>
      <hr />
      <ul className="space-y-3 py-2 pt-3">
        {data.results.map((player, i) => (
          <RankingItem key={player.id || i} index={i} player={player} />
        ))}
      </ul>
    </div>
  );
}

interface RankingItemProps {
  index: number;
  player: PublicPlayer;
}

function RankingItem(props: RankingItemProps) {
  const rank = props.index + 1;

  return (
    <li className="flex justify-between">
      <div className="flex items-center space-x-2">
        <span className="mr-3 w-4 text-end font-mono">{rank}</span>
        <Logo
          src={props.player.team?.picture || undefined}
          className="h-6 w-6 rounded-sm"
          alt="team logo"
          type="team"
        />
        <div className="max-w-[128px] truncate overflow-ellipsis whitespace-nowrap">
          {props.player.name}
        </div>
      </div>
      <div>
        <span className="bg-primary drop-shadow-primary drop-shadow-lg/50 rounded-md p-1 font-mono text-sm">
          {props.player.elo}
        </span>
      </div>
    </li>
  );
}

export default PlayerRankingsWidget;
