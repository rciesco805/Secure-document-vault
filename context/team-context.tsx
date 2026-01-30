import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSession } from "next-auth/react";

import { useTeams } from "@/lib/swr/use-teams";
import { Team } from "@/lib/types";
import { CustomUser } from "@/lib/types";

interface TeamContextProps {
  children: React.ReactNode;
}

export type TeamContextType = {
  teams: Team[];
  currentTeam: Team | null;
  currentTeamId: string | null;
  isLoading: boolean;
  setCurrentTeam: (team: Team) => void;
};

export const initialState = {
  teams: [],
  currentTeam: null,
  currentTeamId: null,
  isLoading: false,
  setCurrentTeam: (team: Team) => {},
};

const TeamContext = createContext<TeamContextType>(initialState);

// Helper to get user-scoped localStorage key
const getStorageKey = (userId: string | undefined) => {
  return userId ? `currentTeamId_${userId}` : null;
};

// Helper to clean up old global key and migrate to user-scoped key
const cleanupLegacyStorage = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("currentTeamId");
  }
};

export const TeamProvider = ({ children }: TeamContextProps): React.ReactNode => {
  const sessionData = useSession();
  const session = sessionData?.data;
  const sessionStatus = sessionData?.status ?? "loading";
  const { teams, loading: teamsLoading } = useTeams();
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const userId = (session?.user as CustomUser)?.id;
  const storageKey = getStorageKey(userId);

  // Clean up legacy global storage key on mount
  useEffect(() => {
    cleanupLegacyStorage();
  }, []);

  // Effect to set and validate currentTeam whenever teams or session changes
  useEffect(() => {
    // Wait for both session and teams to be ready
    if (sessionStatus === "loading" || teamsLoading) {
      return;
    }

    // If no teams available, clear current team
    if (!teams || teams.length === 0) {
      setCurrentTeamState(null);
      setHasHydrated(true);
      return;
    }

    // Get saved team ID from user-scoped storage
    let savedTeamId: string | null = null;
    if (storageKey && typeof localStorage !== "undefined") {
      savedTeamId = localStorage.getItem(storageKey);
    }

    // Validate: Check if saved team ID belongs to current user's teams
    let validTeam: Team | null = null;
    if (savedTeamId) {
      validTeam = teams.find((team) => team.id === savedTeamId) || null;
    }

    // If saved team is invalid or not found, default to first team
    if (!validTeam && teams.length > 0) {
      validTeam = teams[0];
    }

    // Set the current team
    if (validTeam) {
      setCurrentTeamState(validTeam);
      // Update storage with valid team ID
      if (storageKey && typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, validTeam.id);
      }
    }

    setHasHydrated(true);
  }, [teams, teamsLoading, sessionStatus, storageKey, userId]);

  // Clear team state and storage when user signs out
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      setCurrentTeamState(null);
      setHasHydrated(false);
      // Clean up all user-scoped team keys on logout
      if (typeof localStorage !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("currentTeamId_")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    }
  }, [sessionStatus]);

  const setCurrentTeam = useCallback(
    (team: Team) => {
      setCurrentTeamState(team);
      if (storageKey && typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, team.id);
      }
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({
      teams: teams || [],
      currentTeam,
      currentTeamId: currentTeam?.id || null,
      isLoading: sessionStatus === "loading" || teamsLoading || !hasHydrated,
      setCurrentTeam,
    }),
    [teams, currentTeam, sessionStatus, teamsLoading, hasHydrated, setCurrentTeam],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => useContext(TeamContext);
