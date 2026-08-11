import Logo from "@/components/Logo";
import RankBadge from "@/components/RankBadge";
import type { PublicPlayer } from "@/services/api";

function PlayerRankingComponent(player: PublicPlayer & { rank: number }) {
  return (
    <div
      className={"team-ranking-component w-full rounded-xl border-2 p-2 pl-4"}
    >
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <span className="mr-3 text-end font-mono text-xl">
            {player.rank + 1}
          </span>
          <div className="flex w-16 items-center justify-center">
            <Logo
              src={player.picture}
              className="h-16 rounded-sm"
              alt="pfp"
              type="player"
            />
          </div>
          <span className="truncate overflow-ellipsis whitespace-nowrap text-xl">
            {player.name}
          </span>
          <div className="bg-secondary drop-shadow-secondary drop-shadow-lg/50 ml-2 hidden rounded-md p-1 px-2 text-xs sm:block">
            {player.team?.name}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <RankBadge elo={player.elo || 0} className="h-8 w-8" />
          <div className="bg-primary drop-shadow-primary drop-shadow-lg/50 rounded-md p-1 px-2 font-mono text-lg">
            {player.elo}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerRankingComponent;
