"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RciPayload, RciPhotos } from "@/lib/rci/fields";
import {
  RCI_FIELD_GROUPS,
  isGroupFilled,
  normalizeEventType,
  requirementFor,
  type RciEventType,
  type RciFieldGroup,
  type Requirement,
} from "@/lib/rci/guidance";
import { FieldSet } from "./fields-ui";

/**
 * Contexte de guidage : la typologie d'événement et l'état de saisie sont lus
 * une fois au niveau du wizard, puis consommés par chaque rubrique. Évite de
 * faire transiter `eventType` dans les props de toutes les étapes.
 */
type GuidanceCtx = {
  eventType: RciEventType;
  payload: RciPayload;
  photos: RciPhotos;
};

const Ctx = createContext<GuidanceCtx | null>(null);

export function GuidanceProvider({
  payload,
  photos,
  children,
}: {
  payload: RciPayload;
  photos: RciPhotos;
  children: ReactNode;
}) {
  const eventType = normalizeEventType(payload.event_type);
  const value = useMemo<GuidanceCtx>(
    () => ({ eventType, payload, photos }),
    [eventType, payload, photos],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const GROUPS_BY_ID = new Map(RCI_FIELD_GROUPS.map((g) => [g.id, g]));

function useGroup(groupId: string): {
  group: RciFieldGroup | undefined;
  requirement: Requirement;
  filled: boolean;
} {
  const ctx = useContext(Ctx);
  const group = GROUPS_BY_ID.get(groupId);
  if (!ctx || !group) {
    return { group, requirement: "conditional", filled: false };
  }
  return {
    group,
    requirement: requirementFor(group, ctx.eventType),
    filled: isGroupFilled(group, ctx.payload, ctx.photos),
  };
}

/**
 * Rubrique du wizard branchée sur la grille d'analyse : elle affiche d'elle-même
 * ce que la situation déclarée attend d'elle, et se replie quand elle est sans
 * objet — sans jamais interdire la saisie (un RCI atypique reste possible).
 */
export function GuidedFieldSet({
  groupId,
  title,
  hint,
  children,
}: {
  groupId: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const { group, requirement, filled } = useGroup(groupId);
  // Une rubrique sans objet déjà remplie reste ouverte : on n'escamote pas
  // une saisie existante derrière un bouton.
  const [expanded, setExpanded] = useState(false);
  const collapsed = requirement === "na" && !filled && !expanded;

  return (
    <FieldSet
      title={title}
      hint={hint}
      requirement={requirement}
      filled={filled}
      note={requirement === "na" ? undefined : group?.note}
      collapsed={collapsed}
      onToggle={
        requirement === "na" && !filled
          ? () => setExpanded((v) => !v)
          : undefined
      }
    >
      {children}
    </FieldSet>
  );
}
