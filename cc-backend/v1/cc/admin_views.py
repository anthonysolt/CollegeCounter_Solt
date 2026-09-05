from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from .models import Team, Player, Event, CustomEvent, Season
from .middleware import firebase_auth_required
import logging
import requests
from decimal import Decimal
from django.conf import settings
import re

logger = logging.getLogger(__name__)


@api_view(["PUT"])
@firebase_auth_required(min_role="admin")
def update_team(request, team_id):
    """
    Update team information
    """
    try:
        team = Team.objects.get(id=team_id)

        # Update fields if provided
        if "name" in request.data:
            team.name = request.data["name"]
        if "school_name" in request.data:
            team.school_name = request.data["school_name"]
        if "elo" in request.data:
            team.elo = int(request.data["elo"])
        if "picture" in request.data:
            picture_url = request.data["picture"]
            if picture_url and "&token=" in picture_url:
                picture_url = picture_url.split("&token=")[0]
            team.picture = picture_url

        team.save()

        # Return updated team data
        captain = None
        if team.captain:
            captain = {
                "id": team.captain.id,
                "name": team.captain.name,
                "picture": team.captain.picture,
            }

        team_data = {
            "id": team.id,
            "name": team.name,
            "picture": team.picture,
            "school_name": team.school_name,
            "elo": team.elo,
            "captain": captain,
        }

        return Response({"team": team_data})

    except Team.DoesNotExist:
        return Response(
            {"error": f"Team with id {team_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Error updating team {team_id}: {str(e)}")
        return Response(
            {"error": f"Failed to update team: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["PUT"])
@firebase_auth_required(min_role="admin")
def update_player(request, player_id):
    """
    Update player information
    """
    try:
        player = Player.objects.get(id=player_id)

        # Update fields if provided
        if "name" in request.data:
            player.name = request.data["name"]
        if "steam_id" in request.data:
            player.steam_id = request.data["steam_id"] or None
        if "faceit_id" in request.data:
            player.faceit_id = request.data["faceit_id"] or None
        if "elo" in request.data:
            player.elo = int(request.data["elo"])
        if "skill_level" in request.data:
            player.skill_level = int(request.data["skill_level"])
        if "team_id" in request.data:
            team_id = request.data["team_id"]
            if team_id:
                try:
                    team = Team.objects.get(id=team_id)
                    player.team = team
                except Team.DoesNotExist:
                    return Response(
                        {"error": f"Team with id {team_id} not found"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                player.team = None
        if "benched" in request.data:
            player.benched = bool(request.data["benched"])
        if "visible" in request.data:
            player.visible = bool(request.data["visible"])
        if "picture" in request.data:
            picture_url = request.data["picture"]
            if picture_url and "&token=" in picture_url:
                picture_url = picture_url.split("&token=")[0]
            player.picture = picture_url

        player.save()

        # Return updated player data
        team = None
        if player.team:
            team = {
                "id": player.team.id,
                "name": player.team.name,
                "picture": player.team.picture,
            }

        player_data = {
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

        return Response({"player": player_data}, status=status.HTTP_200_OK)

    except Player.DoesNotExist:
        return Response(
            {"error": f"Player with id {player_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Error updating player {player_id}: {str(e)}")
        return Response(
            {"error": f"Failed to update player: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def proxy_image(request):
    """
    Proxy external images to avoid CORS issues in screenshot generation
    """
    image_url = request.GET.get("url")

    if not image_url:
        return Response(
            {"error": "URL parameter is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Set headers to match browser requests for better compatibility
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0",
            "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Referer": request.META.get("HTTP_REFERER", "http://localhost:5173/"),
        }

        # Fetch the image
        response = requests.get(image_url, headers=headers, timeout=10, stream=True)
        response.raise_for_status()

        # Create HTTP response with the image data
        content_type = response.headers.get("Content-Type", "image/jpeg")
        django_response = HttpResponse(response.content, content_type=content_type)

        # Add CORS headers to allow frontend access
        django_response["Access-Control-Allow-Origin"] = "*"
        django_response["Access-Control-Allow-Methods"] = "GET"
        django_response["Access-Control-Allow-Headers"] = "*"

        # Cache headers for better performance
        django_response["Cache-Control"] = "public, max-age=3600"

        return django_response

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching image from {image_url}: {str(e)}")
        return Response(
            {"error": f"Failed to fetch image: {str(e)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        logger.error(f"Unexpected error in proxy_image: {str(e)}")
        return Response(
            {"error": f"Internal server error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@firebase_auth_required(min_role="admin")
def custom_events(request):
    """
    List all custom events or create a new one
    """
    if request.method == "GET":
        try:
            custom_events = CustomEvent.objects.select_related("event").all()
            events_data = []

            for custom_event in custom_events:
                event_data = {
                    "id": custom_event.id,
                    "event": {
                        "id": custom_event.event.id,
                        "name": custom_event.event.name,
                        "start_date": custom_event.event.start_date,
                        "end_date": custom_event.event.end_date,
                        "description": custom_event.event.description,
                        "picture": custom_event.event.picture,
                        "winner": {
                            "id": custom_event.event.winner.id,
                            "name": custom_event.event.winner.name,
                        }
                        if custom_event.event.winner
                        else None,
                    },
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
                    "created_at": custom_event.created_at,
                    "updated_at": custom_event.updated_at,
                }
                events_data.append(event_data)

            return Response({"custom_events": events_data})

        except Exception as e:
            logger.error(f"Error fetching custom events: {str(e)}")
            return Response(
                {"error": f"Failed to fetch custom events: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "POST":
        try:
            # First, create or get the base Event
            event_id = request.data.get("event_id")
            if event_id:
                event = Event.objects.get(id=event_id)
                # Update winner if provided when extending an event
                winner_id = request.data.get("winner_id")
                if winner_id:
                    try:
                        winner_team = Team.objects.get(id=winner_id)
                        event.winner = winner_team
                        event.save()
                    except Team.DoesNotExist:
                        return Response(
                            {"error": f"Team with id {winner_id} not found"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                elif "winner_id" in request.data and not winner_id:
                    # Explicitly clearing the winner
                    event.winner = None
                    event.save()
            else:
                # Create new base event
                event_data = {
                    "name": request.data.get("name", ""),
                    "start_date": request.data.get("start_date"),
                    "end_date": request.data.get("end_date"),
                    "description": request.data.get("description", ""),
                    "picture": request.data.get("picture", ""),
                }

                # Handle winner_id if provided
                winner_id = request.data.get("winner_id")
                if winner_id:
                    try:
                        winner_team = Team.objects.get(id=winner_id)
                        event_data["winner"] = winner_team
                    except Team.DoesNotExist:
                        return Response(
                            {"error": f"Team with id {winner_id} not found"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                event = Event.objects.create(**event_data)

            # Create CustomEvent
            custom_event_data = {
                "event": event,
                "bracket_link": request.data.get("bracket_link", ""),
                "stream_link": request.data.get("stream_link", ""),
                "secondary_stream_link": request.data.get("secondary_stream_link", ""),
                "discord_link": request.data.get("discord_link", ""),
                "registration_link": request.data.get("registration_link", ""),
                "rules_document": request.data.get("rules_document", ""),
                "prize_currency": request.data.get("prize_currency", "USD"),
                "format": request.data.get("format", ""),
                "game_mode": request.data.get("game_mode", ""),
                "division": request.data.get("division", None),
                "is_featured": request.data.get("is_featured", False),
                "is_trophycase": request.data.get("is_trophycase", False),
                "is_public": request.data.get("is_public", True),
                "registration_open": request.data.get("registration_open", False),
                "twitter_hashtag": request.data.get("twitter_hashtag", ""),
                "metadata": request.data.get("metadata", {}),
            }

            # Handle decimal fields
            if "prize_pool" in request.data and request.data["prize_pool"]:
                custom_event_data["prize_pool"] = Decimal(
                    str(request.data["prize_pool"])
                )

            if "entry_fee" in request.data and request.data["entry_fee"]:
                custom_event_data["entry_fee"] = Decimal(str(request.data["entry_fee"]))

            if "max_teams" in request.data and request.data["max_teams"]:
                custom_event_data["max_teams"] = int(request.data["max_teams"])

            if (
                "registration_deadline" in request.data
                and request.data["registration_deadline"]
            ):
                custom_event_data["registration_deadline"] = request.data[
                    "registration_deadline"
                ]

            custom_event = CustomEvent.objects.create(**custom_event_data)

            return Response(
                {
                    "message": "Custom event created successfully",
                    "custom_event_id": custom_event.id,
                    "event_id": event.id,
                },
                status=status.HTTP_201_CREATED,
            )

        except Event.DoesNotExist:
            return Response(
                {"error": "Base event not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error creating custom event: {str(e)}")
            return Response(
                {"error": f"Failed to create custom event: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "PUT", "DELETE"])
@firebase_auth_required(min_role="admin")
def custom_event_detail(request, custom_event_id):
    """
    Get, update, or delete a specific custom event
    """
    try:
        custom_event = CustomEvent.objects.select_related("event").get(
            id=custom_event_id
        )

        if request.method == "GET":
            event_data = {
                "id": custom_event.id,
                "event": {
                    "id": custom_event.event.id,
                    "name": custom_event.event.name,
                    "start_date": custom_event.event.start_date,
                    "end_date": custom_event.event.end_date,
                    "description": custom_event.event.description,
                    "picture": custom_event.event.picture,
                    "winner": {
                        "id": custom_event.event.winner.id,
                        "name": custom_event.event.winner.name,
                    }
                    if custom_event.event.winner
                    else None,
                },
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
                "created_at": custom_event.created_at,
                "updated_at": custom_event.updated_at,
            }
            return Response(event_data)

        elif request.method == "PUT":
            # Update base event fields
            event = custom_event.event
            if "name" in request.data:
                event.name = request.data["name"]
            if "start_date" in request.data:
                event.start_date = request.data["start_date"]
            if "end_date" in request.data:
                event.end_date = request.data["end_date"]
            if "description" in request.data:
                event.description = request.data["description"]
            if "picture" in request.data:
                event.picture = request.data["picture"]
            if "winner_id" in request.data:
                if request.data["winner_id"]:
                    try:
                        winner_team = Team.objects.get(id=request.data["winner_id"])
                        event.winner = winner_team
                    except Team.DoesNotExist:
                        return Response(
                            {
                                "error": f"Team with id {request.data['winner_id']} not found"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    event.winner = None                
            event.save()

            # Update custom event fields
            if "bracket_link" in request.data:
                custom_event.bracket_link = request.data["bracket_link"]
            if "stream_link" in request.data:
                custom_event.stream_link = request.data["stream_link"]
            if "secondary_stream_link" in request.data:
                custom_event.secondary_stream_link = request.data[
                    "secondary_stream_link"
                ]
            if "discord_link" in request.data:
                custom_event.discord_link = request.data["discord_link"]
            if "registration_link" in request.data:
                custom_event.registration_link = request.data["registration_link"]
            if "rules_document" in request.data:
                custom_event.rules_document = request.data["rules_document"]
            if "prize_pool" in request.data:
                custom_event.prize_pool = (
                    Decimal(str(request.data["prize_pool"]))
                    if request.data["prize_pool"]
                    else None
                )
            if "prize_currency" in request.data:
                custom_event.prize_currency = request.data["prize_currency"]
            if "max_teams" in request.data:
                custom_event.max_teams = (
                    int(request.data["max_teams"])
                    if request.data["max_teams"]
                    else None
                )
            if "entry_fee" in request.data:
                custom_event.entry_fee = (
                    Decimal(str(request.data["entry_fee"]))
                    if request.data["entry_fee"]
                    else None
                )
            if "format" in request.data:
                custom_event.format = request.data["format"]
            if "game_mode" in request.data:
                custom_event.game_mode = request.data["game_mode"]
            if "division" in request.data:
                custom_event.division = request.data["division"]
            if "is_featured" in request.data:
                custom_event.is_featured = bool(request.data["is_featured"])
            if "is_trophycase" in request.data:
                custom_event.is_trophycase = bool(request.data["is_trophycase"])
            if "is_public" in request.data:
                custom_event.is_public = bool(request.data["is_public"])
            if "registration_open" in request.data:
                custom_event.registration_open = bool(request.data["registration_open"])
            if "registration_deadline" in request.data:
                custom_event.registration_deadline = request.data[
                    "registration_deadline"
                ]
            if "twitter_hashtag" in request.data:
                custom_event.twitter_hashtag = request.data["twitter_hashtag"]
            if "metadata" in request.data:
                custom_event.metadata = request.data["metadata"]

            custom_event.save()

            return Response({"message": "Custom event updated successfully"})

        elif request.method == "DELETE":
            event = custom_event.event
            custom_event.delete()
            event.delete()  # Also delete the base event

            return Response({"message": "Custom event deleted successfully"})

    except CustomEvent.DoesNotExist:
        return Response(
            {"error": f"Custom event with id {custom_event_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Error in custom_event_detail: {str(e)}")
        return Response(
            {"error": f"Internal server error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@firebase_auth_required(min_role="admin")
def create_event(request):
    """
    Create a new event

    Expected request format:
    {
        "name": "Event Name",
        "start_date": "2025-01-01",
        "end_date": "2025-01-02",
        "description": "Event description", // Optional
        "season_id": "uuid", // Optional
        "picture": "https://...", // Optional
    }
    """
    try:
        # Extract required fields
        name = request.data.get("name")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")

        if not name or not start_date or not end_date:
            return Response(
                {"error": "name, start_date, and end_date are required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract optional fields
        description = request.data.get("description", "")
        picture = request.data.get("picture", "")
        season_id = request.data.get("season_id")

        # Prepare event data
        event_data = {
            "name": name,
            "start_date": start_date,
            "end_date": end_date,
            "description": description,
            "picture": picture,
        }

        # Handle season if provided
        if season_id:
            try:
                season = Season.objects.get(id=season_id)
                event_data["season"] = season
            except Season.DoesNotExist:
                return Response(
                    {"error": f"Season with id {season_id} not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Create the event
        event = Event.objects.create(**event_data)

        # Return created event data
        response_data = {
            "id": str(event.id),
            "name": event.name,
            "start_date": str(event.start_date),
            "end_date": str(event.end_date),
            "description": event.description,
            "picture": event.picture,
        }

        if event.season:
            response_data["season_id"] = str(event.season.id)

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error creating event: {str(e)}")
        return Response(
            {"error": f"Failed to create event: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@firebase_auth_required(min_role="admin")
def import_team_from_faceit(request):
    """
    Import a team from Faceit using a team URL or team ID

    Expected request format:
    {
        "team_url": "https://www.faceit.com/en/teams/abc123-team-name" // OR
        "team_id": "abc123-team-id"
    }

    Returns created team with roster
    """
    try:
        team_url = request.data.get("team_url", "")
        team_id = request.data.get("team_id", "")

        # Extract team ID from URL if provided
        if team_url and not team_id:
            # URL format: https://www.faceit.com/en/teams/{team_id}
            match = re.search(r"/teams/([a-f0-9-]+)", team_url)
            if match:
                team_id = match.group(1)
            else:
                return Response(
                    {"error": "Invalid Faceit team URL format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not team_id:
            return Response(
                {"error": "team_url or team_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch team data from Faceit API
        api_key = getattr(settings, "FACEIT_API_KEY", None)
        if not api_key:
            return Response(
                {"error": "FACEIT_API_KEY not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        headers = {"Authorization": f"Bearer {api_key}"}
        team_url_api = f"https://open.faceit.com/data/v4/teams/{team_id}"

        response = requests.get(team_url_api, headers=headers)

        if response.status_code != 200:
            return Response(
                {"error": f"Failed to fetch team from Faceit: {response.status_code}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team_data = response.json()

        # Extract team info
        team_name = team_data.get("nickname", team_data.get("name", "Unknown Team"))
        team_avatar = team_data.get("avatar", "")

        # Check if team already exists by name or if a participant with this faceit_id exists
        existing_team = Team.objects.filter(name=team_name).first()
        if not existing_team:
            # Also check if there's a participant with this faceit team ID
            from .models import Participant

            existing_participant = Participant.objects.filter(faceit_id=team_id).first()
            if existing_participant and existing_participant.team:
                existing_team = existing_participant.team

        if existing_team:
            return Response(
                {
                    "error": f"Team already exists: {existing_team.name}",
                    "team_id": str(existing_team.id),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the team
        team = Team.objects.create(
            name=team_name,
            picture=team_avatar,
            elo=1000,  # Default ELO
        )

        logger.info(f"Created team: {team_name} (ID: {team.id})")

        # Import roster if available
        members = team_data.get("members", [])
        created_players = []

        for member in members:
            player_id = member.get("user_id")
            if not player_id:
                continue

            # Check if player already exists
            existing_player = Player.objects.filter(faceit_id=player_id).first()
            if existing_player:
                # Update team association if player exists
                if not existing_player.team:
                    existing_player.team = team
                    existing_player.save()
                    created_players.append(
                        {
                            "id": str(existing_player.id),
                            "name": existing_player.name,
                            "existed": True,
                        }
                    )
                continue

            # Fetch player details from Faceit API
            try:
                player_url = f"https://open.faceit.com/data/v4/players/{player_id}"
                player_response = requests.get(player_url, headers=headers)

                if player_response.status_code == 200:
                    player_data = player_response.json()

                    player_name = player_data.get("nickname", "Unknown Player")
                    player_avatar = player_data.get("avatar", "")
                    steam_id = (
                        player_data.get("games", {})
                        .get("cs2", {})
                        .get("game_player_id")
                    )

                    # Get CS2 stats
                    cs2_data = player_data.get("games", {}).get("cs2", {})
                    player_elo = cs2_data.get("faceit_elo", 1000)
                    skill_level = cs2_data.get("skill_level", 1)

                    player = Player.objects.create(
                        name=player_name,
                        picture=player_avatar,
                        faceit_id=player_id,
                        steam_id=steam_id,
                        elo=player_elo,
                        skill_level=skill_level,
                        team=team,
                    )

                    created_players.append(
                        {"id": str(player.id), "name": player_name, "existed": False}
                    )

                    logger.info(f"Created player: {player_name} (ID: {player.id})")
            except Exception as e:
                logger.error(f"Error fetching player {player_id}: {str(e)}")
                continue

        # Return created team data
        response_data = {
            "message": "Team imported successfully",
            "team": {
                "id": str(team.id),
                "name": team.name,
                "picture": team.picture,
                "elo": team.elo,
            },
            "players": created_players,
            "faceit_team_id": team_id,
        }

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error importing team from Faceit: {str(e)}")
        return Response(
            {"error": f"Failed to import team: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@firebase_auth_required(min_role="admin")
def create_competition(request):
    """
    Create a new competition

    Expected request format:
    {
        "name": "Competition Name"
    }
    """
    try:
        name = request.data.get("name")

        if not name:
            return Response(
                {"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if competition with this name already exists
        from .models import Competition

        existing_competition = Competition.objects.filter(name=name).first()
        if existing_competition:
            return Response(
                {
                    "error": f"Competition with name '{name}' already exists",
                    "competition_id": str(existing_competition.id),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the competition
        competition = Competition.objects.create(name=name)

        logger.info(f"Created competition: {name} (ID: {competition.id})")

        return Response(
            {
                "message": "Competition created successfully",
                "competition": {"id": str(competition.id), "name": competition.name},
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Error creating competition: {str(e)}")
        return Response(
            {"error": f"Failed to create competition: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
