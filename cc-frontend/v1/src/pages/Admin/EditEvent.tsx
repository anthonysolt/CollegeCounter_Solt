import { useState, useEffect } from "react";
import {
  fetchPublicEvents,
  fetchAdminCustomEvents,
  fetchSeasons,
  fetchAllTeams,
  createAdminCustomEvent,
  updateAdminCustomEvent,
  deleteAdminCustomEvent,
  fetchPublicTeams,
} from "@/services/api";
import type {
  PublicEvent,
  CustomEvent,
  Season,
  Team,
  CustomEventCreateRequest,
  CustomEventUpdateRequest,
  PublicTeam,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import SearchSelect, {
  useSearchSelectOptions,
} from "@/components/SearchSelect";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { AlertCircle, Check, Plus, Trash2 } from "lucide-react";

// Helper functions for timezone conversion
const dateToLocalInput = (isoString: string | null | undefined): string => {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Format: YYYY-MM-DDTHH:mm (local time for datetime-local input)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const localInputToISO = (localDateTimeString: string): string => {
  if (!localDateTimeString) return "";
  // Parse as local time and convert to ISO string
  const date = new Date(localDateTimeString);
  return date.toISOString();
};

function EditEvent() {
  const [activeTab, setActiveTab] = useState<"edit" | "create">("edit");
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventsData, customEventsData, seasonsData, teamsData] =
          await Promise.all([
            fetchPublicEvents({ page_size: 1000 }), // Get all events
            fetchAdminCustomEvents(),
            fetchSeasons(),
            fetchAllTeams(),
          ]);
        setEvents(eventsData.results);
        setCustomEvents(customEventsData.custom_events);
        setSeasons(seasonsData);
        setTeams(teamsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setNotification({
          type: "error",
          message: "Failed to load data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const refreshEvents = async () => {
    try {
      const [eventsData, customEventsData] = await Promise.all([
        fetchPublicEvents({ page_size: 1000 }),
        fetchAdminCustomEvents(),
      ]);
      setEvents(eventsData.results);
      setCustomEvents(customEventsData.custom_events);
    } catch (error) {
      console.error("Error refreshing events:", error);
    }
  };

  // Combine regular events and custom events for selection
  const allSelectableEvents = [
    // First, add all custom events
    ...customEvents.map((ce) => ({
      id: ce.id,
      name: ce.event.name,
      start_date: ce.event.start_date,
      type: "custom" as const,
      eventId: ce.event.id,
    })),
    // Then, add base events that DON'T have a custom event wrapper
    ...events
      .filter((event) => !customEvents.some((ce) => ce.event.id === event.id))
      .map((event) => ({
        id: event.id,
        name: event.name,
        start_date: event.start_date,
        type: "base" as const,
        eventId: event.id,
      })),
  ].sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
  );

  return (
    <div className="container mx-auto py-6">
      <h2 className="mb-6 text-3xl font-bold">Event Management</h2>

      {notification && (
        <div
          className={`mb-4 rounded p-4 ${
            notification.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <Check className="mr-2 inline" size={16} />
          ) : (
            <AlertCircle className="mr-2 inline" size={16} />
          )}
          {notification.message}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "edit" | "create")}
      >
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="edit">Edit Event</TabsTrigger>
          <TabsTrigger value="create">Create Event</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Select Event</CardTitle>
                <CardDescription>
                  Choose an event to edit its details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : (
                  <SearchSelect
                    options={allSelectableEvents.map((event) => ({
                      value: event.id,
                      label: `${event.name} (${new Date(event.start_date).toLocaleDateString()})`,
                    }))}
                    value={selectedEventId || ""}
                    onValueChange={setSelectedEventId}
                    placeholder="Select an event"
                    searchPlaceholder="Search events..."
                    allowClear
                  />
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>Update the event information</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEventId ? (
                  (() => {
                    const selectedEvent = allSelectableEvents.find(
                      (e) => e.id === selectedEventId,
                    );

                    if (!selectedEvent) {
                      return (
                        <p className="text-muted-foreground py-8 text-center">
                          Event not found
                        </p>
                      );
                    }

                    if (selectedEvent.type === "custom") {
                      const customEvent = customEvents.find(
                        (ce) => ce.id === selectedEventId,
                      );
                      return customEvent ? (
                        <EventEditForm
                          customEvent={customEvent}
                          setNotification={setNotification}
                          onEventUpdated={refreshEvents}
                          onEventDeleted={() => {
                            refreshEvents();
                            setSelectedEventId(null);
                          }}
                        />
                      ) : null;
                    } else {
                      // Base event - show option to convert to custom event
                      const baseEvent = events.find(
                        (e) => e.id === selectedEventId,
                      );
                      return baseEvent ? (
                        <div className="space-y-4">
                          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                              Base Event
                            </h3>
                            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                              This event was created through the import flow and
                              doesn't have extended details yet.
                            </p>
                            <div className="mt-3 space-y-2">
                              <p className="text-sm">
                                <span className="font-medium">Name:</span>{" "}
                                {baseEvent.name}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Start:</span>{" "}
                                {new Date(
                                  baseEvent.start_date,
                                ).toLocaleString()}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">End:</span>{" "}
                                {new Date(baseEvent.end_date).toLocaleString()}
                              </p>
                              {baseEvent.description && (
                                <p className="text-sm">
                                  <span className="font-medium">
                                    Description:
                                  </span>{" "}
                                  {baseEvent.description}
                                </p>
                              )}
                              {baseEvent.season && (
                                <p className="text-sm">
                                  <span className="font-medium">Season:</span>{" "}
                                  {baseEvent.season.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                // Create a custom event wrapper for this base event
                                const createData: CustomEventCreateRequest = {
                                  event_id: baseEvent.id,
                                  is_public: true,
                                  is_featured: false,
                                  is_trophycase: false, 
                                  registration_open: false,
                                };
                                const result =
                                  await createAdminCustomEvent(createData);
                                await refreshEvents();
                                setNotification({
                                  type: "success",
                                  message:
                                    "Event converted to custom event successfully",
                                });
                                // Switch to the newly created custom event
                                setSelectedEventId(result.custom_event_id);
                              } catch (error) {
                                console.error(
                                  "Error converting to custom event:",
                                  error,
                                );
                                setNotification({
                                  type: "error",
                                  message: "Failed to convert event",
                                });
                              }
                            }}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Convert to Custom Event
                          </Button>
                        </div>
                      ) : null;
                    }
                  })()
                ) : (
                  <p className="text-muted-foreground py-8 text-center">
                    Select an event to edit its details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card className="mx-auto max-w-4xl">
            <CardHeader>
              <CardTitle>Create New Event</CardTitle>
              <CardDescription>
                Add a new custom event to the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventCreateForm
                seasons={seasons}
                teams={teams}
                events={events}
                setNotification={setNotification}
                onEventCreated={refreshEvents}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EventEditFormProps {
  customEvent: CustomEvent;
  setNotification: (
    notification: { type: "success" | "error"; message: string } | null,
  ) => void;
  onEventUpdated: () => void;
  onEventDeleted: () => void;
}

function EventEditForm({
  customEvent,
  setNotification,
  onEventUpdated,
  onEventDeleted,
}: EventEditFormProps) {
  const [formData, setFormData] = useState({
    event_id: customEvent.event.id,
    name: customEvent.event.name,
    start_date: dateToLocalInput(customEvent.event.start_date),
    end_date: dateToLocalInput(customEvent.event.end_date),
    description: customEvent.event.description || "",
    picture: customEvent.event.picture || "",
    winner_id: customEvent.event.winner?.id || "",
    bracket_link: customEvent.bracket_link || "",
    stream_link: customEvent.stream_link || "",
    secondary_stream_link: customEvent.secondary_stream_link || "",
    discord_link: customEvent.discord_link || "",
    registration_link: customEvent.registration_link || "",
    rules_document: customEvent.rules_document || "",
    prize_pool: parseFloat(customEvent.prize_pool || "0"),
    prize_currency: customEvent.prize_currency || "USD",
    max_teams: customEvent.max_teams || undefined,
    entry_fee: parseFloat(customEvent.entry_fee || "0"),
    format: customEvent.format || "",
    game_mode: customEvent.game_mode || "",
    division: customEvent.division || "",
    is_featured: customEvent.is_featured,
    is_trophycase: customEvent.is_trophycase, 
    is_public: customEvent.is_public,
    registration_open: customEvent.registration_open,
    registration_deadline: dateToLocalInput(customEvent.registration_deadline),
    twitter_hashtag: customEvent.twitter_hashtag || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [eventTeams, setEventTeams] = useState<PublicTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Update form data when event changes
  useEffect(() => {
    setFormData({
      event_id: customEvent.event.id,
      name: customEvent.event.name,
      start_date: dateToLocalInput(customEvent.event.start_date),
      end_date: dateToLocalInput(customEvent.event.end_date),
      description: customEvent.event.description || "",
      picture: customEvent.event.picture || "",
      winner_id: customEvent.event.winner?.id || "",
      bracket_link: customEvent.bracket_link || "",
      stream_link: customEvent.stream_link || "",
      secondary_stream_link: customEvent.secondary_stream_link || "",
      discord_link: customEvent.discord_link || "",
      registration_link: customEvent.registration_link || "",
      rules_document: customEvent.rules_document || "",
      prize_pool: parseFloat(customEvent.prize_pool || "0"),
      prize_currency: customEvent.prize_currency || "USD",
      max_teams: customEvent.max_teams || undefined,
      entry_fee: parseFloat(customEvent.entry_fee || "0"),
      format: customEvent.format || "",
      game_mode: customEvent.game_mode || "",
      division: customEvent.division || "",
      is_featured: customEvent.is_featured,
      is_trophycase: customEvent.is_trophycase, 
      is_public: customEvent.is_public,
      registration_open: customEvent.registration_open,
      registration_deadline: dateToLocalInput(
        customEvent.registration_deadline,
      ),
      twitter_hashtag: customEvent.twitter_hashtag || "",
    });
  }, [customEvent]);

  // Fetch teams for this event
  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      try {
        const teamsData = await fetchPublicTeams({
          event_id: customEvent.event.id,
          page_size: 1000,
        });
        setEventTeams(teamsData.results);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, [customEvent.event.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "prize_pool" || name === "entry_fee" || name === "max_teams"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked: boolean, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: CustomEventUpdateRequest = {
        name: formData.name,
        start_date: formData.start_date
          ? localInputToISO(formData.start_date)
          : undefined,
        end_date: formData.end_date
          ? localInputToISO(formData.end_date)
          : undefined,
        description: formData.description || undefined,
        picture: formData.picture || undefined,
        winner_id: formData.winner_id || undefined,
        bracket_link: formData.bracket_link || undefined,
        stream_link: formData.stream_link || undefined,
        secondary_stream_link: formData.secondary_stream_link || undefined,
        discord_link: formData.discord_link || undefined,
        registration_link: formData.registration_link || undefined,
        rules_document: formData.rules_document || undefined,
        prize_pool: formData.prize_pool || undefined,
        prize_currency: formData.prize_currency || undefined,
        max_teams: formData.max_teams || undefined,
        entry_fee: formData.entry_fee || undefined,
        format: formData.format || undefined,
        game_mode: formData.game_mode || undefined,
        division: formData.division || undefined,
        is_featured: formData.is_featured,
        is_trophycase: formData.is_trophycase, 
        is_public: formData.is_public,
        registration_open: formData.registration_open,
        registration_deadline: formData.registration_deadline
          ? localInputToISO(formData.registration_deadline)
          : undefined,
        twitter_hashtag: formData.twitter_hashtag || undefined,
      };

      await updateAdminCustomEvent(customEvent.id, updateData);
      onEventUpdated();
      setNotification({
        type: "success",
        message: "Event updated successfully",
      });
    } catch (error) {
      console.error("Error updating event:", error);
      setNotification({
        type: "error",
        message: "Failed to update event",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAdminCustomEvent(customEvent.id);
      onEventDeleted();
      setNotification({
        type: "success",
        message: "Event deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      setNotification({
        type: "error",
        message: "Failed to delete event",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Basic Event Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time *</Label>
              <Input
                id="end_date"
                name="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="picture">Picture URL</Label>
            <Input
              id="picture"
              name="picture"
              type="url"
              value={formData.picture}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Links Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Links & Resources</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bracket_link">Bracket Link</Label>
              <Input
                id="bracket_link"
                name="bracket_link"
                type="url"
                value={formData.bracket_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stream_link">Stream Link</Label>
              <Input
                id="stream_link"
                name="stream_link"
                type="url"
                value={formData.stream_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secondary_stream_link">
                Secondary Stream Link
              </Label>
              <Input
                id="secondary_stream_link"
                name="secondary_stream_link"
                type="url"
                value={formData.secondary_stream_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord_link">Discord Link</Label>
              <Input
                id="discord_link"
                name="discord_link"
                type="url"
                value={formData.discord_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_link">Registration Link</Label>
              <Input
                id="registration_link"
                name="registration_link"
                type="url"
                value={formData.registration_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules_document">Rules Document URL</Label>
              <Input
                id="rules_document"
                name="rules_document"
                type="url"
                value={formData.rules_document}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Competition Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Competition Details</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prize_pool">Prize Pool</Label>
              <Input
                id="prize_pool"
                name="prize_pool"
                type="number"
                min="0"
                step="0.01"
                value={formData.prize_pool}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prize_currency">Prize Currency</Label>
              <Select
                value={formData.prize_currency}
                onValueChange={(value) =>
                  handleSelectChange(value, "prize_currency")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry Fee</Label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                min="0"
                step="0.01"
                value={formData.entry_fee}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_teams">Max Teams</Label>
              <Input
                id="max_teams"
                name="max_teams"
                type="number"
                min="1"
                value={formData.max_teams || ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Input
                id="format"
                name="format"
                value={formData.format}
                onChange={handleInputChange}
                placeholder="e.g., Single Elimination, Round Robin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="game_mode">Game Mode</Label>
              <Input
                id="game_mode"
                name="game_mode"
                value={formData.game_mode}
                onChange={handleInputChange}
                placeholder="e.g., 5v5, 1v1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            <Select
              value={formData.division || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, division: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select division (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="honors">Honors</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_deadline">Registration Deadline</Label>
            <Input
              id="registration_deadline"
              name="registration_deadline"
              type="datetime-local"
              value={formData.registration_deadline}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter_hashtag">Twitter Hashtag</Label>
            <Input
              id="twitter_hashtag"
              name="twitter_hashtag"
              value={formData.twitter_hashtag}
              onChange={handleInputChange}
              placeholder="#EventName"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Settings</h3>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "is_featured")
              }
            />
            <Label htmlFor="is_featured">Featured Event</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_trophycase"
              checked={formData.is_trophycase}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "is_trophycase")
              }
            />
            <Label htmlFor="is_trophycase"> Trophy Case Event</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "is_public")
              }
            />
            <Label htmlFor="is_public">Public Event</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="registration_open"
              checked={formData.registration_open}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "registration_open")
              }
            />
            <Label htmlFor="registration_open">Registration Open</Label>
          </div>

          {/* Winner Selection */}
          <div className="space-y-2">
            <Label htmlFor="winner_id">Event Winner</Label>
            {loadingTeams ? (
              <div className="flex items-center justify-center p-2">
                <Spinner className="h-4 w-4" />
              </div>
            ) : (
              <SearchSelect
                options={[
                  { value: "", label: "No Winner Selected" },
                  ...eventTeams.map((team) => ({
                    value: team.id,
                    label: team.name,
                  })),
                ]}
                value={formData.winner_id}
                onValueChange={(value) =>
                  handleSelectChange(value, "winner_id")
                }
                placeholder="Select winning team"
                searchPlaceholder="Search teams..."
                allowClear
              />
            )}
            {customEvent.event.winner && (
              <p className="text-muted-foreground text-sm">
                Current winner: {customEvent.event.winner.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              "Save Event"
            )}
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to delete this event? This action cannot be undone.",
                )
              ) {
                handleDelete();
              }
            }}
          >
            {deleting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Deleting...
              </>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface EventCreateFormProps {
  seasons: Season[];
  teams: Team[];
  events: PublicEvent[];
  setNotification: (
    notification: { type: "success" | "error"; message: string } | null,
  ) => void;
  onEventCreated: () => void;
}

function EventCreateForm({
  seasons,
  teams,
  events,
  setNotification,
  onEventCreated,
}: EventCreateFormProps) {
  // seasons and teams are available for future enhancements
  console.log("Available data:", {
    seasons: seasons.length,
    teams: teams.length,
  });
  const [formData, setFormData] = useState({
    event_id: "", // Can extend existing event
    name: "",
    start_date: "",
    end_date: "",
    description: "",
    picture: "",
    winner_id: "",
    bracket_link: "",
    stream_link: "",
    secondary_stream_link: "",
    discord_link: "",
    registration_link: "",
    rules_document: "",
    prize_pool: 0,
    prize_currency: "USD",
    max_teams: undefined as number | undefined,
    entry_fee: 0,
    format: "",
    game_mode: "",
    division: "",
    is_featured: false,
    is_trophycase: false, 
    is_public: true,
    registration_open: true,
    registration_deadline: "",
    twitter_hashtag: "",
  });
  const [creating, setCreating] = useState(false);
  const [eventTeams, setEventTeams] = useState<PublicTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Fetch teams when event_id is selected
  useEffect(() => {
    const loadTeams = async () => {
      if (!formData.event_id) {
        setEventTeams([]);
        return;
      }

      setLoadingTeams(true);
      try {
        const teamsData = await fetchPublicTeams({
          event_id: formData.event_id,
          page_size: 1000,
        });
        setEventTeams(teamsData.results);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, [formData.event_id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "prize_pool" || name === "entry_fee" || name === "max_teams"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked: boolean, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation logic depends on whether we're extending an existing event or creating new
    if (!formData.event_id) {
      // Creating new event - require basic fields
      if (!formData.name || !formData.start_date || !formData.end_date) {
        setNotification({
          type: "error",
          message:
            "Please fill in the required fields (name, start date, and end date) or select an existing event to extend",
        });
        return;
      }
    } else {
      // Extending existing event - basic fields are optional since they come from the base event
      console.log("Extending existing event:", formData.event_id);
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setNotification({
        type: "error",
        message: "End date must be after start date",
      });
      return;
    }

    setCreating(true);

    try {
      const createData: CustomEventCreateRequest = {
        // If extending existing event, only send event_id and custom fields
        // If creating new event, send all basic fields + custom fields
        ...(formData.event_id
          ? {
              // Extending existing event - only send event_id and custom fields
              event_id: formData.event_id,
            }
          : {
              // Creating new event - send basic event fields
              name: formData.name,
              start_date: formData.start_date
                ? localInputToISO(formData.start_date)
                : undefined,
              end_date: formData.end_date
                ? localInputToISO(formData.end_date)
                : undefined,
              description: formData.description || undefined,
              picture: formData.picture || undefined,
            }),
        // Always send custom event fields
        winner_id: formData.winner_id || undefined,
        bracket_link: formData.bracket_link || undefined,
        stream_link: formData.stream_link || undefined,
        secondary_stream_link: formData.secondary_stream_link || undefined,
        discord_link: formData.discord_link || undefined,
        registration_link: formData.registration_link || undefined,
        rules_document: formData.rules_document || undefined,
        prize_pool: formData.prize_pool || undefined,
        prize_currency: formData.prize_currency || undefined,
        max_teams: formData.max_teams || undefined,
        entry_fee: formData.entry_fee || undefined,
        format: formData.format || undefined,
        game_mode: formData.game_mode || undefined,
        division: formData.division || undefined,
        is_featured: formData.is_featured,
        is_trophycase: formData.is_trophycase,
        is_public: formData.is_public,
        registration_open: formData.registration_open,
        registration_deadline: formData.registration_deadline
          ? localInputToISO(formData.registration_deadline)
          : undefined,
        twitter_hashtag: formData.twitter_hashtag || undefined,
      };

      await createAdminCustomEvent(createData);
      onEventCreated();
      setNotification({
        type: "success",
        message: "Event created successfully",
      });

      // Reset form
      setFormData({
        event_id: "",
        name: "",
        start_date: "",
        end_date: "",
        description: "",
        picture: "",
        winner_id: "",
        bracket_link: "",
        stream_link: "",
        secondary_stream_link: "",
        discord_link: "",
        registration_link: "",
        rules_document: "",
        prize_pool: 0,
        prize_currency: "USD",
        max_teams: undefined,
        entry_fee: 0,
        format: "",
        game_mode: "",
        division: "",
        is_featured: false,
        is_trophycase: false, 
        is_public: true,
        registration_open: true,
        registration_deadline: "",
        twitter_hashtag: "",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      setNotification({
        type: "error",
        message: "Failed to create event",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Basic Event Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>

          <div className="space-y-2">
            <Label htmlFor="event_id">Extend Existing Event (Optional)</Label>
            <SearchSelect
              options={[
                { value: "", label: "Create New Event" },
                ...useSearchSelectOptions(events, "name", "id"),
              ]}
              value={formData.event_id}
              onValueChange={(value) => handleSelectChange(value, "event_id")}
              placeholder="Select existing event to extend"
              searchPlaceholder="Search events..."
              allowClear
            />
            {formData.event_id ? (
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Extending Existing Event
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Basic event details (name, dates, description) are optional
                  and will inherit from the selected event if not provided.
                  Custom details below will be added as event enhancements.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Creating New Event
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  All basic event details (name, dates) are required for new
                  events.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Event Name {!formData.event_id && "*"}
              {formData.event_id && (
                <span className="text-muted-foreground ml-2 text-sm">
                  (Optional - will use existing event name if not provided)
                </span>
              )}
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required={!formData.event_id}
              placeholder={
                formData.event_id
                  ? "Leave empty to use existing event name"
                  : "Enter event name"
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Start Date & Time {!formData.event_id && "*"}
                {formData.event_id && (
                  <span className="text-muted-foreground ml-2 text-sm">
                    (Optional)
                  </span>
                )}
              </Label>
              <Input
                id="start_date"
                name="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={handleInputChange}
                required={!formData.event_id}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">
                End Date & Time {!formData.event_id && "*"}
                {formData.event_id && (
                  <span className="text-muted-foreground ml-2 text-sm">
                    (Optional)
                  </span>
                )}
              </Label>
              <Input
                id="end_date"
                name="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={handleInputChange}
                required={!formData.event_id}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="picture">Picture URL</Label>
            <Input
              id="picture"
              name="picture"
              type="url"
              value={formData.picture}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Links Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Links & Resources</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bracket_link">Bracket Link</Label>
              <Input
                id="bracket_link"
                name="bracket_link"
                type="url"
                value={formData.bracket_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stream_link">Stream Link</Label>
              <Input
                id="stream_link"
                name="stream_link"
                type="url"
                value={formData.stream_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secondary_stream_link">
                Secondary Stream Link
              </Label>
              <Input
                id="secondary_stream_link"
                name="secondary_stream_link"
                type="url"
                value={formData.secondary_stream_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord_link">Discord Link</Label>
              <Input
                id="discord_link"
                name="discord_link"
                type="url"
                value={formData.discord_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_link">Registration Link</Label>
              <Input
                id="registration_link"
                name="registration_link"
                type="url"
                value={formData.registration_link}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules_document">Rules Document URL</Label>
              <Input
                id="rules_document"
                name="rules_document"
                type="url"
                value={formData.rules_document}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Competition Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Competition Details</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prize_pool">Prize Pool</Label>
              <Input
                id="prize_pool"
                name="prize_pool"
                type="number"
                min="0"
                step="0.01"
                value={formData.prize_pool}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prize_currency">Prize Currency</Label>
              <Select
                value={formData.prize_currency}
                onValueChange={(value) =>
                  handleSelectChange(value, "prize_currency")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry Fee</Label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                min="0"
                step="0.01"
                value={formData.entry_fee}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_teams">Max Teams</Label>
              <Input
                id="max_teams"
                name="max_teams"
                type="number"
                min="1"
                value={formData.max_teams || ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Input
                id="format"
                name="format"
                value={formData.format}
                onChange={handleInputChange}
                placeholder="e.g., Single Elimination, Round Robin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="game_mode">Game Mode</Label>
              <Input
                id="game_mode"
                name="game_mode"
                value={formData.game_mode}
                onChange={handleInputChange}
                placeholder="e.g., 5v5, 1v1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            <Select
              value={formData.division || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, division: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select division (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="honors">Honors</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_deadline">Registration Deadline</Label>
            <Input
              id="registration_deadline"
              name="registration_deadline"
              type="datetime-local"
              value={formData.registration_deadline}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter_hashtag">Twitter Hashtag</Label>
            <Input
              id="twitter_hashtag"
              name="twitter_hashtag"
              value={formData.twitter_hashtag}
              onChange={handleInputChange}
              placeholder="#EventName"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Settings</h3>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "is_featured")
              }
            />
            <Label htmlFor="is_featured">Featured Event</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "is_public")
              }
            />
            <Label htmlFor="is_public">Public Event</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="registration_open"
              checked={formData.registration_open}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "registration_open")
              }
            />
            <Label htmlFor="registration_open">Registration Open</Label>
          </div>

          {/* Winner Selection */}
          <div className="space-y-2">
            <Label htmlFor="winner_id">Event Winner</Label>
            {loadingTeams ? (
              <div className="flex items-center justify-center p-2">
                <Spinner className="h-4 w-4" />
              </div>
            ) : (
              <SearchSelect
                options={[
                  { value: "", label: "No Winner Selected" },
                  ...eventTeams.map((team) => ({
                    value: team.id,
                    label: team.name,
                  })),
                ]}
                value={formData.winner_id}
                onValueChange={(value) =>
                  handleSelectChange(value, "winner_id")
                }
                placeholder="Select winning team"
                searchPlaceholder="Search teams..."
                allowClear
              />
            )}
            {formData.event_id && eventTeams.length === 0 && !loadingTeams && (
              <p className="text-muted-foreground text-sm">
                No teams found for this event
              </p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={creating}>
          {creating ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default EditEvent;
