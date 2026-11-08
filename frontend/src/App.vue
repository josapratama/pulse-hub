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

      <!-- Navigation Tabs (Uptime vs NetPulse Packet Sentry) -->
      <div class="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
        <button
          @click="currentView = 'uptime'"
          class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
          :class="currentView === 'uptime' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'"
        >
          📊 Status Uptime
        </button>
        <button
          @click="currentView = 'packets'"
          class="px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          :class="currentView === 'packets' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'"
        >
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>🦈 NetPulse Sentry</span>
        </button>
      </div>

      <!-- Header Controls & Auth Profile -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap">
        <!-- Subscribe CTA Button -->
        <button
          @click="showSubscribeModal = true"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
          title="Berlangganan Notifikasi Insiden (Discord Webhook / Email)"
        >
          <span class="text-sm">🔔</span>
          <span class="hidden md:inline">Berlangganan</span>
        </button>

        <!-- SLA Report Modal Button -->
        <button
          @click="openSlaModal"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          title="Lihat Laporan SLA & Ketersediaan Sistem"
        >
          <span class="text-sm">📋</span>
          <span class="hidden md:inline">Laporan SLA</span>
        </button>

        <!-- TV / NOC Wallboard Fullscreen Mode Button -->
        <button
          @click="toggleNocMode"
          class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          :class="isNocMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300'"
          title="Tampilan Layar TV / NOC Wallboard"
        >
          <span class="text-sm">🖥️</span>
          <span class="hidden md:inline">{{ isNocMode ? 'Keluar TV' : 'TV Mode' }}</span>
        </button>

        <!-- RSS Feed Link -->
        <a
          href="/api/incidents/rss"
          target="_blank"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          title="Berlangganan RSS Feed Insiden"
        >
          <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          <span class="hidden md:inline">RSS</span>
        </a>

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
    <main
      v-if="currentView === 'uptime'"
      class="flex-1 w-full mx-auto px-3.5 py-5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 transition-all"
      :class="isNocMode ? 'max-w-7xl text-sm' : 'max-w-5xl'"
    >
      <!-- ─── Active Maintenance Notice Banner (if any) ─── -->
      <div v-if="activeMaintenances.length > 0" class="space-y-3">
        <div
          v-for="maint in activeMaintenances"
          :key="maint.id"
          class="rounded-3xl p-4 sm:p-5 border border-sky-500/40 bg-sky-950/40 backdrop-blur-xl flex items-start gap-3.5 text-sky-200 shadow-xl shadow-sky-950/30"
        >
          <div class="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-xl shrink-0">
            🛠️
          </div>
          <div class="min-w-0 flex-1 text-xs">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-white">{{ maint.title }}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Pemeliharaan Terjadwal
              </span>
            </div>
            <p v-if="maint.description" class="text-sky-300/80 mt-1 leading-relaxed">{{ maint.description }}</p>
            <div class="text-[10px] text-slate-400 mt-1 font-mono">
              Jadwal: {{ formatDate(maint.startAt) }} &bull; Estimasi Selesai: {{ formatDate(maint.endAt) }}
            </div>
          </div>
        </div>
      </div>

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
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <span>🚨 Insiden Aktif Sedang Ditangani</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {{ activeIncidents.length }}
            </span>
          </h3>

          <!-- Admin Quick Bulk Incident Controls -->
          <div v-if="isAdmin" class="flex items-center gap-2">
            <button
              @click="cleanupDuplicates"
              class="px-2.5 py-1 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              title="Auto-resolve insiden untuk layanan yang sudah normal & bersihkan kartu duplikat"
            >
              <span>🧹 Bersihkan Duplikat</span>
            </button>
            <button
              @click="resolveAllIncidents"
              class="px-2.5 py-1 text-xs rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm"
              title="Tandai semua insiden aktif sebagai selesai"
            >
              <span>✓ Selesaikan Semua</span>
            </button>
          </div>
        </div>

        <div
          v-for="inc in activeIncidents"
          :key="inc.id"
          class="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4"
        >
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h4 class="text-sm sm:text-base font-bold text-white">{{ inc.title }}</h4>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                {{ inc.status }}
              </span>
              <template v-if="isAdmin">
                <button
                  @click="markIncidentResolved(inc.id)"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all"
                  title="Tandai insiden ini selesai"
                >
                  ✓ Selesai
                </button>
                <button
                  @click="deleteIncident(inc.id)"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-all"
                  title="Hapus insiden ini"
                >
                  ✕ Hapus
                </button>
              </template>
            </div>
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

      <!-- ─── Search & Quick Status Filters ─── -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div class="relative flex-1 max-w-sm">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama layanan atau grup..."
            class="w-full px-3.5 py-2 pl-9 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500/60 focus:outline-none transition-all"
          />
          <svg class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
          <button
            v-for="f in statusFilters"
            :key="f.key"
            @click="activeStatusFilter = f.key"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
            :class="
              activeStatusFilter === f.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800'
            "
          >
            {{ f.label }} ({{ f.count }})
          </button>
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
                <div class="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer" @click="openMonitorDetail(mon)">
                  <div
                    class="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                    :class="
                      mon.paused
                        ? 'bg-slate-500'
                        : mon.status === 'operational'
                        ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                        : mon.status === 'degraded'
                        ? 'bg-amber-400 shadow-md shadow-amber-400/50'
                        : 'bg-rose-500 shadow-md shadow-rose-500/50 animate-ping'
                    "
                  ></div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="text-sm sm:text-base font-bold text-white truncate hover:text-indigo-300 transition-colors">
                        {{ mon.name }}
                      </h4>
                      <span v-if="mon.paused" class="text-[9px] bg-slate-800 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                        PAUSED
                      </span>
                      <span v-if="mon.type === 'tcp'" class="text-[9px] bg-sky-950 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        TCP
                      </span>
                    </div>
                    <a :href="mon.url" target="_blank" @click.stop class="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors font-mono truncate block mt-0.5">
                      {{ mon.url }}
                    </a>
                  </div>
                </div>

                <!-- Status Badge & Quick Admin Actions -->
                <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    @click="openMonitorDetail(mon)"
                    class="hidden sm:inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition-all font-semibold"
                    title="Buka grafik performa & detail"
                  >
                    📈 Detail
                  </button>
                  <template v-if="isAdmin">
                    <button
                      @click="togglePauseMonitor(mon.id)"
                      :class="mon.paused ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'"
                      class="px-2 py-0.5 rounded-lg text-[10px] font-bold border hover:text-white transition-all"
                      :title="mon.paused ? 'Lanjutkan pemantauan' : 'Jeda pemantauan (Pause)'"
                    >
                      {{ mon.paused ? '▶ Resume' : '⏸ Pause' }}
                    </button>
                    <button
                      @click="openEditMonitor(mon)"
                      class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                      title="Edit konfigurasi monitor"
                    >
                      ✏️ Edit
                    </button>
                  </template>
                  <span
                    class="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border shrink-0"
                    :class="
                      mon.paused
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : mon.status === 'operational'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : mon.status === 'degraded'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    "
                  >
                    {{ mon.paused ? 'PAUSED' : mon.status }}
                  </span>
                </div>
              </div>

              <!-- Latency & SSL info line -->
              <div class="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                <div class="flex items-center gap-3 sm:gap-5 flex-wrap">
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
                  <div v-if="mon.expectedKeyword" class="hidden sm:flex items-center gap-1 text-slate-400">
                    <span>Keyword:</span>
                    <code class="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/60 font-mono">
                      {{ mon.expectedKeyword }}
                    </code>
                  </div>
                </div>

                <button
                  @click="openMonitorDetail(mon)"
                  class="sm:hidden text-indigo-400 font-bold hover:underline text-[11px]"
                >
                  Detail &amp; Grafik &rarr;
                </button>
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

    <!-- ─── NetPulse Sentry View (DPI / Mini-Wireshark) ─── -->
    <NetPulseSentry v-else-if="currentView === 'packets'" />

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
            <div>
              <label class="block text-slate-400 mb-1">Target URL / Host</label>
              <input v-model="newMonForm.url" type="text" placeholder="https://api.example.com/health atau 127.0.0.1:5432" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Tipe Pemantauan</label>
              <select v-model="newMonForm.type" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white">
                <option value="http">HTTP / HTTPS (Web / API)</option>
                <option value="tcp">TCP Socket Port (Database / Redis / SSH)</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Verifikasi Keyword Respon (Opsional)</label>
              <input v-model="newMonForm.expectedKeyword" type="text" placeholder="e.g. status:ok atau healthy" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Ambang Latensi Degraded (ms)</label>
              <input v-model.number="newMonForm.degradedLatencyMs" type="number" placeholder="2000" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
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

        <!-- Manage Active Incidents in Admin Drawer -->
        <div v-if="activeIncidents.length > 0" class="space-y-3 bg-rose-950/20 p-4 rounded-2xl border border-rose-500/30">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase text-rose-400">Insiden Aktif ({{ activeIncidents.length }})</h4>
            <div class="flex items-center gap-1.5">
              <button @click="cleanupDuplicates" class="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold hover:bg-slate-700">
                🧹 Duplikat
              </button>
              <button @click="resolveAllIncidents" class="px-2 py-0.5 rounded-lg bg-emerald-600/30 text-emerald-300 text-[10px] font-bold hover:bg-emerald-600/50">
                ✓ Selesaikan Semua
              </button>
            </div>
          </div>
          <div class="space-y-2 max-h-36 overflow-y-auto">
            <div v-for="inc in activeIncidents" :key="inc.id" class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <span class="font-bold text-white block truncate">{{ inc.title }}</span>
                <span class="text-[10px] text-slate-400 uppercase">{{ inc.status }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button @click="markIncidentResolved(inc.id)" class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Selesai
                </button>
                <button @click="deleteIncident(inc.id)" class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Incident Form -->
        <div class="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <h4 class="text-xs font-bold uppercase text-amber-400">Umumkan Insiden / Gangguan</h4>
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

        <!-- Schedule Maintenance Form & List -->
        <div class="space-y-3 bg-sky-950/30 p-4 rounded-2xl border border-sky-500/30">
          <h4 class="text-xs font-bold uppercase text-sky-400">Jadwalkan Pemeliharaan Sistem (Maintenance)</h4>
          <div class="space-y-2 text-xs">
            <input v-model="maintForm.title" type="text" placeholder="Judul pemeliharaan, e.g. Upgrade Server & Migrasi Database" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white" />
            <textarea v-model="maintForm.description" rows="2" placeholder="Deskripsi pemeliharaan dan dampaknya..." class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"></textarea>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="block text-slate-400 mb-0.5 text-[10px]">Waktu Mulai (ISO / YYYY-MM-DDTHH:mm)</label>
                <input v-model="maintForm.startAt" type="datetime-local" class="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" />
              </div>
              <div>
                <label class="block text-slate-400 mb-0.5 text-[10px]">Waktu Selesai</label>
                <input v-model="maintForm.endAt" type="datetime-local" class="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" />
              </div>
            </div>
          </div>
          <button @click="submitAddMaintenance" class="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors">
            + Jadwalkan Pemeliharaan
          </button>

          <!-- List of Scheduled Maintenances -->
          <div v-if="allMaintenances.length > 0" class="pt-2 space-y-1.5 border-t border-sky-900/60 max-h-36 overflow-y-auto">
            <div v-for="m in allMaintenances" :key="m.id" class="p-2.5 rounded-xl bg-slate-900/80 border border-sky-900/40 text-xs flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <span class="font-bold text-white block truncate">{{ m.title }}</span>
                <span class="text-[10px] text-slate-400 block">{{ formatDate(m.startAt) }} &rarr; {{ formatDate(m.endAt) }}</span>
              </div>
              <button @click="deleteMaintenance(m.id)" class="px-2 py-1 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0">
                Hapus
              </button>
            </div>
          </div>
        </div>

        <!-- Manage Subscribers List -->
        <div class="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase text-indigo-400">Daftar Pelanggan Notifikasi Webhook/Email ({{ subscribers.length }})</h4>
            <button @click="fetchSubscribers" class="text-[10px] text-indigo-300 hover:underline">Segarkan</button>
          </div>
          <div v-if="subscribers.length === 0" class="text-slate-500 text-xs py-2 text-center">
            Belum ada subscriber terdaftar.
          </div>
          <div v-else class="space-y-1.5 max-h-36 overflow-y-auto">
            <div v-for="s in subscribers" :key="s.id" class="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold" :class="s.type === 'webhook' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'">
                    {{ s.type }}
                  </span>
                  <span v-if="s.name" class="font-bold text-white text-[11px] truncate">{{ s.name }}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono truncate block mt-0.5">{{ s.target }}</span>
              </div>
              <button @click="deleteSubscriber(s.id)" class="text-rose-400 hover:text-rose-300 text-[10px] font-bold px-1.5 py-0.5">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Monitor Detail & Latency Trend Modal ─── -->
    <div v-if="showDetailModal && selectedMonitor" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="closeDetailModal"></div>
      <div class="relative bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto">
        <!-- Detail Header -->
        <div class="flex items-start justify-between border-b border-slate-800 pb-4 gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base sm:text-xl font-bold text-white truncate">{{ selectedMonitor.name }}</h3>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border"
                :class="
                  selectedMonitor.paused
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : selectedMonitor.status === 'operational'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : selectedMonitor.status === 'degraded'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                "
              >
                {{ selectedMonitor.paused ? 'PAUSED' : selectedMonitor.status }}
              </span>
              <span v-if="selectedMonitor.type === 'tcp'" class="text-[9px] bg-sky-950 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded font-bold uppercase">
                TCP Socket
              </span>
            </div>
            <a :href="selectedMonitor.url" target="_blank" class="text-xs text-indigo-400 hover:underline font-mono truncate block mt-1">
              {{ selectedMonitor.url }}
            </a>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <a
              :href="'/api/monitors/' + selectedMonitor.id + '/export.csv'"
              class="px-2.5 py-1 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Download riwayat uptime format CSV"
            >
              <span>📥 CSV</span>
            </a>
            <button @click="closeDetailModal" class="text-slate-400 hover:text-white p-1.5 text-lg leading-none">✕</button>
          </div>
        </div>

        <!-- Quick Admin Action Bar inside modal -->
        <div v-if="isAdmin" class="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs gap-2 flex-wrap">
          <span class="text-slate-400 font-bold uppercase text-[11px]">Kontrol Admin:</span>
          <div class="flex items-center gap-2">
            <button
              @click="triggerManualCheck(selectedMonitor.id); openMonitorDetail(selectedMonitor)"
              class="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold border border-indigo-500/40"
            >
              ⚡ Ping Sekarang
            </button>
            <button
              @click="togglePauseMonitor(selectedMonitor.id)"
              class="px-2.5 py-1 rounded-xl font-bold border"
              :class="selectedMonitor.paused ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'"
            >
              {{ selectedMonitor.paused ? '▶ Aktifkan Pemantauan' : '⏸ Jeda (Pause)' }}
            </button>
            <button
              @click="openEditMonitor(selectedMonitor); closeDetailModal()"
              class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700"
            >
              ✏️ Edit Konfigurasi
            </button>
          </div>
        </div>

        <!-- 4 KPI Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Uptime 24 Jam</div>
            <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{{ selectedMonitor.uptime24h }}%</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Uptime 90 Hari</div>
            <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{{ selectedMonitor.uptime90d }}%</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latensi Terkini</div>
            <div class="text-xl sm:text-2xl font-black text-indigo-300 font-mono mt-1">{{ selectedMonitor.latencyMs }}ms</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Masa Berlaku SSL</div>
            <div class="text-xl sm:text-2xl font-black font-mono mt-1" :class="(selectedMonitor.sslDaysRemaining || 0) > 14 ? 'text-emerald-400' : 'text-amber-400'">
              {{ selectedMonitor.sslDaysRemaining !== undefined ? selectedMonitor.sslDaysRemaining + ' hari' : 'N/A' }}
            </div>
          </div>
        </div>

        <!-- Latency Trend Area / Sparkline Graph -->
        <div class="space-y-2.5 bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>📊 Grafik Tren Latensi Respon (Pengecekan Terkini)</span>
            </h4>
            <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span>Min: <strong class="text-emerald-400">{{ minLatencyRecent }}ms</strong></span>
              <span>&bull;</span>
              <span>Avg: <strong class="text-indigo-300">{{ avgLatencyRecent }}ms</strong></span>
              <span>&bull;</span>
              <span>Max: <strong class="text-rose-400">{{ maxLatencyRecent }}ms</strong></span>
            </div>
          </div>

          <div v-if="isLoadingChecks" class="h-28 flex items-center justify-center text-xs text-slate-500">
            Memuat data histori pengecekan...
          </div>
          <div v-else-if="monitorChecks.length === 0" class="h-28 flex items-center justify-center text-xs text-slate-500">
            Belum ada catatan latensi tersimpan.
          </div>
          <div v-else class="h-28 w-full relative pt-2">
            <svg class="w-full h-full overflow-visible" viewBox="0 0 500 110" preserveAspectRatio="none">
              <defs>
                <linearGradient :id="'grad-' + selectedMonitor.id" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              <!-- Filled area -->
              <polygon :points="latencyChartArea" :fill="'url(#grad-' + selectedMonitor.id + ')'" />
              <!-- Border line -->
              <polyline :points="latencyChartPoints" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

        <!-- Shields Badge Integration for GitHub README -->
        <div class="space-y-3 bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800 text-xs">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">
              🏷️ Status Badge untuk GitHub README &amp; Docs
            </h4>
            <button
              @click="copyBadgeMarkdown(selectedMonitor.id)"
              class="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 font-bold transition-all"
            >
              {{ badgeCopied ? '✓ Tersalin!' : '📋 Salin Markdown' }}
            </button>
          </div>

          <div class="flex items-center gap-3 flex-wrap pt-1">
            <img :src="'/api/badges/' + selectedMonitor.id + '/status.svg'" alt="Status Badge Preview" class="h-5" />
            <img :src="'/api/badges/' + selectedMonitor.id + '/uptime.svg'" alt="Uptime Badge Preview" class="h-5" />
          </div>

          <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
            [![PulseHub Status]({{ windowOrigin }}/api/badges/{{ selectedMonitor.id }}/status.svg)]({{ windowOrigin }})
          </div>
        </div>

        <!-- Recent 15 Checks Logs Table -->
        <div class="space-y-2.5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">15 Pengecekan Terakhir</h4>
          <div class="overflow-x-auto rounded-2xl border border-slate-800">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th class="p-2.5">Waktu</th>
                  <th class="p-2.5">Status</th>
                  <th class="p-2.5">HTTP Code</th>
                  <th class="p-2.5">Latensi</th>
                  <th class="p-2.5">Catatan / Error</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 bg-slate-900/60">
                <tr v-for="(c, idx) in monitorChecks.slice(-15).reverse()" :key="idx" class="hover:bg-slate-800/40">
                  <td class="p-2.5 text-[11px] text-slate-400 whitespace-nowrap">{{ formatDate(new Date(c.timestamp).toISOString()) }}</td>
                  <td class="p-2.5 whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border"
                      :class="
                        c.status === 'operational'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : c.status === 'degraded'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      "
                    >
                      {{ c.status }}
                    </span>
                  </td>
                  <td class="p-2.5 font-mono text-[11px]">{{ c.statusCode || '—' }}</td>
                  <td class="p-2.5 font-mono text-[11px] text-slate-200">{{ c.latencyMs }}ms</td>
                  <td class="p-2.5 text-[11px] text-slate-400 max-w-[220px] truncate">{{ c.error || 'Normal (OK)' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Edit Monitor Modal (Admin) ─── -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="showEditModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white">Edit Konfigurasi Monitor</h3>
          <button @click="showEditModal = false" class="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-400 mb-1">Nama Layanan</label>
            <input v-model="editMonForm.name" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Grup / Kategori</label>
            <input v-model="editMonForm.group" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Target URL / Host</label>
            <input v-model="editMonForm.url" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-slate-400 mb-1">Tipe Pemantauan</label>
              <select v-model="editMonForm.type" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                <option value="http">HTTP / HTTPS</option>
                <option value="tcp">TCP Socket Port</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Expected HTTP Code</label>
              <input v-model.number="editMonForm.expectedStatusCode" type="number" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-slate-400 mb-1">Keyword Respon (Opsional)</label>
              <input v-model="editMonForm.expectedKeyword" type="text" placeholder="e.g. status:ok" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Ambang Latensi Degraded (ms)</label>
              <input v-model.number="editMonForm.degradedLatencyMs" type="number" placeholder="2000" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button @click="showEditModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white">
            Batal
          </button>
          <button @click="submitEditMonitor" class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Subscribe to Incident Notifications Modal ─── -->
    <div v-if="showSubscribeModal" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="showSubscribeModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl z-10 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-lg shrink-0">
              🔔
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Berlangganan Notifikasi Insiden</h3>
              <p class="text-[11px] text-slate-400">Terima pemberitahuan saat terjadi insiden dan pemulihan.</p>
            </div>
          </div>
          <button @click="showSubscribeModal = false" class="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block text-slate-400 mb-1">Metode Notifikasi</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="subForm.type = 'webhook'"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center"
                :class="subForm.type === 'webhook' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'"
              >
                Webhook (Discord / Slack)
              </button>
              <button
                type="button"
                @click="subForm.type = 'email'"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center"
                :class="subForm.type === 'email' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'"
              >
                Email
              </button>
            </div>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">
              {{ subForm.type === 'webhook' ? 'URL Webhook (Discord / Slack / Custom API)' : 'Alamat Email' }}
            </label>
            <input
              v-model="subForm.target"
              type="text"
              :placeholder="subForm.type === 'webhook' ? 'https://discord.com/api/webhooks/...' : 'nama@perusahaan.com'"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Nama / Label Pengenal (Opsional)</label>
            <input
              v-model="subForm.name"
              type="text"
              placeholder="e.g. Discord Channel #server-alerts"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button @click="showSubscribeModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white">
            Batal
          </button>
          <button @click="submitSubscribe" class="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            Daftarkan Notifikasi
          </button>
        </div>
      </div>
    </div>

    <!-- ─── SLA & Availability Report Modal ─── -->
    <div v-if="showSlaModal" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="showSlaModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-8 max-w-3xl w-full shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl">📋</span>
              <h3 class="text-lg font-bold text-white">Laporan SLA &amp; Ketersediaan Sistem</h3>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">{{ systemName }} &bull; Periode Evaluasi Terkini</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              onclick="window.print()"
              class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              <span>🖨️ Cetak / PDF</span>
            </button>
            <button @click="showSlaModal = false" class="text-slate-400 hover:text-white p-1 text-lg">✕</button>
          </div>
        </div>

        <div v-if="isLoadingSla" class="py-12 text-center text-xs text-slate-500">
          Sedang menghitung metrik SLA sistem...
        </div>

        <div v-else-if="slaReport" class="space-y-5">
          <!-- 4 Summary KPI Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SLA 7 Hari</div>
              <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{{ slaReport.slaSummary.uptime7d }}%</div>
            </div>
            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SLA 30 Hari</div>
              <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{{ slaReport.slaSummary.uptime30d }}%</div>
            </div>
            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SLA 90 Hari</div>
              <div class="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{{ slaReport.slaSummary.uptime90d }}%</div>
            </div>
            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tingkat Ketersediaan</div>
              <div class="text-xs font-black text-indigo-300 font-mono mt-2 uppercase">{{ slaReport.slaSummary.slaTier }}</div>
            </div>
          </div>

          <!-- Breakdown per monitor table -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Rincian Performa Tiap Layanan</h4>
            <div class="overflow-x-auto rounded-2xl border border-slate-800">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th class="p-3">Nama Layanan</th>
                    <th class="p-3">Grup</th>
                    <th class="p-3">Status</th>
                    <th class="p-3 font-mono">24 Jam</th>
                    <th class="p-3 font-mono">7 Hari</th>
                    <th class="p-3 font-mono">30 Hari</th>
                    <th class="p-3 font-mono">90 Hari</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 bg-slate-900/60">
                  <tr v-for="m in slaReport.monitors" :key="m.id" class="hover:bg-slate-800/40">
                    <td class="p-3 font-bold text-white whitespace-nowrap">{{ m.name }}</td>
                    <td class="p-3 text-[11px] text-slate-400 whitespace-nowrap">{{ m.group }}</td>
                    <td class="p-3 whitespace-nowrap">
                      <span
                        class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border"
                        :class="
                          m.status === 'operational'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : m.status === 'degraded'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        "
                      >
                        {{ m.status }}
                      </span>
                    </td>
                    <td class="p-3 font-mono text-[11px]">{{ m.uptime24h }}%</td>
                    <td class="p-3 font-mono text-[11px]">{{ m.uptime7d }}%</td>
                    <td class="p-3 font-mono text-[11px] font-semibold text-emerald-400">{{ m.uptime30d }}%</td>
                    <td class="p-3 font-mono text-[11px]">{{ m.uptime90d }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
import NetPulseSentry from "./components/NetPulseSentry.vue";

const currentView = ref<"uptime" | "packets">("uptime");

const API_BASE = "/api";

interface DayUptime {
  date: string;
  uptimePercentage: number;
  status: "operational" | "degraded" | "down";
  checksCount: number;
  avgLatencyMs: number;
  monitorName?: string;
}

interface CheckRecord {
  timestamp: number;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  statusCode?: number;
  sslDaysRemaining?: number;
  error?: string;
}

interface Monitor {
  id: string;
  name: string;
  group: string;
  url: string;
  type?: "http" | "tcp" | "ssl";
  intervalSec?: number;
  timeoutSec?: number;
  expectedStatusCode?: number;
  expectedKeyword?: string;
  degradedLatencyMs?: number;
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

// Search & Status Filters State
const searchQuery = ref("");
const activeStatusFilter = ref<string>("all");

// Maintenance & Subscribers State
const activeMaintenances = ref<any[]>([]);
const allMaintenances = ref<any[]>([]);
const subscribers = ref<any[]>([]);
const showSubscribeModal = ref(false);
const subForm = ref({ type: "webhook", target: "", name: "" });

// SLA Report Modal State
const showSlaModal = ref(false);
const slaReport = ref<any>(null);
const isLoadingSla = ref(false);

// TV / NOC Mode State
const isNocMode = ref(false);

// AuthHub State
const currentUser = ref<any>(null);
const authToken = ref<string>(localStorage.getItem("pulsehub_auth_token") || "");
const authConfig = ref<any>(null);
const showAdminModal = ref(false);
const windowOrigin = ref(typeof window !== "undefined" ? window.location.origin : "https://pulse-hub.josapratama.com");

// Detail & Latency Trend Modal State
const selectedMonitor = ref<Monitor | null>(null);
const showDetailModal = ref(false);
const monitorChecks = ref<CheckRecord[]>([]);
const isLoadingChecks = ref(false);
const badgeCopied = ref(false);

// Edit Monitor Modal State
const showEditModal = ref(false);
const editMonForm = ref({
  id: "",
  name: "",
  group: "",
  url: "",
  type: "http",
  expectedStatusCode: 200,
  expectedKeyword: "",
  degradedLatencyMs: 2000,
  timeoutSec: 10,
});

// Maintenance Schedule Form State
const maintForm = ref({
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  status: "scheduled",
});

const isAdmin = computed(() => {
  if (!currentUser.value) return false;
  const r = currentUser.value.appRole;
  return currentUser.value.globalRole === "superadmin" || r === "superadmin" || r === "admin";
});

// Admin forms
const newMonForm = ref({
  name: "",
  group: "Ecosystem Applications",
  url: "",
  type: "http",
  expectedStatusCode: 200,
  expectedKeyword: "",
  degradedLatencyMs: 2000,
  timeoutSec: 10,
});
const newIncForm = ref({ title: "", severity: "minor" });

const statusFilters = computed(() => {
  const all = monitors.value.length;
  const operational = monitors.value.filter((m) => !m.paused && m.status === "operational").length;
  const degraded = monitors.value.filter((m) => !m.paused && m.status === "degraded").length;
  const down = monitors.value.filter((m) => !m.paused && m.status === "down").length;
  const paused = monitors.value.filter((m) => m.paused).length;

  return [
    { key: "all", label: "Semua", count: all },
    { key: "operational", label: "Normal", count: operational },
    { key: "degraded", label: "Degraded", count: degraded },
    { key: "down", label: "Down", count: down },
    { key: "paused", label: "Paused", count: paused },
  ];
});

const filteredMonitors = computed(() => {
  return monitors.value.filter((m) => {
    // Status filter
    if (activeStatusFilter.value === "operational" && (m.paused || m.status !== "operational")) return false;
    if (activeStatusFilter.value === "degraded" && (m.paused || m.status !== "degraded")) return false;
    if (activeStatusFilter.value === "down" && (m.paused || m.status !== "down")) return false;
    if (activeStatusFilter.value === "paused" && !m.paused) return false;

    // Search query
    if (searchQuery.value.trim() !== "") {
      const q = searchQuery.value.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchGroup = (m.group || "").toLowerCase().includes(q);
      const matchUrl = (m.url || "").toLowerCase().includes(q);
      if (!matchName && !matchGroup && !matchUrl) return false;
    }

    return true;
  });
});

const groupedMonitors = computed(() => {
  const map: Record<string, Monitor[]> = {};
  for (const m of filteredMonitors.value) {
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
    activeMaintenances.value = data.activeMaintenances || [];
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

async function markIncidentResolved(id: string) {
  try {
    const res = await fetch(`${API_BASE}/incidents/${id}/update`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: "resolved",
        message: "Insiden telah diselesaikan oleh administrator.",
      }),
    });
    if (res.ok) {
      showToast("Insiden berhasil ditandai selesai!", "success");
      fetchStatus();
    } else {
      showToast("Gagal memperbarui insiden.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat menyelesaikan insiden.", "error");
  }
}

async function deleteIncident(id: string) {
  if (!confirm("Yakin ingin menghapus insiden ini?")) return;
  try {
    const res = await fetch(`${API_BASE}/incidents/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      showToast("Insiden berhasil dihapus.", "info");
      fetchStatus();
    } else {
      showToast("Gagal menghapus insiden.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat menghapus insiden.", "error");
  }
}

async function resolveAllIncidents() {
  if (!confirm("Selesaikan semua insiden aktif yang sedang berjalan?")) return;
  try {
    const res = await fetch(`${API_BASE}/incidents/resolve-all`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message: "Seluruh insiden telah diselesaikan oleh administrator.",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Berhasil menyelesaikan ${data.resolvedCount || 0} insiden!`, "success");
      fetchStatus();
    } else {
      showToast("Gagal menyelesaikan insiden.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat menyelesaikan semua insiden.", "error");
  }
}

async function cleanupDuplicates() {
  try {
    const res = await fetch(`${API_BASE}/incidents/cleanup`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(
        `Pembersihan selesai: ${data.resolvedCount || 0} diselesaikan, ${data.deletedCount || 0} duplikat dibuang.`,
        "success"
      );
      fetchStatus();
    } else {
      showToast("Gagal membersihkan duplikat.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat membersihkan insiden.", "error");
  }
}

// ─── Monitor Detail & Latency Chart Methods ───
async function openMonitorDetail(mon: Monitor) {
  selectedMonitor.value = mon;
  showDetailModal.value = true;
  isLoadingChecks.value = true;
  badgeCopied.value = false;
  monitorChecks.value = [];
  try {
    const res = await fetch(`${API_BASE}/monitors/${mon.id}/checks`);
    if (res.ok) {
      const data = await res.json();
      monitorChecks.value = data.checks || [];
    }
  } catch (err) {
    console.error("Failed to load monitor checks", err);
  } finally {
    isLoadingChecks.value = false;
  }
}

function closeDetailModal() {
  showDetailModal.value = false;
  selectedMonitor.value = null;
}

function copyBadgeMarkdown(monId: string) {
  const origin = windowOrigin.value;
  const markdown = `[![PulseHub Status](${origin}/api/badges/${monId}/status.svg)](${origin})`;
  navigator.clipboard.writeText(markdown).then(() => {
    badgeCopied.value = true;
    showToast("Markdown badge berhasil disalin ke clipboard!", "success");
    setTimeout(() => {
      badgeCopied.value = false;
    }, 3000);
  });
}

async function togglePauseMonitor(id: string) {
  try {
    const res = await fetch(`${API_BASE}/monitors/${id}/toggle-pause`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      showToast(
        data.monitor.paused
          ? "Pemantauan dijeda (paused)."
          : "Pemantauan dilanjutkan (active).",
        "info"
      );
      fetchStatus();
      if (selectedMonitor.value && selectedMonitor.value.id === id) {
        selectedMonitor.value.paused = data.monitor.paused;
      }
    } else {
      showToast("Gagal mengubah status pemantauan.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat menjeda pemantauan.", "error");
  }
}

function openEditMonitor(mon: Monitor) {
  editMonForm.value = {
    id: mon.id,
    name: mon.name,
    group: mon.group,
    url: mon.url,
    type: mon.type || "http",
    expectedStatusCode: mon.expectedStatusCode || 200,
    expectedKeyword: mon.expectedKeyword || "",
    degradedLatencyMs: mon.degradedLatencyMs || 2000,
    timeoutSec: mon.timeoutSec || 10,
  };
  showEditModal.value = true;
}

async function submitEditMonitor() {
  if (!editMonForm.value.name || !editMonForm.value.url) return;
  try {
    const res = await fetch(`${API_BASE}/monitors/${editMonForm.value.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(editMonForm.value),
    });
    if (res.ok) {
      showToast("Konfigurasi monitor berhasil diperbarui!", "success");
      showEditModal.value = false;
      fetchStatus();
    } else {
      showToast("Gagal memperbarui monitor.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat memperbarui monitor.", "error");
  }
}

const latencyChartPoints = computed(() => {
  if (!monitorChecks.value.length) return "";
  const checks = monitorChecks.value;
  const maxLat = Math.max(...checks.map((c) => c.latencyMs || 0), 100);
  const width = 500;
  const height = 110;
  const step = width / Math.max(checks.length - 1, 1);

  return checks
    .map((c, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((c.latencyMs || 0) / maxLat) * (height - 24) - 12).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
});

const latencyChartArea = computed(() => {
  if (!monitorChecks.value.length) return "";
  const points = latencyChartPoints.value;
  return `0,110 ${points} 500,110`;
});

const avgLatencyRecent = computed(() => {
  if (!monitorChecks.value.length) return 0;
  const sum = monitorChecks.value.reduce((acc, c) => acc + (c.latencyMs || 0), 0);
  return Math.round(sum / monitorChecks.value.length);
});

const maxLatencyRecent = computed(() => {
  if (!monitorChecks.value.length) return 0;
  return Math.max(...monitorChecks.value.map((c) => c.latencyMs || 0));
});

const minLatencyRecent = computed(() => {
  if (!monitorChecks.value.length) return 0;
  return Math.min(...monitorChecks.value.map((c) => c.latencyMs || 0));
});

// ─── SLA, Subscribers & Maintenance Methods ───
async function openSlaModal() {
  showSlaModal.value = true;
  isLoadingSla.value = true;
  try {
    const res = await fetch(`${API_BASE}/sla-report`);
    if (res.ok) {
      slaReport.value = await res.json();
    }
  } catch {
    showToast("Gagal memuat laporan SLA", "error");
  } finally {
    isLoadingSla.value = false;
  }
}

async function submitSubscribe() {
  if (!subForm.value.target.trim()) {
    showToast("URL Webhook atau email wajib diisi.", "error");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subForm.value),
    });
    if (res.ok) {
      showToast("Berhasil berlangganan notifikasi insiden!", "success");
      showSubscribeModal.value = false;
      subForm.value = { type: "webhook", target: "", name: "" };
      if (isAdmin.value) fetchSubscribers();
    } else {
      showToast("Gagal mendaftarkan notifikasi.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat berlangganan.", "error");
  }
}

async function fetchSubscribers() {
  try {
    const res = await fetch(`${API_BASE}/subscribers`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      subscribers.value = data.subscribers || [];
    }
  } catch {
    // ignore
  }
}

async function deleteSubscriber(id: string) {
  try {
    const res = await fetch(`${API_BASE}/subscribers/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      showToast("Subscriber dihapus.", "info");
      fetchSubscribers();
    }
  } catch {
    showToast("Gagal menghapus subscriber.", "error");
  }
}

async function fetchMaintenances() {
  try {
    const res = await fetch(`${API_BASE}/maintenances`);
    if (res.ok) {
      const data = await res.json();
      activeMaintenances.value = data.active || [];
      allMaintenances.value = data.all || [];
    }
  } catch {
    // ignore
  }
}

async function submitAddMaintenance() {
  if (!maintForm.value.title || !maintForm.value.startAt || !maintForm.value.endAt) {
    showToast("Judul, waktu mulai, dan waktu selesai wajib diisi.", "error");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/maintenances`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(maintForm.value),
    });
    if (res.ok) {
      showToast("Jadwal pemeliharaan berhasil disimpan!", "success");
      maintForm.value = { title: "", description: "", startAt: "", endAt: "", status: "scheduled" };
      fetchMaintenances();
      fetchStatus();
    } else {
      showToast("Gagal menjadwalkan pemeliharaan.", "error");
    }
  } catch {
    showToast("Kesalahan jaringan saat menyimpan jadwal.", "error");
  }
}

async function deleteMaintenance(id: string) {
  try {
    const res = await fetch(`${API_BASE}/maintenances/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      showToast("Jadwal pemeliharaan dihapus.", "info");
      fetchMaintenances();
      fetchStatus();
    }
  } catch {
    showToast("Gagal menghapus pemeliharaan.", "error");
  }
}

function toggleNocMode() {
  isNocMode.value = !isNocMode.value;
  if (isNocMode.value) {
    showToast("TV / NOC Wallboard Mode Aktif.", "info");
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

  // 3. Load initial public status & maintenances
  fetchStatus();
  fetchMaintenances();
  if (authToken.value) {
    fetchSubscribers();
  }
  // Auto-refresh status every 60s
  setInterval(fetchStatus, 60_000);
});
</script>
