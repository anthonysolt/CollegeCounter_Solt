from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.core.paginator import Paginator
from django.utils.dateparse import parse_datetime
from datetime import datetime
import uuid

from .models import (
    Team,
    Event,
    EventMatch,
    Player,
    Match,
    Season,
    Participant,
    Ranking,
    RankingItem,
)

# Maximum items per page
MAX_PAGE_SIZE = 100


def safe_uuid(value):
    """Safely convert a value to UUID, handling cases where it might already be a UUID."""
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(value)


@api_view(["GET"])
def public_search(request):
    """
    Public API endpoint to search across teams, players, and events.

    Query Parameters:
    - q: Search query (required)
    - limit: Max results per section (default: 6, max: 20)
    """
    query_text = request.query_params.get("q", "").strip()

    raw_limit = request.query_params.get("limit", "6")
    try:
        limit = int(raw_limit)
    except ValueError:
        limit = 6

    limit = max(1, min(limit, 20))

    if not query_text:
        return Response(
            {
                "query": "",
                "limit": limit,
                "total_results": 0,
                "teams": [],
                "players": [],
                "events": [],
                "matches": [],
            }
        )

    teams = (
        Team.objects.filter(
            Q(name__icontains=query_text) | Q(school_name__icontains=query_text)
        )
        .exclude(name__icontains="bye")
        .order_by("name")[:limit]
    )

    players = (
        Player.objects.filter(
            Q(name__icontains=query_text) | Q(team__name__icontains=query_text),
            visible=True,
        )
        .exclude(elo=1000)
        .select_related("team")
        .order_by("name")[:limit]
    )

    events = (
        Event.objects.filter(
            Q(name__icontains=query_text)
            | Q(description__icontains=query_text)
            | Q(custom_details__division__icontains=query_text)
            | Q(custom_details__format__icontains=query_text)
        )
        .select_related("winner", "season")
        .order_by("-start_date")
        .distinct()[:limit]
    )

    serialized_teams = [
        {
            "id": team.id,
            "name": team.name,
            "school_name": team.school_name,
            "picture": team.picture,
            "elo": team.elo,
        }
        for team in teams
    ]

    serialized_players = [
        {
            "id": player.id,
            "name": player.name,
            "picture": player.picture,
            "elo": player.elo,
            "team": {
                "id": player.team.id,
                "name": player.team.name,
            }
            if player.team
            else None,
        }
        for player in players
    ]

    serialized_events = [
        {
            "id": event.id,
            "name": event.name,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "picture": event.picture,
            "season": {
                "id": event.season.id,
                "name": event.season.name,
            }
            if event.season
            else None,
            "winner": {
                "id": event.winner.id,
                "name": event.winner.name,
            }
            if event.winner
            else None,
        }
        for event in events
    ]

    total_results = (
        len(serialized_teams) + len(serialized_players) + len(serialized_events)
    )

    return Response(
        {
            "query": query_text,
            "limit": limit,
            "total_results": total_results,
            "teams": serialized_teams,
            "players": serialized_players,
            "events": serialized_events,
        }
    )


@api_view(["GET"])
def public_teams(request):
    """
    Public API endpoint to fetch teams with various filters.

    Query Parameters:
    - id: Filter by team ID (comma-separated for multiple)
    - name: Filter by team name (partial match)
    - school_name: Filter by school name (partial match)
    - season_id: Filter by season ID
    - competition_id: Filter by competition ID
    - event_id: Filter teams that have matches in a specific event
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: name)
    - order: Sort order (asc or desc, default: asc)
    - season_id: Filter teams that participated in a specific season

    Returns a paginated list of teams with their current ranking information.
    Each team includes current_ranking with rank and elo from the latest ranking snapshot.
    """
    # Parse query parameters
    team_ids = (
        request.query_params.get("id", "").split(",")
        if request.query_params.get("id")
        else []
    )
    team_ids = [id.strip() for id in team_ids if id.strip()]

    name = request.query_params.get("name", "")
    school_name = request.query_params.get("school_name", "")
    season_id = request.query_params.get("season_id", "")
    competition_id = request.query_params.get("competition_id", "")
    event_id = request.query_params.get("event_id", "")

    page = int(request.query_params.get("page", "1"))
    page_size = min(int(request.query_params.get("page_size", "20")), MAX_PAGE_SIZE)

    sort_field = request.query_params.get("sort", "name")
    sort_order = request.query_params.get("order", "asc")

    # Sort
    valid_sort_fields = ["name", "school_name", "elo"]
    if sort_field not in valid_sort_fields:
        sort_field = "name"

    if sort_order.lower() == "desc":
        sort_field = f"-{sort_field}"

    # Build query and filter
    query = Q()

    if team_ids:
        query &= Q(id__in=team_ids)

    if name:
        query &= Q(name__icontains=name)

    if school_name:
        query &= Q(school_name__icontains=school_name)

    # Handle season_id and competition_id filtering through Participant model
    if season_id or competition_id:
        participant_query = Q()

        if season_id:
            try:
                safe_uuid(season_id)  # Validate UUID
                participant_query &= Q(season_id=season_id)
            except ValueError:
                return Response(
                    {"error": "Invalid season_id format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if competition_id:
            try:
                safe_uuid(competition_id)  # Validate UUID
                participant_query &= Q(competition_id=competition_id)
            except ValueError:
                return Response(
                    {"error": "Invalid competition_id format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        team_ids_from_participants = Participant.objects.filter(
            participant_query
        ).values_list("team_id", flat=True)

        query &= Q(id__in=team_ids_from_participants)

    # Handle event_id filtering through EventMatch and Match models
    if event_id:
        try:
            safe_uuid(event_id)  # Validate UUID
            # Find teams that have matches in the specified event
            # Teams can be either team1 or team2 in matches that are part of an event
            team_ids_from_event = set()

            # Get all match IDs for the event
            match_ids = EventMatch.objects.filter(event_id=event_id).values_list(
                "match_id", flat=True
            )

            # Get team IDs from those matches (both team1 and team2)
            team1_ids = Match.objects.filter(id__in=match_ids).values_list(
                "team1_id", flat=True
            )
            team2_ids = Match.objects.filter(id__in=match_ids).values_list(
                "team2_id", flat=True
            )

            team_ids_from_event.update(team1_ids)
            team_ids_from_event.update(team2_ids)

            query &= Q(id__in=list(team_ids_from_event))
        except ValueError:
            return Response(
                {"error": "Invalid event_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    query &= ~Q(name__icontains="bye")

    teams = Team.objects.filter(query).order_by(sort_field)

    # Paginate
    paginator = Paginator(teams, page_size)

    try:
        paginated_teams = paginator.page(page)
    except Exception:
        paginated_teams = paginator.page(paginator.num_pages)

    # Format response
    result = {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page,
        "page_size": page_size,
        "results": [],
    }

    for team in paginated_teams:
        captain = None
        if team.captain:
            captain = {
                "id": team.captain.id,
                "name": team.captain.name,
                "picture": team.captain.picture,
            }

        # Get current competitions for the team
        current_competitions = []
        today = datetime.now().date()

        # Find current season - convert datetime fields to dates for comparison
        current_season = None
        for season in Season.objects.all():
            if (
                season.start_date
                and season.end_date
                and season.start_date.date() <= today <= season.end_date.date()
            ):
                current_season = season
                break

        print(f"Today: {today}")
        print(f"Current season: {current_season}")

        if current_season:
            # Get all the team's current participations in this season
            current_participants = (
                Participant.objects.filter(team=team, season=current_season)
                .select_related("competition")
                .all()
            )

            for participant in current_participants:
                if participant.competition:
                    current_competitions.append(
                        {
                            "id": participant.competition.id,
                            "name": participant.competition.name,
                        }
                    )

        # Get current ranking for the team
        current_ranking = None
        if current_season:
            # Get the latest ranking for the current season
            latest_ranking = (
                Ranking.objects.filter(season=current_season).order_by("-date").first()
            )
            if latest_ranking:
                # Get the team's ranking item in this ranking
                ranking_item = RankingItem.objects.filter(
                    ranking=latest_ranking, team=team
                ).first()
                if ranking_item:
                    current_ranking = {
                        "id": ranking_item.id,
                        "rank": ranking_item.rank,
                        "elo": ranking_item.elo,
                        "ranking": {
                            "id": latest_ranking.id,
                            "date": latest_ranking.date,
                        },
                        "season": {
                            "id": current_season.id,
                            "name": current_season.name,
                        },
                    }

        result["results"].append(
            {
                "id": team.id,
                "name": team.name,
                "picture": team.picture,
                "school_name": team.school_name,
                "elo": team.elo,
                "captain": captain,
                "current_competitions": current_competitions,
                "current_ranking": current_ranking,
            }
        )

    return Response(result)


@api_view(["GET"])
def public_players(request):
    """
    Public API endpoint to fetch players with various filters.

    Query Parameters:
    - id: Filter by player ID (comma-separated for multiple)
    - name: Filter by player name (partial match)
    - team_id: Filter by team ID
    - steam_id: Filter by Steam ID
    - faceit_id: Filter by Faceit ID
    - visible: Filter by visibility (true/false)
    - benched: Filter by bench status (true/false)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: name)
    - order: Sort order (asc or desc, default: asc)
    - season_id: Filter players that participated in a specific season

    Returns a paginated list of players.
    """
    # Parse query parameters
    player_ids = (
        request.query_params.get("id", "").split(",")
        if request.query_params.get("id")
        else []
    )
    player_ids = [id.strip() for id in player_ids if id.strip()]

    name = request.query_params.get("name", "")
    team_id = request.query_params.get("team_id", "")
    steam_id = request.query_params.get("steam_id", "")
    faceit_id = request.query_params.get("faceit_id", "")
    season_id = request.query_params.get("season_id", "")

    visible = request.query_params.get("visible", "")
    benched = request.query_params.get("benched", "")

    page = int(request.query_params.get("page", "1"))
    page_size = min(int(request.query_params.get("page_size", "20")), MAX_PAGE_SIZE)

    sort_field = request.query_params.get("sort", "name")
    sort_order = request.query_params.get("order", "asc")

    # sort
    valid_sort_fields = ["name", "elo", "skill_level"]
    if sort_field not in valid_sort_fields:
        sort_field = "name"

    if sort_order.lower() == "desc":
        sort_field = f"-{sort_field}"

    # Build query and filter
    query = Q()

    if player_ids:
        query &= Q(id__in=player_ids)

    if name:
        query &= Q(name__icontains=name)

    if team_id:
        try:
            uuid.UUID(team_id)  # Validate UUID
            query &= Q(team_id=team_id)
        except ValueError:
            return Response(
                {"error": "Invalid team_id format"}, status=status.HTTP_400_BAD_REQUEST
            )

    if steam_id:
        query &= Q(steam_id=steam_id)

    if faceit_id:
        query &= Q(faceit_id=faceit_id)

    if visible.lower() in ["true", "false"]:
        query &= Q(visible=(visible.lower() == "true"))

    if benched.lower() in ["true", "false"]:
        query &= Q(benched=(benched.lower() == "true"))

    if not visible:
        query &= Q(visible=True)

    if season_id:
        try:
            uuid.UUID(season_id)  # Validate UUID
            query &= Q(seasons__id=season_id)
        except ValueError:
            return Response(
                {"error": "Invalid season_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    players = Player.objects.filter(query).order_by(sort_field)

    # Paginate
    paginator = Paginator(players, page_size)

    try:
        paginated_players = paginator.page(page)
    except Exception:
        paginated_players = paginator.page(paginator.num_pages)

    # Format response
    result = {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page,
        "page_size": page_size,
        "results": [],
    }

    for player in paginated_players:
        team = None
        if player.team:
            team = {
                "id": player.team.id,
                "name": player.team.name,
                "picture": player.team.picture,
            }

        result["results"].append(
            {
                "id": player.id,
                "name": player.name,
                "picture": player.picture,
                "skill_level": player.skill_level,
                "steam_id": player.steam_id,
                "faceit_id": player.faceit_id,
                "elo": player.elo,
                "team": team,
                "benched": player.benched,
                "visible": player.visible,
            }
        )

    return Response(result)


@api_view(["GET"])
def public_matches(request):
    """
    Public API endpoint to fetch matches with various filters.

    Query Parameters:
    - id: Filter by match ID (comma-separated for multiple)
    - team_id: Filter by team ID (matches where team is team1 or team2)
    - team_id_1: Filter by first team ID (requires team_id_2, matches between these two teams)
    - team_id_2: Filter by second team ID (requires team_id_1, matches between these two teams)
    - status: Filter by status (scheduled, in_progress, completed, cancelled)
    - platform: Filter by platform (faceit, playfly)
    - date_from: Filter by date (matches after this date, format: YYYY-MM-DD)
    - date_to: Filter by date (matches before this date, format: YYYY-MM-DD)
    - season_id: Filter by season ID
    - competition_id: Filter by competition ID
    - event_id: Filter by event ID (matches that are part of a specific event)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: -date for most recent first)
    - order: Sort order (asc or desc, default: asc)

    Returns a paginated list of matches.
    """
    # Parse query parameters
    match_ids = (
        request.query_params.get("id", "").split(",")
        if request.query_params.get("id")
        else []
    )
    match_ids = [id.strip() for id in match_ids if id.strip()]

    team_id = request.query_params.get("team_id", "")
    team_id_1 = request.query_params.get("team_id_1", "")
    team_id_2 = request.query_params.get("team_id_2", "")
    status = request.query_params.get("status", "")
    platform = request.query_params.get("platform", "")
    date_from = request.query_params.get("date_from", "")
    date_to = request.query_params.get("date_to", "")
    season_id = request.query_params.get("season_id", "")
    competition_id = request.query_params.get("competition_id", "")
    competition_name = request.query_params.get("competition_name", "")
    event_id = request.query_params.get("event_id", "")

    page = int(request.query_params.get("page", "1"))
    page_size = min(int(request.query_params.get("page_size", "20")), MAX_PAGE_SIZE)

    sort_field = request.query_params.get("sort", "date")
    sort_order = request.query_params.get("order", "desc")  # Default to most recent

    # sort
    valid_sort_fields = ["date", "status"]
    if sort_field not in valid_sort_fields:
        sort_field = "date"

    if sort_order.lower() == "desc":
        sort_field = f"-{sort_field}"

    # Build query and filter
    query = Q()

    if match_ids:
        query &= Q(id__in=match_ids)

    if team_id:
        try:
            uuid.UUID(team_id)
            query &= Q(team1_id=team_id) | Q(team2_id=team_id)
        except ValueError:
            return Response(
                {"error": "Invalid team_id format"}, status=status.HTTP_400_BAD_REQUEST
            )

    # Filter matches between two specific teams
    if team_id_1 and team_id_2:
        try:
            uuid.UUID(team_id_1)
            uuid.UUID(team_id_2)
            # Matches where team_id_1 and team_id_2 are either team1 or team2
            query &= (Q(team1_id=team_id_1) & Q(team2_id=team_id_2)) | (
                Q(team1_id=team_id_2) & Q(team2_id=team_id_1)
            )
        except ValueError:
            return Response(
                {"error": "Invalid team_id_1 or team_id_2 format"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif team_id_1 or team_id_2:
        # If only one is provided, return an error
        return Response(
            {"error": "Both team_id_1 and team_id_2 must be provided together"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if status and status in ["scheduled", "in_progress", "completed", "cancelled"]:
        query &= Q(status=status)

    if platform and platform in ["faceit", "playfly"]:
        query &= Q(platform=platform)

    if date_from:
        try:
            # Try parsing as full datetime first (ISO format)
            from_date = parse_datetime(date_from)
            # If that fails, try parsing as date and add time
            if not from_date:
                from_date = parse_datetime(f"{date_from}T00:00:00Z")
            if from_date:
                query &= Q(date__gte=from_date)
        except Exception:
            return Response(
                {
                    "error": "Invalid date_from format. Use YYYY-MM-DD or ISO datetime format."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    if date_to:
        try:
            # Try parsing as full datetime first (ISO format)
            to_date = parse_datetime(date_to)
            # If that fails, try parsing as date and add end of day time
            if not to_date:
                to_date = parse_datetime(f"{date_to}T23:59:59Z")
            if to_date:
                query &= Q(date__lte=to_date)
        except Exception:
            return Response(
                {
                    "error": "Invalid date_to format. Use YYYY-MM-DD or ISO datetime format."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    if season_id:
        try:
            uuid.UUID(season_id)  # Validate UUID
            query &= Q(season_id=season_id)
        except ValueError:
            return Response(
                {"error": "Invalid season_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if competition_id:
        try:
            uuid.UUID(competition_id)  # Validate UUID
            query &= Q(competition_id=competition_id)
        except ValueError:
            return Response(
                {"error": "Invalid competition_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if competition_name:
        # Filter by competition name using the relationship
        query &= Q(competition__name__icontains=competition_name)

    if event_id:
        try:
            uuid.UUID(event_id)  # Validate UUID
            # Filter matches that have an EventMatch relationship with the specified event
            query &= Q(event_matches__event_id=event_id)
        except ValueError:
            return Response(
                {"error": "Invalid event_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    query &= ~Q(team1__name__icontains="bye") & ~Q(team2__name__icontains="bye")

    matches = (
        Match.objects.filter(query)
        .select_related("team1", "team2", "winner", "season", "competition")
        .prefetch_related("event_matches__event")
        .order_by(sort_field)
    )

    # Paginate
    paginator = Paginator(matches, page_size)

    try:
        paginated_matches = paginator.page(page)
    except Exception:
        paginated_matches = paginator.page(paginator.num_pages)

    # Format response
    result = {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page,
        "page_size": page_size,
        "results": [],
    }

    for match in paginated_matches:
        winner = None
        if match.winner:
            winner = {
                "id": match.winner.id,
                "name": match.winner.name,
            }

        # Get event match data if exists
        event_match_data = None
        try:
            event_match = EventMatch.objects.filter(match=match).first()
            if event_match:
                event_match_data = {
                    "id": event_match.id,
                    "event": {
                        "id": event_match.event.id,
                        "name": event_match.event.name,
                    },
                    "round": event_match.round,
                    "num_in_bracket": event_match.num_in_bracket,
                    "is_bye": event_match.is_bye,
                    "extra_info": event_match.extra_info,
                }
        except Exception:
            # Handle case where EventMatch query fails
            pass

        result["results"].append(
            {
                "id": match.id,
                "team1": {
                    "id": match.team1.id,
                    "name": match.team1.name,
                    "picture": match.team1.picture,
                    "elo": match.team1.elo,
                },
                "team2": {
                    "id": match.team2.id,
                    "name": match.team2.name,
                    "picture": match.team2.picture,
                    "elo": match.team2.elo,
                },
                "date": match.date,
                "status": match.status,
                "url": match.url,
                "winner": winner,
                "score_team1": match.score_team1,
                "score_team2": match.score_team2,
                "platform": match.platform,
                "season": {"id": match.season.id, "name": match.season.name}
                if match.season
                else None,
                "competition": {
                    "id": match.competition.id,
                    "name": match.competition.name,
                }
                if match.competition
                else None,
                "event_match": event_match_data,
            }
        )

    return Response(result)


@api_view(["GET"])
def public_seasons(request):
    """
    Public API endpoint to fetch seasons.

    Query Parameters:
    - id: Filter by season ID (comma-separated for multiple)
    - current: Filter for current season (true/false)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: -start_date for most recent first)
    - order: Sort order (asc or desc, default: desc)

    Returns a paginated list of seasons.
    """
    # Parse query parameters
    season_ids = (
        request.query_params.get("id", "").split(",")
        if request.query_params.get("id")
        else []
    )
    season_ids = [id.strip() for id in season_ids if id.strip()]

    current = request.query_params.get("current", "")

    page = int(request.query_params.get("page", "1"))
    page_size = min(int(request.query_params.get("page_size", "20")), MAX_PAGE_SIZE)

    sort_field = request.query_params.get("sort", "start_date")
    sort_order = request.query_params.get("order", "desc")  # Default to most recent

    # sort
    valid_sort_fields = ["name", "start_date", "end_date"]
    if sort_field not in valid_sort_fields:
        sort_field = "start_date"

    if sort_order.lower() == "desc":
        sort_field = f"-{sort_field}"

    # Build query and filter
    query = Q()

    if season_ids:
        query &= Q(id__in=season_ids)

    if current.lower() == "true":
        today = datetime.now().date()
        query &= Q(start_date__lte=today, end_date__gte=today)

    seasons = Season.objects.filter(query).order_by(sort_field)

    paginator = Paginator(seasons, page_size)

    try:
        paginated_seasons = paginator.page(page)
    except Exception:
        paginated_seasons = paginator.page(paginator.num_pages)

    # Format response
    result = {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page,
        "page_size": page_size,
        "results": [],
    }

    for season in paginated_seasons:
        # Convert datetime to date for comparison if needed
        current_date = datetime.now().date()
        is_current = False
        if season.start_date and season.end_date:
            is_current = (
                season.start_date.date() <= current_date <= season.end_date.date()
            )

        result["results"].append(
            {
                "id": season.id,
                "name": season.name,
                "start_date": season.start_date,
                "end_date": season.end_date,
                "is_current": is_current,
            }
        )

    return Response(result)


@api_view(["GET"])
def public_rankings(request):
    """
    Public API endpoint to fetch rankings with various filters.

    Query Parameters:
    - season_id: Filter by season ID (required for filtering)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: -date for most recent first)
    - order: Sort order (asc or desc, default: desc)

    Returns a paginated list of rankings.
    """
    # Parse query parameters
    season_id = request.query_params.get("season_id", "")

    page = int(request.query_params.get("page", "1"))
    page_size = min(int(request.query_params.get("page_size", "20")), MAX_PAGE_SIZE)

    sort_field = request.query_params.get("sort", "date")
    sort_order = request.query_params.get("order", "desc")  # Default to most recent

    # sort
    valid_sort_fields = ["date"]
    if sort_field not in valid_sort_fields:
        sort_field = "date"

    if sort_order.lower() == "desc":
        sort_field = f"-{sort_field}"

    # Build query and filter
    query = Q()

    if season_id:
        try:
            uuid.UUID(season_id)  # Validate UUID
            query &= Q(season_id=season_id)
        except ValueError:
            return Response(
                {"error": "Invalid season_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    rankings = Ranking.objects.filter(query).order_by(sort_field)

    paginator = Paginator(rankings, page_size)

    try:
        paginated_rankings = paginator.page(page)
    except Exception:
        paginated_rankings = paginator.page(paginator.num_pages)

    # Format response
    result = {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page,
        "page_size": page_size,
        "results": [],
    }

    for ranking in paginated_rankings:
        result["results"].append(
            {
                "id": ranking.id,
                "date": ranking.date,
                "season": {
                    "id": ranking.season.id,
                    "name": ranking.season.name,
                }
                if ranking.season
                else None,
            }
        )

    return Response(result)


@api_view(["GET"])
def public_ranking_items(request):
    """
    Public API endpoint to fetch ranking items for a specific ranking.

    Query Parameters:
    - ranking_id: Filter by ranking ID (required)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: rank)
    - order: Sort order (asc or desc, default: asc)

    Returns a paginated list of ranking items.
    """
    # Parse query parameters
    ranking_id = request.query_params.get("ranking_id", "")

    if not ranking_id:
        return Response(
            {"error": "ranking_id parameter is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    page = int(request.query_params.get("page", "1"))
    page_size = min(int(request.query_params.get("page_size", "20")), MAX_PAGE_SIZE)

    sort_field = request.query_params.get("sort", "rank")
    sort_order = request.query_params.get("order", "asc")  # Default to rank order

    # sort
    valid_sort_fields = ["rank", "elo"]
    if sort_field not in valid_sort_fields:
        sort_field = "rank"

    if sort_order.lower() == "desc":
        sort_field = f"-{sort_field}"

    # Build query and filter
    query = Q()

    try:
        uuid.UUID(ranking_id)  # Validate UUID
        query &= Q(ranking_id=ranking_id)
    except ValueError:
        return Response(
            {"error": "Invalid ranking_id format"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ranking_items = (
        RankingItem.objects.filter(query)
        .select_related("team", "ranking")
        .order_by(sort_field)
    )

    paginator = Paginator(ranking_items, page_size)

    try:
        paginated_items = paginator.page(page)
    except Exception:
        paginated_items = paginator.page(paginator.num_pages)

    # Format response
    result = {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page,
        "page_size": page_size,
        "results": [],
    }

    for item in paginated_items:
        result["results"].append(
            {
                "id": item.id,
                "rank": item.rank,
                "elo": item.elo,
                "team": {
                    "id": item.team.id,
                    "name": item.team.name,
                    "picture": item.team.picture,
                    "school_name": item.team.school_name,
                },
                "ranking": {
                    "id": item.ranking.id,
                    "date": item.ranking.date,
                },
            }
        )

    return Response(result)


@api_view(["GET"])
def public_team_current_ranking(request):
    """
    Public API endpoint to fetch a team's current ranking by team ID.

    Query Parameters:
    - team_id: Team ID (required)
    - season_id: Season ID (optional, defaults to current season)

    Returns the team's current ranking item for the specified season.
    """
    team_id = request.query_params.get("team_id", "")
    season_id = request.query_params.get("season_id", "")

    if not team_id:
        return Response(
            {"error": "team_id parameter is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        uuid.UUID(team_id)
    except ValueError:
        return Response(
            {"error": "Invalid team_id format"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine season
    if not season_id:
        today = datetime.now().date()
        current_season = None

        # Find current season - convert datetime fields to dates for comparison
        for season in Season.objects.all():
            if (
                season.start_date
                and season.end_date
                and season.start_date.date() <= today <= season.end_date.date()
            ):
                current_season = season
                break

        if not current_season:
            return Response(
                {"error": "No current season found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        season_id = str(current_season.id)
    else:
        try:
            uuid.UUID(season_id)
        except ValueError:
            return Response(
                {"error": "Invalid season_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Get latest ranking for season
    ranking = Ranking.objects.filter(season_id=season_id).order_by("-date").first()
    if not ranking:
        return Response(
            {"error": "No ranking found for this season"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get ranking item for team
    item = (
        RankingItem.objects.filter(ranking_id=ranking.id, team_id=team_id)
        .select_related("team", "ranking")
        .first()
    )
    if not item:
        return Response(
            {"error": "No ranking item found for this team in the current ranking"},
            status=status.HTTP_404_NOT_FOUND,
        )

    result = {
        "id": item.id,
        "rank": item.rank,
        "elo": item.elo,
        "team": {
            "id": item.team.id,
            "name": item.team.name,
            "picture": item.team.picture,
            "school_name": item.team.school_name,
        },
        "ranking": {
            "id": item.ranking.id,
            "date": item.ranking.date,
        },
        "season": {
            "id": ranking.season.id,
            "name": ranking.season.name,
        }
        if ranking.season
        else None,
    }

    return Response(result)


@api_view(["GET"])
def public_events(request):
    """
    Public API endpoint to fetch events with various filters.

    Query Parameters:
    - id: Filter by event ID (comma-separated for multiple)
    - name: Filter by event name (partial match)
    - season_id: Filter by season ID
    - featured: Filter by featured status (true/false)
    - public_only: Only show public events (default: true)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort: Sort field (default: start_date)
    - order: Sort order (asc or desc, default: desc)

    Returns a paginated list of events.
    """

    # Parse query parameters
    event_ids = (
        request.query_params.get("id", "").split(",")
        if request.query_params.get("id")
        else []
    )
    event_ids = [id.strip() for id in event_ids if id.strip()]

    name = request.query_params.get("name", "").strip()
    season_id = request.query_params.get("season_id", "").strip()
    winner_id = request.query_params.get("winner_id", "").strip()
    featured = request.query_params.get("featured", "").lower()
    trophycase = request.query_params.get("trophycase", "").lower()
    public_only = request.query_params.get("public_only", "true").lower() == "true"

    page = int(request.query_params.get("page", 1))
    page_size = min(int(request.query_params.get("page_size", 20)), MAX_PAGE_SIZE)
    sort_field = request.query_params.get("sort", "start_date")
    order = request.query_params.get("order", "desc")

    # Start with base Event queryset
    queryset = (
        Event.objects.select_related("winner", "season")
        .prefetch_related("custom_details")
        .all()
    )

    # Apply filters
    if event_ids:
        try:
            event_uuids = [safe_uuid(id) for id in event_ids]
            queryset = queryset.filter(id__in=event_uuids)
        except ValueError:
            return Response(
                {"error": "Invalid event ID format"}, status=status.HTTP_400_BAD_REQUEST
            )

    if name:
        queryset = queryset.filter(name__icontains=name)

    if season_id:
        try:
            season_uuid = safe_uuid(season_id)
            queryset = queryset.filter(season_id=season_uuid)
        except ValueError:
            return Response(
                {"error": "Invalid season ID format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if winner_id:
        try:
            queryset = queryset.filter(winner_id=safe_uuid(winner_id))
        except ValueError:
            return Response(
                {"error": "Invalid winner ID format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if trophycase == "true":
        queryset = queryset.filter(
            Q(is_trophycase=True) | Q(custom_details__is_trophycase=True)
        )
    elif trophycase == "false":
        queryset = queryset.exclude(
            Q(is_trophycase=True) | Q(custom_details__is_trophycase=True)
        )

    # Filter by public/featured status if custom event exists
    if public_only or featured:
        custom_event_filters = Q()
        if public_only:
            # Only show events that either don't have custom details or have public custom details
            custom_event_filters |= Q(custom_details__isnull=True) | Q(
                custom_details__is_public=True
            )
        if featured == "true":
            custom_event_filters &= Q(custom_details__is_featured=True)
        elif featured == "false":
            custom_event_filters &= Q(custom_details__is_featured=False)

        queryset = queryset.filter(custom_event_filters)

    # Apply sorting
    valid_sort_fields = ["name", "start_date", "end_date"]
    if sort_field not in valid_sort_fields:
        sort_field = "start_date"

    if order not in ["asc", "desc"]:
        order = "desc"

    order_prefix = "" if order == "asc" else "-"
    queryset = queryset.order_by(f"{order_prefix}{sort_field}")

    # Paginate results
    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page)

    # Serialize results
    results = []
    for event in page_obj:
        # Check if there's a custom event associated
        custom_event = getattr(event, "custom_details", None)

        event_data = {
            "id": event.id,
            "name": event.name,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "description": event.description,
            "picture": event.picture,
            "is_trophycase": event.is_trophycase,
            "winner": {
                "id": event.winner.id,
                "name": event.winner.name,
                "picture": event.winner.picture,
                "school_name": event.winner.school_name,
            }
            if event.winner
            else None,
            "season": {
                "id": event.season.id,
                "name": event.season.name,
            }
            if event.season
            else None,
        }

        # Add custom event data if exists
        if custom_event:
            event_data["custom_details"] = {
                "id": custom_event.id,
                "bracket_link": custom_event.bracket_link,
                "stream_link": custom_event.stream_link,
                "secondary_stream_link": custom_event.secondary_stream_link,
                "discord_link": custom_event.discord_link,
                "registration_link": custom_event.registration_link,
                "rules_document": custom_event.rules_document,
                "prize_pool": str(custom_event.prize_pool)
                if custom_event.prize_pool
                else None,
                "prize_currency": custom_event.prize_currency,
                "max_teams": custom_event.max_teams,
                "entry_fee": str(custom_event.entry_fee)
                if custom_event.entry_fee
                else None,
                "format": custom_event.format,
                "game_mode": custom_event.game_mode,
                "division": custom_event.division,
                "is_featured": custom_event.is_featured,
                "is_trophycase": custom_event.is_trophycase,
                "is_public": custom_event.is_public,
                "registration_open": custom_event.registration_open,
                "registration_deadline": custom_event.registration_deadline,
                "twitter_hashtag": custom_event.twitter_hashtag,
                "metadata": custom_event.metadata,
            }

        results.append(event_data)

    return Response(
        {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page,
            "page_size": page_size,
            "results": results,
        }
    )


@api_view(["GET"])
def public_event_detail(request, event_id):
    """
    Public API endpoint to fetch a single event by ID.
    """
    try:
        event_uuid = safe_uuid(event_id)
        event = (
            Event.objects.select_related("winner", "season")
            .prefetch_related("custom_details")
            .get(id=event_uuid)
        )

        # Check if event is public (if it has custom details)
        custom_event = getattr(event, "custom_details", None)
        if custom_event and not custom_event.is_public:
            return Response(
                {"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND
            )

        event_data = {
            "id": event.id,
            "name": event.name,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "description": event.description,
            "picture": event.picture,
            "is_trophycase": event.is_trophycase,
            "winner": {
                "id": event.winner.id,
                "name": event.winner.name,
                "picture": event.winner.picture,
                "school_name": event.winner.school_name,
            }
            if event.winner
            else None,
            "season": {
                "id": event.season.id,
                "name": event.season.name,
            }
            if event.season
            else None,
        }

        # Add custom event data if exists
        if custom_event:
            event_data["custom_details"] = {
                "id": custom_event.id,
                "bracket_link": custom_event.bracket_link,
                "stream_link": custom_event.stream_link,
                "secondary_stream_link": custom_event.secondary_stream_link,
                "discord_link": custom_event.discord_link,
                "registration_link": custom_event.registration_link,
                "rules_document": custom_event.rules_document,
                "prize_pool": str(custom_event.prize_pool)
                if custom_event.prize_pool
                else None,
                "prize_currency": custom_event.prize_currency,
                "max_teams": custom_event.max_teams,
                "entry_fee": str(custom_event.entry_fee)
                if custom_event.entry_fee
                else None,
                "format": custom_event.format,
                "game_mode": custom_event.game_mode,
                "division": custom_event.division,
                "is_featured": custom_event.is_featured,
                "is_trophycase": custom_event.is_trophycase,
                "is_public": custom_event.is_public,
                "registration_open": custom_event.registration_open,
                "registration_deadline": custom_event.registration_deadline,
                "twitter_hashtag": custom_event.twitter_hashtag,
                "metadata": custom_event.metadata,
            }

        return Response(event_data)

    except ValueError:
        return Response(
            {"error": "Invalid event ID format"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
def public_team_recent_form(request):
    """
    Public API endpoint to fetch a team's recent match form.

    Query Parameters:
    - team_id: Team ID (required)
    - limit: Number of recent matches to fetch (default: 5, max: 20)

    Returns a list of recent matches with results.
    """
    try:
        team_id = request.query_params.get("team_id")
        if not team_id:
            return Response(
                {"error": "Missing team_id parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        team_uuid = safe_uuid(team_id)
    except ValueError:
        return Response(
            {"error": "Invalid team_id format"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    limit = min(int(request.query_params.get("limit", 3)), 5)

    matches = (
        Match.objects.filter(
            Q(team1_id=team_uuid) | Q(team2_id=team_uuid), status="completed"
        )
        .select_related("team1", "team2", "winner")
        .order_by("-date")[:limit]
    )

    results = []
    for match in matches:
        winner_pk = getattr(match.winner, "pk", None)
        if winner_pk is None:
            result = "draw"  # or "unknown" / "abandoned" depending on your domain
        elif winner_pk == team_uuid:
            result = "win"
        else:
            result = "loss"

        # determine the opponent object safely
        opponent = (
            match.team2
            if getattr(match, "team1_id", None) == team_uuid
            else match.team1
        )

        results.append(
            {
                "result": result,
                "opponent": {
                    "id": opponent.id,
                    "name": opponent.name,
                    "picture": opponent.picture,
                },
            }
        )
    return Response({"team_id": team_id, "recent_form": results})


@api_view(["GET"])
def public_team_ranking_history(request):
    """
    Public API endpoint to fetch a team's ranking history.

    Query Parameters:
    - team_id: Team ID (required)
    - season_id: Season ID (optional)

    Returns a list of ranking items for the team.
    """
    try:
        team_id = request.query_params.get("team_id")
        if not team_id:
            return Response(
                {"error": "Missing team_id parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        team_uuid = safe_uuid(team_id)
    except ValueError:
        return Response(
            {"error": "Invalid team_id format"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    season_id = request.query_params.get("season_id")
    season_filter = Q()
    if season_id:
        try:
            season_uuid = safe_uuid(season_id)
            season_filter = Q(ranking__season_id=season_uuid)
        except ValueError:
            return Response(
                {"error": "Invalid season_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    ranking_items = (
        RankingItem.objects.filter(Q(team_id=team_uuid) & season_filter)
        .select_related("ranking", "ranking__season")
        .order_by("-ranking__date")
    )

    results = []
    for item in ranking_items:
        results.append(
            {
                "id": item.id,
                "rank": item.rank,
                "elo": item.elo,
                "ranking_date": item.ranking.date,
                "season": {
                    "id": item.ranking.season.id,
                    "name": item.ranking.season.name,
                }
                if item.ranking.season
                else None,
            }
        )
    return Response({"team_id": team_id, "ranking_history": results})
