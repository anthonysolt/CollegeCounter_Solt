import { useParams, useNavigate, NavLink } from "react-router";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  MapPin,
  Trophy,
  Users,
  ExternalLink,
  Twitch,
  MessageCircle,
  ArrowLeft,
  DollarSign,
  FileText,
  Radio,
} from "lucide-react";
import {
  usePublicEvent,
  usePublicMatches,
  usePublicTeams,
} from "@/services/hooks";

import c4_logo from "@/assets/c4 title.svg";
import type { PublicEvent, PublicMatch, PublicTeam } from "@/services/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { CountdownTimer } from "@/components/CountdownTimer";
import Logo from "@/components/Logo";
import { calculateEloChanges } from "@/services/elo";

export function Event() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading, error } = usePublicEvent(id!);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: formatDate(date),
      time: formatTime(date),
      full: date,
    };
  };

  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
  } = usePublicMatches({ event_id: event?.id }, { disabled: !event?.id });

  const {
    data: teams,
    isLoading: teamsLoading,
    error: teamsError,
  } = usePublicTeams({ event_id: event?.id }, { disabled: !event?.id });

  if (isLoading) {
    return (
      <div className="app-container mx-4 flex justify-center">
        <div className="w-full max-w-[1200px]">
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="app-container mx-4 flex justify-center">
        <div className="w-full max-w-[1200px]">
          <Button
            variant="ghost"
            onClick={() => navigate("/events")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>

          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Trophy className="text-muted-foreground mb-3 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Event Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error?.message ||
                "The event you're looking for doesn't exist or has been removed."}
            </p>
            <Button onClick={() => navigate("/events")}>
              Browse All Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const startDateTime = formatDateTime(event.start_date);

  return (
    <div className="app-container mx-4 flex justify-center">
      <div className="mx-2 w-full max-w-[1200px] space-y-6 sm:mx-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-2 cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>

        {/* Hero Section */}
        <div className="grid grid-cols-1 gap-6 md:grid md:grid-cols-3">
          <div className="relative col-span-2">
            <div>
              {event.custom_details?.is_featured ? (
                <div>
                  <img
                    src={c4_logo}
                    alt="C4 Logo"
                    className="mb-2 h-24 w-auto"
                  />
                  {event.custom_details.division && (
                    <h1 className="mb-2">
                      {event.custom_details.division === "honors"
                        ? "Honors Division"
                        : "Open Division"}
                    </h1>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {event.picture && (
                    <div className="h-18 w-18">
                      <img
                        src={event.picture}
                        alt={event.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <h1>{event.name}</h1>
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:items-center md:justify-center lg:flex">
            <CountdownTimer targetDate={startDateTime.full} />
            {event.winner && (
              <div className="border-primary shadow-primary/30 bg-primary/5 mb-6 w-full space-y-3 rounded-lg border-2 py-4 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Event Winner</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Logo
                    src={event.winner.picture}
                    alt={event.winner.name}
                    className="h-8 w-8 rounded-sm"
                    type="team"
                  />
                  <NavLink
                    className="text-xl font-medium underline"
                    to={`/teams/${event.winner.id}`}
                  >
                    {event.winner.name}
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          {event.winner && (
            <div className="border-primary shadow-primary/30 bg-primary/5 mb-6 block space-y-3 rounded-lg border-2 py-4 shadow-lg lg:hidden">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Event Winner</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Logo
                  src={event.winner.picture}
                  alt={event.winner.name}
                  className="h-8 w-8 rounded-sm"
                  type="team"
                />
                <NavLink
                  className="text-xl font-medium underline"
                  to={`/teams/${event.winner.id}`}
                >
                  {event.winner.name}
                </NavLink>
              </div>
            </div>
          )}
          <div className="space-y-6 lg:col-span-2">
            {event.custom_details && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {event.custom_details.prize_pool && (
                    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/20">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">Prize Pool</p>
                        <p className="text-muted-foreground text-sm">
                          {event.custom_details.prize_currency}{" "}
                          {event.custom_details.prize_pool}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.custom_details.max_teams && (
                    <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Max Teams</p>
                        <p className="text-muted-foreground text-sm">
                          {event.custom_details.max_teams} teams
                        </p>
                      </div>
                    </div>
                  )}

                  {event.custom_details.entry_fee &&
                    parseFloat(event.custom_details.entry_fee) > 0 && (
                      <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Entry Fee</p>
                          <p className="text-muted-foreground text-sm">
                            {event.custom_details.prize_currency}{" "}
                            {event.custom_details.entry_fee}
                          </p>
                        </div>
                      </div>
                    )}

                  {event.custom_details.format && (
                    <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-950/20">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Format</p>
                        <p className="text-muted-foreground text-sm">
                          {event.custom_details.format}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {MainContentSwitcher(
              event,
              matches?.results,
              teams?.results,
              {
                isLoading: matchesLoading,
                error: matchesError,
              },
              {
                isLoading: teamsLoading,
                error: teamsError,
              },
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Schedule */}
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 font-medium">Event Start</p>
                  <p className="text-sm">{startDateTime.date}</p>
                  <p className="text-muted-foreground text-sm">
                    {startDateTime.time}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Registration Status */}
            {event.custom_details &&
              (event.custom_details.registration_open ? (
                <div>
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                    <p className="mb-1 font-medium text-green-800 dark:text-green-100">
                      Registration Open
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      Sign up now to secure your spot!
                    </p>
                  </div>
                  {event.custom_details.registration_link &&
                    event.custom_details.registration_open && (
                      <Button asChild className="mt-2 w-full">
                        <a
                          href={event.custom_details.registration_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Register Now
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                </div>
              ) : (
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
                  <p className="mb-1 font-medium text-red-800 dark:text-red-100">
                    Registration Closed
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Registration is no longer available for this event.
                  </p>
                </div>
              ))}

            {event.custom_details && (
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle>Links & Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {event.custom_details.bracket_link && (
                      <Button variant="outline" asChild className="w-full">
                        <a
                          href={event.custom_details.bracket_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Bracket
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {event.custom_details.stream_link && (
                      <Button variant="outline" asChild className="w-full">
                        <a
                          href={event.custom_details.stream_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Twitch className="mr-2 h-4 w-4" />
                          Watch Stream
                        </a>
                      </Button>
                    )}

                    {event.custom_details.secondary_stream_link && (
                      <Button variant="outline" asChild className="w-full">
                        <a
                          href={event.custom_details.secondary_stream_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Twitch className="mr-2 h-4 w-4" />
                          Secondary Stream
                        </a>
                      </Button>
                    )}

                    {event.custom_details.discord_link && (
                      <Button variant="outline" asChild className="w-full">
                        <a
                          href={event.custom_details.discord_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Join Discord
                        </a>
                      </Button>
                    )}

                    {event.custom_details.rules_document && (
                      <Button variant="outline" asChild className="w-full">
                        <a
                          href={event.custom_details.rules_document}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Rules
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MainContentSwitcher(
  event: PublicEvent,
  matches: PublicMatch[] = [],
  teams: PublicTeam[] = [],
  { isLoading, error }: { isLoading: boolean; error: any },
  {
    isLoading: teamsLoading,
    error: teamsError,
  }: { isLoading: boolean; error: any },
) {
  const getStatus = () => {
    if (!event) return null;
    const now = new Date();
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;

    if (now < start) {
      return "upcoming";
    } else if (end && now > end) {
      return "completed";
    } else {
      return "ongoing";
    }
  };

  // Check if bracket link is a Challonge link
  const isChallongeBracket = () => {
    const bracketUrl = event.custom_details?.bracket_link;
    return bracketUrl && bracketUrl.toLowerCase().includes("challonge.com");
  };

  return (
    <Tabs
      defaultValue={getStatus() === "ongoing" ? "stream" : "matches"}
      className="w-full"
    >
      <TabsList>
        {getStatus() === "ongoing" && (
          <TabsTrigger
            value="stream"
            className="hover:text-foreground! cursor-pointer"
          >
            Stream
          </TabsTrigger>
        )}
        <TabsTrigger
          value="matches"
          className="hover:text-foreground! cursor-pointer"
        >
          Matches
        </TabsTrigger>
        {isChallongeBracket() && (
          <TabsTrigger
            value="bracket"
            className="hover:text-foreground! cursor-pointer"
          >
            Bracket
          </TabsTrigger>
        )}
        <TabsTrigger
          value="teams"
          className="hover:text-foreground! cursor-pointer"
        >
          Teams
        </TabsTrigger>
        <TabsTrigger
          value="info"
          className="hover:text-foreground! cursor-pointer"
        >
          Info
        </TabsTrigger>
      </TabsList>
      <TabsContent value="stream">{Stream(event)}</TabsContent>
      {isChallongeBracket() && (
        <TabsContent value="bracket">{Bracket(event)}</TabsContent>
      )}
      <TabsContent value="teams">
        {Teams(teams, { isLoading: teamsLoading, error: teamsError })}
      </TabsContent>
      <TabsContent value="matches">
        {Matches(matches, { isLoading, error })}
      </TabsContent>
      <TabsContent value="info">{Info(event)}</TabsContent>
    </Tabs>
  );
}

function Stream(event: PublicEvent) {
  if (!event.custom_details?.stream_link) {
    return (
      <Card className="bg-background">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Twitch className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground">
            No stream available for this event
          </p>
        </CardContent>
      </Card>
    );
  }

  if (event.custom_details.stream_link.includes("twitch.tv")) {
    // Extract channel name from Twitch URL
    let channelName = "";

    if (event.custom_details.stream_link.includes("twitch.tv/")) {
      const parts = event.custom_details.stream_link.split("twitch.tv/");
      if (parts.length > 1) {
        channelName = parts[1].split(/[/?#]/)[0]; // Remove any query params or fragments
      }
    }

    if (!channelName) {
      return (
        <Card className="bg-background">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Twitch className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">Invalid stream URL</p>
          </CardContent>
        </Card>
      );
    }

    // Create proper Twitch embed URL with required parameters
    const embedUrl = `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}&autoplay=true&muted=true`;

    return (
      <div className="w-full overflow-clip rounded-lg">
        <iframe
          src={embedUrl}
          height="480"
          width="100%"
          allowFullScreen={true}
          frameBorder="0"
          scrolling="no"
          title="Twitch Stream"
        ></iframe>
      </div>
    );
  }
}

function Teams(
  teams: PublicTeam[],
  { isLoading, error }: { isLoading: boolean; error: any },
) {
  if (isLoading) {
    return (
      <div className="h-50 flex content-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div>Error loading teams</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        No teams found for this event.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teams
        .sort(
          (a, b) =>
            (a.current_ranking?.rank || 0) - (b.current_ranking?.rank || 0),
        )
        .map((team) => (
          <Team key={team.id} team={team} />
        ))}
    </div>
  );
}

function Team({ team }: { team: PublicTeam }) {
  return (
    <div className="rounded-lg border p-2">
      <NavLink to={`/teams/${team.id}`} className="flex items-center">
        <Logo src={team.picture} type="team" className="h-12 w-12 rounded-md" />
        <div className="flex">
          <p className="bg-secondary mx-4 rounded-lg px-2 py-1 font-mono">
            #{team.current_ranking?.rank}
          </p>
          <h3 className="pt-0.5 text-lg font-semibold">{team.name}</h3>
        </div>
      </NavLink>
    </div>
  );
}

function Bracket(event: PublicEvent) {
  const bracketUrl = event.custom_details?.bracket_link;

  if (!bracketUrl) {
    return (
      <Card className="bg-background">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground">
            No bracket available for this event
          </p>
        </CardContent>
      </Card>
    );
  }

  // Convert Challonge URL to embed format if needed
  const embedUrl = bracketUrl.includes("/module")
    ? bracketUrl
    : `${bracketUrl}/module?multiplier=1.4&transparent=1`;

  return (
    <div className="w-full overflow-clip rounded-lg">
      <iframe
        src={embedUrl}
        width="100%"
        height="400"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
        loading="lazy"
        title="Tournament Bracket"
        allowTransparency={true}
      ></iframe>
    </div>
  );
}

function Info(event: PublicEvent) {
  if (!event.custom_details) {
    return null;
  }
  return (
    <>
      <Card className="bg-background">
        <CardHeader>
          <CardTitle>About This Event</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {event.description}
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function Matches(
  matches: PublicMatch[],
  { isLoading, error }: { isLoading: boolean; error: any },
) {
  if (isLoading) {
    return (
      <div className="h-50 flex content-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div>Error loading matches</div>;
  }

  const scheduled = matches.filter((m) => m.status === "scheduled");
  const live = matches.filter((m) => m.status === "in_progress");
  const completed = matches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-4">
      {live.length > 0 && (
        <div>
          <h2>Live Matches</h2>
          <ul className="space-y-2">
            {live.map((match) => (
              <UpcomingOrLiveMatch key={match.id} match={match} live={true} />
            ))}
          </ul>
        </div>
      )}
      {scheduled.length > 0 && (
        <div>
          <h2>Scheduled Matches</h2>
          <ul className="space-y-2">
            {scheduled.map((match) => (
              <UpcomingOrLiveMatch key={match.id} match={match} />
            ))}
          </ul>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <h2>Completed Matches</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {completed.map((match) => (
              <Result key={match.id} match={match} />
            ))}
          </ul>
        </div>
      )}
      {live.length === 0 &&
        scheduled.length === 0 &&
        completed.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            No matches found for this event.
          </div>
        )}
    </div>
  );
}

interface UpcomingOrLiveMatchProps {
  match: PublicMatch;
  live?: boolean;
}

function UpcomingOrLiveMatch({ match, live }: UpcomingOrLiveMatchProps) {
  const changes_team1 = calculateEloChanges(
    match.team1?.elo || 1000,
    match.team2?.elo || 1000,
  );
  const changes_team2 = calculateEloChanges(
    match.team2?.elo || 1000,
    match.team1?.elo || 1000,
  );
  // Format date and time
  const matchDate = new Date(match.date || "");
  const dateStr = matchDate.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
  const timeStr = matchDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/matches/${match.id}`);
  };

  return (
    <li
      className={`bg-background flex cursor-pointer rounded-xl border-2 p-4 py-2 transition-all`}
      onClick={handleClick}
    >
      <div className="sm:flex-5 my-auto flex-1 space-y-3">
        <div className="flex items-center space-x-2">
          <Logo src={match.team1?.picture} type="team" className="h-6 w-6" />
          <span className="truncate overflow-ellipsis whitespace-nowrap">
            {match.team1?.name || "Unknown Team"}
          </span>
          <span className="ml-2 hidden items-center justify-end text-xs sm:flex">
            <div className="text-muted-foreground bg-muted flex rounded-sm px-1 font-mono text-xs">
              <div className="text-muted-foreground border-r-2 pr-1 font-mono">
                {match.team1?.elo}
              </div>
              <div className="border-r-2 border-dotted px-1 font-mono text-green-600">
                {changes_team1.winChange >= 0
                  ? `+${changes_team1.winChange}`
                  : changes_team1.winChange}
              </div>
              <div className="border-foreground-muted pl-1 font-mono text-red-600">
                {changes_team1.lossChange >= 0
                  ? `+${changes_team1.lossChange}`
                  : changes_team1.lossChange}
              </div>
            </div>
          </span>
        </div>
        <div className="flex items-center space-x-2 overflow-ellipsis">
          <Logo src={match.team2?.picture} type="team" className="h-6 w-6" />
          <span className="truncate overflow-ellipsis whitespace-nowrap">
            {match.team2?.name || "Unknown Team"}
          </span>
          <span className="ml-2 hidden items-center justify-end text-xs sm:flex">
            <div className="text-muted-foreground bg-muted flex rounded-sm px-1 font-mono text-xs">
              <div className="text-muted-foreground border-r-2 pr-1 font-mono">
                {match.team2?.elo}
              </div>
              <div className="border-r-2 border-dotted px-1 font-mono text-green-600">
                {changes_team2.winChange >= 0
                  ? `+${changes_team2.winChange}`
                  : changes_team2.winChange}
              </div>
              <div className="border-foreground-muted pl-1 font-mono text-red-600">
                {changes_team2.lossChange >= 0
                  ? `+${changes_team2.lossChange}`
                  : changes_team2.lossChange}
              </div>
            </div>
          </span>
        </div>
      </div>
      <div className="sm:flex-2 flex-1 text-end text-sm">
        {live ? (
          <div className="mb-2 flex items-center justify-end space-x-1">
            <h3 className="mr-2 text-lg font-bold">In Progress</h3>
            <Radio className="animate-radio-blink h-6 w-6 text-red-500" />
          </div>
        ) : (
          <div className="mb-1 text-lg">
            {dateStr}, {timeStr}
          </div>
        )}
        <div className="flex justify-end">
          {match.event_match?.extra_info.round_name && (
            <div className="bg-primary rounded-md px-2 py-0.5">
              {match.event_match?.extra_info.round_name}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

interface ResultProps {
  match: PublicMatch;
}

function Result(props: ResultProps) {
  const winningTeamId = props.match.winner?.id;
  let winner, loser;
  if (winningTeamId === props.match.team1.id) {
    winner = props.match.team1;
    loser = props.match.team2;
  } else {
    winner = props.match.team2;
    loser = props.match.team1;
  }

  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/matches/${props.match.id}`);
  };

  return (
    <li
      className="cursor-pointer rounded-xl border-2 p-4 py-2"
      onClick={handleClick}
    >
      <div className="flex">
        <div className="flex-3 space-y-2">
          <div className="flex items-center space-x-2">
            <Logo
              src={winner.picture}
              className="h-6 w-6"
              alt="pfp"
              type="team"
            />
            <span className="truncate overflow-ellipsis whitespace-nowrap font-semibold">
              {winner.name}
            </span>
          </div>
          <div className="flex items-center space-x-2 overflow-ellipsis">
            <Logo
              src={loser.picture}
              className="h-6 w-6"
              alt="pfp"
              type="team"
            />
            <span className="text-muted-foreground truncate overflow-ellipsis whitespace-nowrap">
              {loser.name}
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-end">
          <span className="flex justify-end">
            <p className="bg-muted ml-2 rounded-sm px-1 font-mono text-green-500">
              {Math.max(props.match.score_team1, props.match.score_team2)}
            </p>
          </span>
          <span className="flex justify-end">
            <p className="bg-muted ml-2 rounded-sm px-1 font-mono text-red-500">
              {Math.min(props.match.score_team1, props.match.score_team2)}
            </p>
          </span>
        </div>
      </div>
      <hr className="my-2" />
      <div className="flex items-end justify-between">
        <div className="flex items-center space-x-2">
          {props.match.event_match?.extra_info.round_name && (
            <div className="bg-primary rounded-md px-2 py-0.5">
              {props.match.event_match?.extra_info.round_name}
            </div>
          )}
        </div>
        <p className="text-muted-foreground py-0.5">
          {new Date(props.match.date).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </li>
  );
}
