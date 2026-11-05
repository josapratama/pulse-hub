# 📡 PulseHub Sentry

> **Central Uptime, Latency Heatmaps & Incident Command Center**  
> Dashboard pemantauan ketersediaan layanan (*uptime monitoring*), grafik riwayat 90 hari gaya BetterStack, pelacak sisa masa aktif sertifikat SSL HTTPS, serta sistem peringatan insiden otomatis yang terhubung ke **AuthHub SSO** dan **NotifyBridge**.

---

## 🎯 Fitur Utama

1. **BetterStack / Instatus 90-Day Interactive Bars**:
   Visualisasi heatmap 90 batang ramping yang menampilkan persentase uptime dan rata-rata latensi harian saat disentuh/di-hover kursor.
2. **Pemantauan Otomatis & Health Checker**:
   Secara berkala memverifikasi ketersediaan endpoint HTTP/HTTPS, kode status, waktu respons (*latency ms*), dan hari kedaluwarsa sertifikat SSL.
3. **Peringatan Multi-Saluran Cerdas**:
   Saat layanan terdeteksi *DOWN*, PulseHub otomatis mengirim peringatan darurat melalui:
   * **WhatsApp** (via NotifyBridge Gateway)
   * **Telegram Bot**
   * **Discord Webhook** (Rich Embed Alert)
4. **Incident & Post-Mortem Management**:
   Memungkinkan administrator menerbitkan pengumuman investigasi masalah, pemeliharaan berkala (*scheduled maintenance*), serta rekap kronologis penyelesaian insiden.
5. **Autentikasi Aman AuthHub SSO**:
   Mode administrator diamankan menggunakan standar **AuthHub OAuth2 & FIDO2 YubiKey Hardware PIN**.

---

## 🚀 Cara Menjalankan

### Mode Pengembangan (Development):
```bash
# Backend (Port 3000)
cd backend
npm run dev

# Frontend Vite (Port 5173)
cd frontend
npm run dev
```

### Mode Produksi (Self-Contained):
```bash
npm run build
npm start
```
Buka browser di: **`http://localhost:3000`** (backend Express melayani status page publik dan seluruh REST API).

### Deploy via Docker di Mini VPS Panel:
```bash
docker compose up -d --build
```

---

## 📡 REST API Reference

| Endpoint | Method | Keterangan |
| :--- | :--- | :--- |
| `/api/status` | `GET` | Data status publik lengkap (overall status, monitors, 90-day bars, active incidents) |
| `/api/monitors/:id/history` | `GET` | Riwayat 90 hari untuk satu monitor spesifik |
| `/api/monitors/:id/check` | `POST` | Trigger ping manual (Admin) |
| `/api/monitors` | `GET`, `POST` | Kelola daftar monitor yang dipantau (Admin) |
| `/api/monitors/:id` | `DELETE` | Hapus monitor (Admin) |
| `/api/incidents` | `GET`, `POST` | Terbitkan laporan insiden baru (Admin) |
| `/api/incidents/:id/update` | `POST` | Update status insiden / tandai *resolved* (Admin) |
| `/api/settings` | `GET`, `POST` | Pengaturan sistem & integrasi webhook peringatan (Admin) |

---

## 🛠️ Tech Stack
* **Frontend**: Vue 3, Vite, Tailwind CSS, Glassmorphic Design System.
* **Backend**: Node.js, Express, TypeScript, TLS Native SSL Inspector.
* **Architecture**: Self-contained single container runner dengan konsumsi RAM $< 30\text{ MB}$.
