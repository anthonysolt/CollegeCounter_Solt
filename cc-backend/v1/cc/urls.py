from django.urls import path, include

from . import views
from . import admin_views
from . import webhooks

urlpatterns = [
    path("", views.index, name="index"),
    path("import-matches/", views.import_matches, name="import_matches"),
    path("seasons/", views.list_seasons, name="list_seasons"),
    path("seasons/create/", views.create_season, name="create_season"),
    path("events/create/", admin_views.create_event, name="create_event"),
    path("teams/", views.list_teams, name="list_teams"),
    path("players/", views.list_players, name="list_players"),
    path("matches/", views.list_matches, name="list_matches"),
    path("matches/create/", views.create_match, name="create_match"),
    path("event-matches/create/", views.create_event_match, name="create_event_match"),
    path(
        "event-matches/<uuid:match_id>/update/",
        views.update_event_match,
        name="update_event_match",
    ),
    path("matches/<uuid:match_id>/", views.get_match, name="get_match"),
    path("matches/<uuid:match_id>/update/", views.update_match, name="update_match"),
    path(
        "matches/<uuid:match_id>/apply-elo/",
        views.apply_match_elo,
        name="apply_match_elo",
    ),
    path("matches/<uuid:match_id>/delete/", views.delete_match, name="delete_match"),
    path("matches/update/", views.update_matches, name="update_matches"),
    path("clear-database/", views.clear_database, name="clear_database"),
    path("participants/", views.match_participants, name="match_participants"),
    path("player-elo/update/", views.update_player_elo, name="update_player_elo"),
    path("player-elo/reset/", views.reset_player_elo, name="reset_player_elo"),
    path("team-elo/calculate/", views.calculate_team_elos, name="calculate_team_elos"),
    path("team-elo/recalculate/", views.recalculate_elos, name="recalculate_elos"),
    path(
        "rankings/snapshot/",
        views.create_ranking_snapshot,
        name="create_ranking_snapshot",
    ),
    path("merge-teams/", views.merge_teams, name="merge_teams"),
    path("competitions/", views.list_competitions, name="list_competitions"),
    path(
        "competitions/create/",
        admin_views.create_competition,
        name="create_competition",
    ),
    path(
        "competitions/<uuid:competition_id>/",
        views.delete_competition,
        name="delete_competition",
    ),
    # Team and player update endpoints (admin functionality)
    path("teams/<uuid:team_id>/", admin_views.update_team, name="update_team"),
    path(
        "teams/import-faceit/",
        admin_views.import_team_from_faceit,
        name="import_team_from_faceit",
    ),
    path("players/<uuid:player_id>/", admin_views.update_player, name="update_player"),
    # Image proxy endpoint for CORS-free image access
    path("proxy/image/", admin_views.proxy_image, name="proxy_image"),
    # Custom events endpoints
    path("custom-events/", admin_views.custom_events, name="custom_events"),
    path(
        "custom-events/<uuid:custom_event_id>/",
        admin_views.custom_event_detail,
        name="custom_event_detail",
    ),
    # LeagueSpot API proxy endpoints
    path(
        "proxy/leaguespot/seasons/<str:season_id>/",
        views.proxy_leaguespot_season,
        name="proxy_leaguespot_season",
    ),
    path(
        "proxy/leaguespot/stages/<str:stage_id>/",
        views.proxy_leaguespot_stage,
        name="proxy_leaguespot_stage",
    ),
    path(
        "proxy/leaguespot/rounds/<str:round_id>/matches/",
        views.proxy_leaguespot_round_matches,
        name="proxy_leaguespot_round_matches",
    ),
    path(
        "proxy/leaguespot/matches/<str:match_id>/",
        views.proxy_leaguespot_match,
        name="proxy_leaguespot_match",
    ),
    path(
        "proxy/leaguespot/matches/<str:match_id>/participants/",
        views.proxy_leaguespot_participants,
        name="proxy_leaguespot_participants",
    ),
    path("proxy/nwes/", views.proxy_nwes, name="proxy_nwes"),
    path(
        "sanity-webhook/",
        webhooks.SanityWebhookView.as_view(),
        name="sanity_webhook",
    ),
    # Include public API endpoints
    path("public/", include("cc.urls_public")),
]
