interface RankBadgeProps {
  elo: number;
  className?: string;
}

interface RankInfo {
  image: string;
  label: string;
  minElo: number;
  maxElo?: number;
}

const RANKS: RankInfo[] = [
  { image: "challenger.svg", label: "Challenger", minElo: 3000 },
  { image: "lvl10.svg", label: "Level 10", minElo: 2001, maxElo: 2999 },
  { image: "lvl9.svg", label: "Level 9", minElo: 1751, maxElo: 2000 },
  { image: "lvl8.svg", label: "Level 8", minElo: 1531, maxElo: 1750 },
  { image: "lvl7.svg", label: "Level 7", minElo: 1351, maxElo: 1530 },
  { image: "lvl6.svg", label: "Level 6", minElo: 1201, maxElo: 1350 },
  { image: "lvl5.svg", label: "Level 5", minElo: 1051, maxElo: 1200 },
  { image: "lvl4.svg", label: "Level 4", minElo: 901, maxElo: 1050 },
  { image: "lvl3.svg", label: "Level 3", minElo: 751, maxElo: 900 },
  { image: "lvl2.svg", label: "Level 2", minElo: 501, maxElo: 750 },
  { image: "lvl1.svg", label: "Level 1", minElo: 100, maxElo: 500 },
];

function getRankByElo(elo: number): RankInfo | null {
  for (const rank of RANKS) {
    if (
      elo >= rank.minElo &&
      (rank.maxElo === undefined || elo <= rank.maxElo)
    ) {
      return rank;
    }
  }
  return null;
}

function RankBadge({ elo, className = "" }: RankBadgeProps) {
  const rank = getRankByElo(elo);

  if (!rank) {
    return null;
  }

  return (
    <img
      src={`/faceit/${rank.image}`}
      alt={rank.label}
      title={rank.label}
      className={className}
    />
  );
}

export default RankBadge;
