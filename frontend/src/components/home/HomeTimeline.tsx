import { Cover } from '../ui/Cover';
import { FormatBadge } from '../ui/FormatBadge';
import { ReleaseRow } from '../../utils/apiMappers';
import { chapterLabel, relativeTime } from '../../utils/formatMeta';

export interface HomeTimelineProps {
  timeline: Array<[string, ReleaseRow[]]>;
  onOpenRelease: (release: ReleaseRow) => void;
}

export function HomeTimeline({ timeline, onOpenRelease }: HomeTimelineProps) {
  if (timeline.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="border-b-2 border-[var(--mn-line)] pb-3">
        <h2 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase tracking-wide">
          LANÇAMENTOS
        </h2>
        <span className="font-body text-xs text-[var(--mn-mute)]">
          Tudo o que ficou público, agrupado por dia
        </span>
      </div>

      <div className="space-y-6">
        {timeline.map(([day, releases]) => (
          <div key={day} className="space-y-2">
            <h3 className="font-pixel text-[12px] uppercase tracking-wider text-[var(--mn-yellow)]">{day}</h3>
            <ul className="divide-y divide-[var(--mn-line)] border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)]">
              {releases.map((release) => (
                <li key={release.chapterId}>
                  <button
                    type="button"
                    onClick={() => onOpenRelease(release)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--mn-ink)] transition-colors"
                  >
                    <div className="w-9 h-[54px] shrink-0 border border-[var(--mn-line)] overflow-hidden">
                      <Cover src={release.coverUrl} title={release.workTitle} aspectRatio="2/3" dropShadow={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FormatBadge format={release.format} />
                        <span className="font-display text-sm text-[var(--mn-paper)] uppercase truncate">
                          {release.workTitle}
                        </span>
                      </div>
                      <p className="font-body text-xs text-[var(--mn-mute)] truncate">
                        {chapterLabel(release.format, release.chapterNumber)} · {release.chapterTitle}
                      </p>
                    </div>
                    <span className="shrink-0 font-body text-[11px] text-[var(--mn-mute)] tabular-nums">
                      {relativeTime(release.publishedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
