import Logo from "@/components/Logo";
import RankBadge from "@/components/RankBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { usePublicSearch } from "@/services/hooks";
import client from "@/services/sanity-client";
import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router";

interface SearchArticle {
  _id: string;
  title: string;
  slug: { _type: "slug"; current: string };
  publishedAt: string;
  imageUrl?: string;
  author?: string;
}

export function Search() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  const { data, isLoading, error } = usePublicSearch(
    {
      q: query,
      limit: 8,
    },
    {
      enabled: query.length > 0,
    },
  );

  useEffect(() => {
    const fetchArticles = async () => {
      if (!query) {
        setArticles([]);
        return;
      }

      try {
        setArticlesLoading(true);

        const pattern = `*${query.replace(/[*\\]/g, "")}*`;
        const articleQuery = `*[_type == "post" && title match $pattern] | order(publishedAt desc){
          _id,
          title,
          slug,
          publishedAt,
          "imageUrl": image.asset->url,
          author
        }`;

        const result = await client.fetch(articleQuery, { pattern });
        setArticles(result || []);
      } catch (articleError) {
        console.error("Error fetching search articles:", articleError);
        setArticles([]);
      } finally {
        setArticlesLoading(false);
      }
    };

    fetchArticles();
  }, [query]);

  document.title = query
    ? `Search: ${query} - College Counter`
    : "Search - College Counter";

  const totalResults =
    (data?.teams.length || 0) +
    (data?.players.length || 0) +
    (data?.events.length || 0) +
    articles.length;

  const hasResults = totalResults > 0;
  const isSearchLoading = isLoading || articlesLoading;

  return (
    <div className="app-container mx-4 flex justify-center">
      <div className="w-full max-w-[1000px]">
        <div className="mb-6">
          <h1>Search</h1>
          <p className="text-muted-foreground">
            {query ? (
              <>
                Results for <span className="text-foreground">"{query}"</span>
              </>
            ) : (
              "Enter a search query in the navbar to find teams, players, events, and articles."
            )}
          </p>
          <hr />
        </div>

        {!query ? (
          <div className="text-muted-foreground rounded-xl border p-6 text-center">
            Start typing in the search bar above and press enter.
          </div>
        ) : isSearchLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle className="text-lg">Error</AlertTitle>
            <AlertDescription>
              There was an error loading search results. Please try again later.
            </AlertDescription>
          </Alert>
        ) : !hasResults ? (
          <div className="rounded-xl border p-6 text-center">
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground mt-2">
              Try a different keyword, team name, or event name.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <SearchSection title="Teams" count={data?.teams.length || 0}>
              {(data?.teams || []).map((team) => (
                <li key={team.id}>
                  <NavLink
                    to={`/teams/${team.id}`}
                    className="hover:bg-muted flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex justify-between">
                      <div className="flex items-center space-x-2">
                        <Logo
                          src={team.picture}
                          className="h-8 w-8 rounded-sm"
                          alt="pfp"
                          type="team"
                        />
                        <span className="whitespace-nowrap text-xl">
                          {team.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="flex items-center space-x-1"></div>
                        </div>
                      </div>
                    </div>
                  </NavLink>
                </li>
              ))}
            </SearchSection>

            <SearchSection title="Players" count={data?.players.length || 0}>
              {(data?.players || []).map((player) => (
                <li key={player.id} className="rounded-lg border p-3">
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
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
                      <NavLink to={`/teams/${player.team?.id}`}>
                        <div className="bg-secondary drop-shadow-secondary drop-shadow-lg/50 hover:bg-secondary/80 ml-2 hidden cursor-pointer rounded-md p-1 px-2 text-xs transition-colors sm:block">
                          {player.team?.name}
                        </div>
                      </NavLink>
                    </div>
                    <div className="flex items-center space-x-4">
                      <RankBadge elo={player.elo || 0} className="h-12 w-12" />
                    </div>
                  </div>
                </li>
              ))}
            </SearchSection>

            <SearchSection title="Events" count={data?.events.length || 0}>
              {(data?.events || []).map((event) => (
                <li key={event.id}>
                  <NavLink
                    to={`/events/${event.id}`}
                    className="hover:bg-muted flex items-center gap-4 rounded-lg border p-3 transition-colors"
                  >
                    <Logo
                      src={event.picture}
                      className="h-16 rounded-sm"
                      alt="pfp"
                      type="team"
                    />
                    <div>
                      <p className="font-semibold">{event.name}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {new Date(event.start_date).toLocaleDateString()} -{" "}
                        {new Date(event.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </NavLink>
                </li>
              ))}
            </SearchSection>

            <SearchSection title="Articles" count={articles.length}>
              {articles.map((article) => (
                <li key={article._id}>
                  <NavLink
                    to={`/news/${article.slug.current}`}
                    className="hover:bg-muted block rounded-lg border p-3 transition-colors"
                  >
                    <p className="font-semibold">{article.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {new Date(article.publishedAt).toLocaleDateString()}
                      {article.author ? ` · ${article.author}` : ""}
                    </p>
                  </NavLink>
                </li>
              ))}
            </SearchSection>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2>{title}</h2>
        <span className="text-muted-foreground text-sm">{count} found</span>
      </div>
      {count > 0 ? (
        <ul className="space-y-2">{children}</ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          No {title.toLowerCase()} found.
        </p>
      )}
    </section>
  );
}
