import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { useEffect, useState } from "react";
import logo from "../assets/0.1x/C Logo@0.1x.png";
import { Search } from "lucide-react";

function Navbar() {
  const location = useLocation();

  const isDevelopment =
    import.meta.env.VITE_API_BASE_URL?.includes("localhost") ||
    import.meta.env.VITE_API_BASE_URL?.includes("127.0.0.1");

  return (
    <nav className="bg-background/80 border-border sticky top-0 z-50 w-full px-4 py-3 backdrop-blur-md">
      {isDevelopment && (
        <div className="mb-4 bg-yellow-500 px-4 py-2 text-center text-sm font-semibold text-black">
          🚧 DEVELOPMENT MODE - Using local API
        </div>
      )}
      <div className="container mx-auto flex max-w-[1200px] items-center justify-between">
        <NavLink to="/" className="flex items-center">
          <img
            src={logo}
            alt="College Counter Logo"
            className="mr-2 h-10 w-10 rounded-sm"
          />
          <div
            className={`font-block hidden text-3xl lg:block ${
              location.pathname === "/"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            College Counter
          </div>
        </NavLink>
        <ul className="flex space-x-6">
          <li>
            <NavLink
              to="/news"
              className={`transition-colors hover:text-blue-200 ${
                location.pathname === "/news"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              News
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/rankings"
              className={`transition-colors hover:text-blue-200 ${
                location.pathname === "/rankings"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Rankings
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/matches"
              className={`transition-colors hover:text-blue-200 ${
                location.pathname === "/matches"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Matches
            </NavLink>
          </li>

          <li>
            <NavLink
              to={"/events"}
              className={`transition-colors hover:text-blue-200 ${
                location.pathname === "/events"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Events
            </NavLink>
          </li>
        </ul>
        <div className="hidden md:block">
          <SearchInput />
        </div>
      </div>
      <div className="mt-2 block md:hidden">
        <SearchInput />
      </div>
    </nav>
  );
}

export default Navbar;

function SearchInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (location.pathname === "/search") {
      setQuery(searchParams.get("q") || "");
      return;
    }

    setQuery("");
  }, [location.pathname, searchParams]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search teams, players, events, matches..."
        autoComplete="off"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="cursor-pointer"
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
