import { CreatorWorkspacePage } from './CreatorWorkspacePage';

/**
 * Workspace do criador — visão geral (Season, nível, XP e identidade do autor).
 * Cada painel tem a própria tela: obras, capítulos, missões, analytics e monetização.
 */
export function CreatorDashboardPage({
  onOpenPublicProfile,
}: {
  onOpenPublicProfile?: (username: string) => void;
}) {
  return <CreatorWorkspacePage section="dashboard" onOpenPublicProfile={onOpenPublicProfile} />;
}