# Ayep Blass 24 — versi koin virtual

Fitur:
- Register member dan ACC admin
- Login JWT
- URL admin `/?role=admin`
- Chat realtime
- Daftar pemain online
- Game block puzzle sederhana
- Admin dapat memberi koin virtual
- Tombol `DEPO` hanya membuka chat admin; tidak memproses uang asli

Jalankan:
1. Install Node.js.
2. `npm install`
3. `npm start`
4. Buka `http://localhost:3000/`
5. Admin: `http://localhost:3000/?role=admin`
6. Akun demo: admin / admin123

Untuk internet, deploy server ini ke hosting Node.js dan gunakan HTTPS. Ganti JWT_SECRET dengan secret acak yang kuat.
