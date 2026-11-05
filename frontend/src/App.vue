<template>
  <div class="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white max-w-full overflow-x-hidden">
    <!-- Ambient Background Glow Gradients -->
    <div class="fixed -top-40 -left-40 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none"></div>
    <div class="fixed top-1/3 -right-40 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-violet-600/15 blur-[140px] pointer-events-none"></div>

    <!-- Toast Notification -->
    <div
      v-if="toast"
      class="fixed bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm backdrop-blur-xl transition-all"
      :class="
        toast.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
          : toast.type === 'error'
          ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
      "
    >
      <div class="flex items-center gap-2">
        <span>{{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️' }}</span>
        <span class="font-medium leading-tight">{{ toast.text }}</span>
      </div>
      <button @click="toast = null" class="text-xs opacity-60 hover:opacity-100 p-1">✕</button>
    </div>

    <!-- Top Navigation Header -->
    <header class="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0b0f19]/85 backdrop-blur-xl px-3 sm:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4 max-w-full">
      <!-- Brand Logo -->
      <div class="flex items-center gap-2.5 shrink min-w-0">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
          <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h1 class="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">Pulse<span class="text-indigo-400">Hub</span></h1>
            <span class="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              Live
            </span>
          </div>
          <p class="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">Central Uptime & Incident Command</p>
        </div>
      </div>

      <!-- Header Controls & Auth Profile -->
      <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <!-- Manual Refresh Button -->
        <button
          @click="fetchStatus"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          title="Segarkan data status"
        >
          <svg class="w-3.5 h-3.5 shrink-0" :class="isRefreshing ? 'animate-spin' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span class="hidden md:inline">Refresh</span>
        </button>

        <!-- Admin Command Center Button -->
        <button
          v-if="isAdmin"
          @click="showAdminModal = true"
          class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-bold text-indigo-300 transition-all shrink-0 whitespace-nowrap"
        >
          <span>⚙️</span>
          <span class="hidden sm:inline">Admin</span>
        </button>

        <!-- Logged in User Pill -->
        <div v-if="currentUser" class="flex items-center gap-1.5 sm:gap-2 pl-1 shrink-0">
          <span class="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase border bg-indigo-500/10 text-indigo-400 border-indigo-500/30 whitespace-nowrap">
            {{ currentUser.appRole || 'Admin' }}
          </span>
          <span class="text-xs font-semibold text-slate-200 hidden lg:inline max-w-[100px] truncate">{{ currentUser.name || currentUser.username }}</span>
          <button @click="logout" class="p-1.5 text-slate-400 hover:text-rose-400 transition-colors" title="Logout">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        <!-- Login with AuthHub SSO CTA -->
        <button
          v-else
          @click="loginWithAuthHub"
          class="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-violet-600/30 hover:from-indigo-600/50 hover:to-violet-600/50 border border-indigo-500/40 text-xs font-bold text-indigo-200 transition-all shrink-0 whitespace-nowrap"
        >
          <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Masuk SSO</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" title="FIDO2 / YubiKey PIN Ready"></span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-3.5 py-5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">

      <!-- ─── Hero Overall Status Banner ─── -->
      <div
        class="rounded-3xl p-5 sm:p-7 border shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6 transition-all"
        :class="
          systemStatus === 'operational'
            ? 'bg-emerald-950/30 border-emerald-500/30 shadow-emerald-500/5'
            : systemStatus === 'degraded'
            ? 'bg-amber-950/30 border-amber-500/30 shadow-amber-500/5'
            : 'bg-rose-950/30 border-rose-500/30 shadow-rose-500/5'
        "
      >
        <div class="flex items-center sm:items-start gap-3.5 flex-col sm:flex-row text-center sm:text-left min-w-0 w-full sm:w-auto">
          <div
            class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            :class="
              systemStatus === 'operational'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                : systemStatus === 'degraded'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce'
            "
          >
            {{ systemStatus === 'operational' ? '🛡️' : systemStatus === 'degraded' ? '⚠️' : '🚨' }}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base sm:text-2xl font-black text-white tracking-tight leading-snug break-words">
              {{
                systemStatus === 'operational'
                  ? 'Semua Sistem Berjalan Normal'
                  : systemStatus === 'degraded'
                  ? 'Sebagian Layanan Mengalami Penurunan Performa'
                  : 'Terjadi Gangguan Utama Pada Sistem'
              }}
            </h2>
            <p class="text-xs text-slate-400 mt-1 break-words">
              {{ systemName }} &bull; Diperbarui {{ lastUpdatedFormatted }} &bull; Cek Tiap 60 Detik
            </p>
          </div>
        </div>

        <div class="text-center sm:text-right shrink-0 pt-1 sm:pt-0">
          <div class="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{{ averageUptime }}%</div>
          <div class="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Uptime 90 Hari</div>
        </div>
      </div>

      <!-- ─── Active Incidents Notice (if any) ─── -->
      <div v-if="activeIncidents.length > 0" class="space-y-4">
        <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <span>🚨 Insiden Aktif Sedang Ditangani</span>
        </h3>

        <div
          v-for="inc in activeIncidents"
          :key="inc.id"
          class="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4"
        >
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm sm:text-base font-bold text-white">{{ inc.title }}</h4>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
              {{ inc.status }}
            </span>
          </div>

          <div class="space-y-3 pl-3 sm:pl-4 border-l-2 border-rose-500/30 text-xs">
            <div v-for="upd in inc.updates" :key="upd.id" class="space-y-1">
              <div class="flex items-center gap-2 text-slate-400">
                <span class="font-bold uppercase text-rose-300 text-[10px] sm:text-xs">{{ upd.status }}</span>
                <span>&bull;</span>
                <span>{{ formatDate(upd.createdAt) }}</span>
              </div>
              <p class="text-slate-200">{{ upd.message }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Monitors List by Group with Responsive 90-Day Bars ─── -->
      <div class="space-y-6">
        <div v-for="(groupMonitors, groupName) in groupedMonitors" :key="groupName" class="space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1 flex items-center justify-between">
            <span>{{ groupName }}</span>
            <span class="text-[10px] sm:text-[11px] font-normal text-slate-500">{{ groupMonitors.length }} Service</span>
          </h3>

          <div class="space-y-3">
            <div
              v-for="mon in groupMonitors"
              :key="mon.id"
              class="glass-card border border-slate-800 hover:border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl transition-all space-y-3.5 group max-w-full"
            >
              <!-- Monitor Header Row -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    class="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                    :class="
                      mon.status === 'operational'
                        ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                        : mon.status === 'degraded'
                        ? 'bg-amber-400 shadow-md shadow-amber-400/50'
                        : 'bg-rose-500 shadow-md shadow-rose-500/50 animate-ping'
                    "
                  ></div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="text-sm sm:text-base font-bold text-white truncate">{{ mon.name }}</h4>
                      <span v-if="mon.paused" class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Paused</span>
                    </div>
                    <a :href="mon.url" target="_blank" class="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors font-mono truncate block mt-0.5">
                      {{ mon.url }}
                    </a>
                  </div>
                </div>

                <!-- Status Badge -->
                <span
                  class="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border shrink-0"
                  :class="
                    mon.status === 'operational'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : mon.status === 'degraded'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  "
                >
                  {{ mon.status }}
                </span>
              </div>

              <!-- Latency & SSL info line -->
              <div class="flex items-center gap-3 sm:gap-5 text-[11px] text-slate-400">
                <div class="flex items-center gap-1">
                  <span>Latensi:</span>
                  <strong class="font-mono text-slate-200">{{ mon.latencyMs }}ms</strong>
                </div>
                <div v-if="mon.sslDaysRemaining !== undefined" class="flex items-center gap-1">
                  <span>SSL:</span>
                  <strong :class="mon.sslDaysRemaining > 14 ? 'text-emerald-400' : 'text-amber-400'">
                    {{ mon.sslDaysRemaining }} hari
                  </strong>
                </div>
              </div>

              <!-- ─── 90-Day Interactive Uptime Heatmap Bars ─── -->
              <div class="space-y-1 pt-1">
                <div class="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 select-none">
                  <span>90 Hari Lalu</span>
                  <span class="font-mono font-semibold text-emerald-400">{{ mon.uptime90d }}% Uptime</span>
                  <span>Hari Ini</span>
                </div>

                <!-- Responsive horizontal container with no layout breaking -->
                <div class="overflow-x-auto pb-1 -mx-1 px-1">
                  <div class="flex items-center gap-[2px] h-7 sm:h-9 min-w-[540px] sm:min-w-0 w-full bg-slate-950/70 p-1 rounded-xl border border-slate-900/80">
                    <div
                      v-for="(day, idx) in mon.history90d"
                      :key="idx"
                      @mouseenter="hoveredDay = { ...day, monitorName: mon.name }"
                      @mouseleave="hoveredDay = null"
                      @click="hoveredDay = { ...day, monitorName: mon.name }"
                      class="flex-1 h-full min-w-[3px] rounded-[1.5px] transition-all hover:scale-y-125 cursor-pointer"
                      :class="
                        day.status === 'operational'
                          ? 'bg-emerald-500/80 hover:bg-emerald-400'
                          : day.status === 'degraded'
                          ? 'bg-amber-500/80 hover:bg-amber-400'
                          : 'bg-rose-500/80 hover:bg-rose-400'
                      "
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hover / Tap Tooltip Floating Pill -->
      <div
        v-if="hoveredDay"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700 px-4 py-2.5 rounded-2xl shadow-2xl text-[11px] sm:text-xs flex items-center gap-2 sm:gap-3 backdrop-blur-xl animate-fade-in max-w-[92vw] truncate"
      >
        <span class="font-bold text-white truncate max-w-[120px]">{{ hoveredDay.monitorName }}</span>
        <span class="text-slate-500">&bull;</span>
        <span class="text-slate-300 font-mono">{{ hoveredDay.date }}</span>
        <span class="text-slate-500">&bull;</span>
        <span class="font-bold font-mono text-emerald-400">{{ hoveredDay.uptimePercentage }}%</span>
        <span class="text-slate-500">&bull;</span>
        <span class="text-slate-300 font-mono hidden sm:inline">{{ hoveredDay.avgLatencyMs }}ms</span>
        <button @click="hoveredDay = null" class="text-slate-400 hover:text-white ml-1 text-xs">✕</button>
      </div>

      <!-- ─── Past Incidents Postmortems ─── -->
      <div class="space-y-4 pt-4 border-t border-slate-800/80">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
          📋 Riwayat Insiden yang Telah Selesai (Past Incidents)
        </h3>

        <div v-if="pastIncidents.length === 0" class="text-xs text-slate-500 py-4 text-center">
          Tidak ada insiden tercatat dalam 30 hari terakhir. Semua sistem berjalan stabil.
        </div>

        <div
          v-for="inc in pastIncidents"
          :key="inc.id"
          class="glass-card border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-2 text-xs"
        >
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-bold text-white text-xs sm:text-sm">{{ inc.title }}</h4>
            <span class="text-emerald-400 font-bold uppercase text-[9px] sm:text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
              Resolved
            </span>
          </div>
          <p class="text-slate-400 leading-relaxed">{{ inc.updates[0]?.message }}</p>
          <div class="text-[10px] text-slate-500 pt-1">
            Selesai pada: {{ formatDate(inc.resolvedAt || inc.createdAt) }}
          </div>
        </div>
      </div>
    </main>

    <!-- ─── Admin Command Modal (AuthHub SSO Protected) ─── -->
    <div v-if="showAdminModal" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="showAdminModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-8 max-w-2xl w-full shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white">PulseHub Admin Command</h3>
              <p class="text-[11px] text-slate-400">Kelola target monitor dan insiden.</p>
            </div>
          </div>
          <button @click="showAdminModal = false" class="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <!-- Add New Monitor Form -->
        <div class="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <h4 class="text-xs font-bold uppercase text-indigo-400">Tambah Monitor Baru</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <label class="block text-slate-400 mb-1">Nama Layanan</label>
              <input v-model="newMonForm.name" type="text" placeholder="e.g. Nexus Chat API" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Grup / Kategori</label>
              <input v-model="newMonForm.group" type="text" placeholder="e.g. Ecosystem Applications" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-slate-400 mb-1">Target URL</label>
              <input v-model="newMonForm.url" type="text" placeholder="https://api.example.com/health" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            </div>
          </div>
          <button @click="submitAddMonitor" class="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">
            + Simpan & Mulai Pantau
          </button>
        </div>

        <!-- Active Monitors List & Trigger Manual Ping -->
        <div class="space-y-2.5">
          <h4 class="text-xs font-bold uppercase text-slate-400">Daftar Monitor Terdaftar</h4>
          <div class="space-y-2 max-h-44 overflow-y-auto">
            <div v-for="m in monitors" :key="m.id" class="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs gap-2">
              <div class="min-w-0 flex-1">
                <span class="font-bold text-white block truncate">{{ m.name }}</span>
                <span class="text-[10px] text-slate-400 block font-mono truncate">{{ m.url }}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button @click="triggerManualCheck(m.id)" class="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10px] font-bold">
                  Ping
                </button>
                <button @click="deleteMonitor(m.id)" class="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-1 text-[10px]">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Incident Form -->
        <div class="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <h4 class="text-xs font-bold uppercase text-amber-400">Umumkan Insiden / Maintenance</h4>
          <div class="space-y-2 text-xs">
            <input v-model="newIncForm.title" type="text" placeholder="Judul insiden, e.g. Pemeliharaan Jaringan Database" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            <select v-model="newIncForm.severity" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white">
              <option value="minor">Minor Issue</option>
              <option value="major">Major Outage</option>
              <option value="critical">Critical Outage</option>
              <option value="maintenance">Scheduled Maintenance</option>
            </select>
          </div>
          <button @click="submitCreateIncident" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors">
            Publikasikan Insiden ke Status Page
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-slate-800/80 py-5 text-center text-xs text-slate-500 space-y-1 px-4">
      <p>Powered by <strong>PulseHub Sentry</strong> &bull; Terhubung ke <strong>AuthHub SSO</strong></p>
      <p>&copy; 2026 Josa Pratama Cloud Network</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const API_BASE = "/api";

interface DayUptime {
  date: string;
  uptimePercentage: number;
  status: "operational" | "degraded" | "down";
  checksCount: number;
  avgLatencyMs: number;
  monitorName?: string;
}

interface Monitor {
  id: string;
  name: string;
  group: string;
  url: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  uptime24h: number;
  uptime90d: number;
  sslDaysRemaining?: number;
  paused: boolean;
  history90d: DayUptime[];
}

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
  updates: { id: string; status: string; message: string; createdAt: string }[];
  createdAt: string;
  resolvedAt?: string;
}

// Global Toast
const toast = ref<{ text: string; type: "success" | "error" | "info" } | null>(null);
function showToast(text: string, type: "success" | "error" | "info" = "info") {
  toast.value = { text, type };
  setTimeout(() => {
    if (toast.value?.text === text) toast.value = null;
  }, 4000);
}

// State
const systemStatus = ref<"operational" | "degraded" | "major_outage">("operational");
const systemName = ref("Josa Pratama Cloud Network");
const monitors = ref<Monitor[]>([]);
const activeIncidents = ref<Incident[]>([]);
const pastIncidents = ref<Incident[]>([]);
const isRefreshing = ref(false);
const hoveredDay = ref<DayUptime | null>(null);

// AuthHub State
const currentUser = ref<any>(null);
const authToken = ref<string>(localStorage.getItem("pulsehub_auth_token") || "");
const authConfig = ref<any>(null);
const showAdminModal = ref(false);

const isAdmin = computed(() => {
  if (!currentUser.value) return false;
  const r = currentUser.value.appRole;
  return currentUser.value.globalRole === "superadmin" || r === "superadmin" || r === "admin";
});

// Admin forms
const newMonForm = ref({ name: "", group: "Ecosystem Applications", url: "" });
const newIncForm = ref({ title: "", severity: "minor" });

const groupedMonitors = computed(() => {
  const map: Record<string, Monitor[]> = {};
  for (const m of monitors.value) {
    const grp = m.group || "Other Services";
    if (!map[grp]) map[grp] = [];
    map[grp].push(m);
  }
  return map;
});

const averageUptime = computed(() => {
  if (monitors.value.length === 0) return 100;
  const sum = monitors.value.reduce((acc, m) => acc + (m.uptime90d || 100), 0);
  return (sum / monitors.value.length).toFixed(2);
});

const lastUpdatedFormatted = computed(() => {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
});

function getAuthHeaders(): HeadersInit {
  const token = authToken.value || localStorage.getItem("pulsehub_auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchStatus() {
  isRefreshing.value = true;
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();
    systemStatus.value = data.systemStatus;
    systemName.value = data.systemName;
    monitors.value = data.monitors || [];
    activeIncidents.value = data.activeIncidents || [];
    pastIncidents.value = data.pastIncidents || [];
  } catch (err) {
    console.error("Failed to load status payload", err);
  } finally {
    isRefreshing.value = false;
  }
}

async function triggerManualCheck(monitorId: string) {
  try {
    const res = await fetch(`${API_BASE}/monitors/${monitorId}/check`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      showToast("Pemeriksaan langsung berhasil dijalankan!", "success");
      fetchStatus();
    }
  } catch {
    showToast("Gagal melakukan ping manual", "error");
  }
}

async function submitAddMonitor() {
  if (!newMonForm.value.name || !newMonForm.value.url) return;
  try {
    const res = await fetch(`${API_BASE}/monitors`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(newMonForm.value),
    });
    if (res.ok) {
      showToast("Monitor baru berhasil ditambahkan!", "success");
      newMonForm.value = { name: "", group: "Ecosystem Applications", url: "" };
      fetchStatus();
    }
  } catch {
    showToast("Gagal menambah monitor", "error");
  }
}

async function deleteMonitor(id: string) {
  if (!confirm("Hapus monitor ini dari PulseHub?")) return;
  try {
    await fetch(`${API_BASE}/monitors/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    showToast("Monitor dihapus.", "info");
    fetchStatus();
  } catch {
    showToast("Gagal menghapus", "error");
  }
}

async function submitCreateIncident() {
  if (!newIncForm.value.title) return;
  try {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(newIncForm.value),
    });
    if (res.ok) {
      showToast("Insiden berhasil dipublikasikan ke status page!", "success");
      newIncForm.value = { title: "", severity: "minor" };
      fetchStatus();
    }
  } catch {
    showToast("Gagal mempublikasikan insiden", "error");
  }
}

async function loginWithAuthHub() {
  if (authConfig.value?.ssoLoginUrl) {
    const ssoUrl = new URL(authConfig.value.ssoLoginUrl);
    ssoUrl.searchParams.set("redirect_uri", `${window.location.origin}/auth/callback`);
    window.location.href = ssoUrl.toString();
  } else {
    window.location.href = `https://auth.josapratama.com/?oauth=1&client_id=ah_client_pulsehub_8a9b0c&client_slug=pulse-hub&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
  }
}

function logout() {
  localStorage.removeItem("pulsehub_auth_token");
  authToken.value = "";
  currentUser.value = null;
  showToast("Anda telah keluar dari PulseHub.", "info");
}

onMounted(async () => {
  // 1. Load Auth Config
  try {
    const cfgRes = await fetch(`${API_BASE}/auth/config`);
    if (cfgRes.ok) authConfig.value = await cfgRes.json();
  } catch (err) {
    console.warn("Could not load auth config", err);
  }

  // 2. Check for OAuth callback '?code=...'
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  if (code) {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(`${API_BASE}/auth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        authToken.value = data.token;
        localStorage.setItem("pulsehub_auth_token", data.token);
        currentUser.value = data.user;
        showToast(`Selamat datang, ${data.user.name}! Berhasil masuk via AuthHub SSO.`, "success");
      } else {
        showToast(data.error || "Gagal otorisasi dengan AuthHub. Pastikan AuthHub sudah direstart.", "error");
      }
    } catch {
      showToast("Kesalahan jaringan saat verifikasi SSO", "error");
    } finally {
      // Clean query params and return path to root
      window.history.replaceState({}, document.title, "/");
    }
  } else if (authToken.value) {
    try {
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
      const meData = await meRes.json();
      if (meData.authenticated && meData.user) {
        currentUser.value = meData.user;
      } else {
        authToken.value = "";
        localStorage.removeItem("pulsehub_auth_token");
      }
    } catch {
      authToken.value = "";
    }
  }

  // 3. Load initial public status
  fetchStatus();
  // Auto-refresh status every 60s
  setInterval(fetchStatus, 60_000);
});
</script>
