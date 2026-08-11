import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, ExternalLink, Users } from "lucide-react";
import c4_logo from "@/assets/c4 title noborder.svg";

// Simple Badge component
function Badge({
  variant = "default",
  className = "",
  children,
}: {
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  children: React.ReactNode;
}) {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  const variantStyles = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-input bg-background text-foreground",
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
import { usePublicEvents } from "@/services/hooks";
import type { PublicEvent } from "@/services/api";
import { NavLink } from "react-router";

export function Events() {
  const {
    data: eventsResponse,
    isLoading: eventsLoading,
    error,
  } = usePublicEvents({
    sort: "start_date",
    order: "asc",
    page_size: 20,
  });

  const events = eventsResponse?.results || [];

  // Sort events by featured status (for live/upcoming), then status (Live → Upcoming → Completed), then by start date
  const sortedEvents = [...events].sort((a, b) => {
    const now = new Date();
    const aStart = new Date(a.start_date);
    const aEnd = new Date(a.end_date);
    const bStart = new Date(b.start_date);
    const bEnd = new Date(b.end_date);

    // Determine status for each event
    const getStatusPriority = (start: Date, end: Date) => {
      if (start <= now && end >= now) return 0; // Live
      if (start > now) return 1; // Upcoming
      return 2; // Completed
    };

    const aStatus = getStatusPriority(aStart, aEnd);
    const bStatus = getStatusPriority(bStart, bEnd);

    // Check if events are featured and live/upcoming
    const aIsFeaturedAndActive = a.custom_details?.is_featured && aStatus <= 1;
    const bIsFeaturedAndActive = b.custom_details?.is_featured && bStatus <= 1;

    // Featured live/upcoming events always come first
    if (aIsFeaturedAndActive && !bIsFeaturedAndActive) return -1;
    if (!aIsFeaturedAndActive && bIsFeaturedAndActive) return 1;

    // Then sort by status
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }

    // Then sort by start date (latest first)
    return bStart.getTime() - aStart.getTime();
  });

  if (error) {
    return (
      <div className="app-container mx-4 flex justify-center">
        <div className="matches w-full max-w-[1000px]">
          <h1 className="mb-4 text-3xl font-bold">Events</h1>
          <div className="flex h-40 items-center justify-center">
            <p className="text-red-600">
              Error loading events: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container mx-4 flex justify-center">
      <div className="matches w-full max-w-[1000px]">
        <div className="mb-6">
          <h1>Events</h1>
          <p className="text-muted-foreground">
            Discover upcoming tournaments, competitions, and community events
          </p>
          <hr />
        </div>

        {eventsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <Trophy className="text-muted-foreground mb-3 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No Events Found</h3>
            <p className="text-muted-foreground">
              There are currently no upcoming events. Check back later!
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="grid w-full max-w-[488px] grid-cols-1 gap-6 lg:max-w-[1000px] lg:grid-cols-2">
              {sortedEvents.map((event) => (
                <Event key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EventProps {
  event: PublicEvent;
}

function Event({ event }: EventProps) {
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const isUpcoming = startDate > new Date();
  const isOngoing = startDate <= new Date() && endDate >= new Date();
  const isPast = endDate < new Date();

  const formatDate = (date: Date, year?: boolean) => {
    return date.toLocaleDateString("en-US", {
      year: year ? "numeric" : undefined,
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

  const getStatusBadge = () => {
    if (isOngoing) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          Live
        </Badge>
      );
    }
    if (isUpcoming) {
      return <Badge variant="secondary">Upcoming</Badge>;
    }
    if (isPast) {
      return <Badge variant="outline">Completed</Badge>;
    }
  };

  return (
    <Card
      className={`bg-background relative w-full max-w-[488px] ${event.custom_details?.is_featured && (isUpcoming || isOngoing) ? "drop-shadow-primary/40 border-primary border-2 drop-shadow-lg" : ""}`}
    >
      <div className="absolute right-2 top-1">{getStatusBadge()}</div>
      <div className="flex flex-col md:flex-row">
        {/* Event Content */}
        <div className="flex-1">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="mb-1 flex items-center">
                  {event.custom_details?.is_featured ? (
                    <img src={c4_logo} alt="C4 Logo" className="-m-3 h-24" />
                  ) : (
                    <div className="mb-1 flex items-center gap-4">
                      {event.picture && (
                        <div className="h-18 w-18 hidden sm:block">
                          <img
                            src={event.picture}
                            alt={event.name}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <h2 className="mb-1 overflow-ellipsis text-4xl">
                          {event.name}
                        </h2>
                        <p className="text-muted-foreground text-xs italic">
                          Note: This event is not affiliated with College
                          Counter
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Event Details */}
            {event.custom_details && (
              <div className="flex items-center justify-between">
                {/* Prize Pool */}
                {event.custom_details.prize_pool && (
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-yellow-500" />

                      {event.winner ? (
                        <span className="font-bold">
                          Winner:{" "}
                          <NavLink
                            to={`/teams/${event.winner.id}`}
                            className="cursor-pointer underline transition-colors hover:text-blue-300"
                          >
                            {" "}
                            {event.winner.name}
                          </NavLink>
                        </span>
                      ) : (
                        <>
                          <span className="font-medium">Prize Pool:</span>
                          <span>
                            {event.custom_details.prize_currency}{" "}
                            {event.custom_details.prize_pool}
                          </span>
                        </>
                      )}
                    </div>
                    {new Date(event.start_date) > new Date() && (
                      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        Max Teams: {event.custom_details.max_teams || "N/A"}
                      </div>
                    )}
                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          {formatDate(startDate)} -{" "}
                          {startDate.toDateString() === endDate.toDateString()
                            ? formatTime(startDate)
                            : formatDate(endDate, true)}
                        </span>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.custom_details?.registration_link &&
                        event.custom_details.registration_open && (
                          <Button asChild>
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
                      <NavLink to={`/events/${event.id}`}>
                        <Button
                          className="cursor-pointer"
                          variant={
                            event.custom_details?.registration_open
                              ? "outline"
                              : "default"
                          }
                        >
                          View Event
                        </Button>
                      </NavLink>
                    </div>
                  </div>
                )}

                <div>
                  {event.custom_details.division && (
                    <div className="flex justify-center">
                      <h1 className="w-fit text-2xl">
                        {event.custom_details.division === "honors"
                          ? "Honors Division"
                          : "Open Division"}
                      </h1>
                    </div>
                  )}
                  {event.custom_details.registration_open &&
                    event.custom_details.registration_deadline && (
                      <div className="inline-block rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                        <p className="text-md font-medium text-blue-900 dark:text-blue-100">
                          Registration Open
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Deadline:{" "}
                          {new Date(
                            event.custom_details.registration_deadline,
                          ).toLocaleDateString()}
                        </p>
                        {event.custom_details.max_teams && (
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p>Max Teams: {event.custom_details.max_teams}</p>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
