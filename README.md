# SahamLens Desktop

Desktop shell resmi untuk [sahamlens.id](https://sahamlens.id), dibangun dengan Tauri.

## Arsitektur

Aplikasi memuat web SahamLens langsung sebagai sumber tunggal UI dan fitur. Dengan begitu menu, autentikasi, hak akses, data, serta perilaku desktop selalu sama dengan web dan tidak memiliki implementasi kedua yang mudah tertinggal.

Kemampuan native yang tetap dimiliki shell:

- jendela desktop dan taskbar;
- system tray untuk membuka kembali atau keluar;
- paket installer Windows/Linux/macOS dari Tauri.

Konten `https://sahamlens.id` sengaja **tidak** diberi akses ke IPC Tauri. Kontrol jendela memakai dekorasi native OS, sehingga aplikasi web tidak memerlukan izin filesystem, shell, notification, atau window API.

Konsekuensinya, aplikasi membutuhkan koneksi internet. Offline mode bukan bagian dari produk saat ini karena seluruh fitur SahamLens juga bergantung pada API live.

## Development

```bash
npm ci
npm run dev
```

`npm run dev` membuka shell ke lingkungan produksi SahamLens. Uji perubahan fitur dilakukan di repository web `/home/lens/sahamlens`; repository ini hanya memiliki lifecycle desktop.

## Verification dan build

```bash
npm run check
npm run build
```

`npm run build` membuat binary dan installer melalui Tauri. Workflow Windows menjalankan proses yang sama lewat `tauri-apps/tauri-action`.
