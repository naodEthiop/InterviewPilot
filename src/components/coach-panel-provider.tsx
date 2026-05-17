import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

type CoachPanelCtx = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CoachPanelContext = createContext<CoachPanelCtx | null>(null);

export function CoachPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/interview/")) setOpen(false);
  }, [location.pathname]);

  return (
    <CoachPanelContext.Provider value={{ open, setOpen }}>
      {children}
    </CoachPanelContext.Provider>
  );
}

export function useCoachPanel() {
  const ctx = useContext(CoachPanelContext);
  if (!ctx) throw new Error("useCoachPanel must be used within CoachPanelProvider");
  return ctx;
}
