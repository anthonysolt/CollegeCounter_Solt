from django.urls import path

from . import public_views

urlpatterns = [
    # Search endpoint
    path("search", public_views.public_search, name="public_search"),
    # Team endpoints
    path("teams", public_views.public_teams, name="public_teams"),
    # Player endpoints
    path("players", public_views.public_players, name="public_players"),
    # Match endpoints
    path("matches", public_views.public_matches, name="public_matches"),
    # Season endpoints
    path("seasons", public_views.public_seasons, name="public_seasons"),
    # Ranking endpoints
    path("rankings", public_views.public_rankings, name="public_rankings"),
    path(
        "ranking-items", public_views.public_ranking_items, name="public_ranking_items"
    ),
    path(
        "team-current-ranking",
        public_views.public_team_current_ranking,
        name="public_team_current_ranking",
    ),
    # Event endpoints
    path("events", public_views.public_events, name="public_events"),
    path(
        "events/<uuid:event_id>",
        public_views.public_event_detail,
        name="public_event_detail",
    ),
    path(
        "team_recent_form",
        public_views.public_team_recent_form,
        name="public_team_recent_form",
    ),
    path(
        "team_ranking_history",
        public_views.public_team_ranking_history,
        name="public_team_ranking_history",
    ),
]
