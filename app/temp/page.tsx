import { RankingHeader } from "@/components/ranking-header"
import { RankingPodium } from "@/components/ranking-podium"
import { RankingTable } from "@/components/ranking-table"
import { getRankingData } from "@/lib/ranking-data"
import { Instagram } from "lucide-react"

export default function Page() {
  const rankingData = getRankingData()
  const topThree = rankingData.slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <RankingHeader />

      <RankingPodium topThree={topThree} />

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Ranking Completo
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      <RankingTable users={rankingData} />

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">
                RDS
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Ranking: rinha de seguidores - Vitorias
            </span>
          </div>
          <a
            href="https://www.instagram.com/rinha_de_seguidores"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <Instagram className="h-3.5 w-3.5" />
            @rinha_de_seguidores
          </a>
        </div>
      </footer>
    </div>
  )
}
