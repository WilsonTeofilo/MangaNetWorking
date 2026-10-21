import { CreatorWorkspacePage } from './CreatorWorkspacePage';

/**
 * Workspace do criador â€” visÃ£o geral (Season, nÃ­vel, XP e identidade do autor).
 * Cada painel tem a prÃ³pria tela: obras, capÃ­tulos, missÃµes, analytics e monetizaÃ§Ã£o.
 */
export function CreatorDashboardPage({
  onOpenPublicProfile,
}: {
  onOpenPublicProfile?: (username: string) => void;
}) {
  return <CreatorWorkspacePage section="dashboard" onOpenPublicProfile={onOpenPublicProfile} />;
}