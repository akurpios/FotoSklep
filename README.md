# FotoSklep • Client Proofing Portal

A high-aesthetic, production-grade photo proofing portal designed for professional photographers following Apple's fluid design principles. Built as a lightweight, single Docker container with an embedded SQLite database and dynamic watermarking powered by `sharp`.

> ⚠️ **Disclaimer:** This project was **vibe-coded as a fun side project.** It is provided as-is, and there is no guarantee that it will be actively maintained or updated in the future. Feel free to fork it, adapt it, or use it as inspiration!

## Photographer Workspace
<img width="1920" height="1050" alt="Screenshot 2026-11-10 at 21 11 36" src="https://github.com/user-attachments/assets/6b901747-187c-488c-97fd-8b282001fc6b" />
<img width="1674" height="963" alt="Screenshot 2026-11-10 at 21 10 59" src="https://github.com/user-attachments/assets/cd33e019-cf2b-4c1a-88f7-ce904912264a" />
<img width="1920" height="1050" alt="Screenshot 2026-11-10 at 21 12 42" src="https://github.com/user-attachments/assets/eedbe717-7a2f-4936-916a-a9b8de1d1b05" />
<img width="1920" height="1050" alt="Screenshot 2026-11-10 at 21 11 13" src="https://github.com/user-attachments/assets/e094901b-9a92-4e3e-b3f3-5d6dc4bf413d" />
<img width="1920" height="1050" alt="Screenshot 2026-11-10 at 21 11 23" src="https://github.com/user-attachments/assets/16485237-49a4-40b1-ae90-c1d1cf0fbcb4" />

## Client proofing portal
<img width="1674" height="963" alt="Screenshot 2026-11-10 at 21 31 26" src="https://github.com/user-attachments/assets/989cd9fb-2400-4e68-bf92-710be93e1526" />
<img width="1674" height="963" alt="Screenshot 2026-11-10 at 21 09 05" src="https://github.com/user-attachments/assets/3db07a54-313e-4b20-b65e-b89297069344" />
<img width="1674" height="963" alt="Screenshot 2026-11-10 at 21 09 24" src="https://github.com/user-attachments/assets/de415590-1b60-4c04-adea-4d01b6a5d454" />
<img width="1674" height="963" alt="Screenshot 2026-11-10 at 21 09 41" src="https://github.com/user-attachments/assets/1be6e59c-c0a5-4f9c-85c3-f3d5181758b7" />
<img width="1674" height="963" alt="Pasted 2026-11-10 at 9 12 13 PM" src="https://github.com/user-attachments/assets/214693d7-a28d-42f5-ba03-2e01db5873fd" />

---

## Key Features

### 1. Photographer Dashboard (Admin)
- **Session Management**: Create client sessions, configure package limits (e.g., 10 photos included), extra photo pricing (e.g., 40 PLN), billing currency, and secure 8-digit access PINs.
- **Batch Photo Uploads**: Drag-and-drop multi-file uploader handling high-resolution images with real-time upload progress and thumbnail generation.
- **Studio Watermark Engine (`sharp`)**:
  - Upload a transparent PNG watermark logo directly in Studio Settings with live transparency preview.
  - Per-gallery toggle: choose whether watermarking should be enabled or disabled for each session.
  - Original photos are preserved untouched on disk for post-processing and client exports.
- **Configurable Public Domain**: Set a canonical public domain (e.g., `https://fotosklep.your.domain`) so copied client share links are always consistent and secure, whether accessed locally via LAN IP or over the internet.
- **Multi-Language Support (i18n)**: Seamless language switcher in the navigation bar (🇵🇱 Polski / 🇬🇧 English).
- **Confirmed Selection Inspector**:
  - Filtered view displaying strictly client-confirmed selections.
  - **Lightroom Direct Import**: 1-click "Copy File Names" button copying comma-separated filenames (`IMG_1024.JPG, IMG_1056.JPG`) to clipboard for immediate filtering in Adobe Lightroom or Capture One.
  - Real-time financial summary: photos within package tier, extra photos selected, and calculated extra surcharge.
- **Session Lifecycle**: Status indicators (`Draft`, `Pending Client Selection`, `Confirmed by Client`, `Completed`) with the option to reopen sessions for client revisions.

### 2. Client Experience (Public View)
- **Gatekeeper**: Clean iOS-inspired 8-digit PIN unlock screen with auto-focus and timing-safe authentication (`crypto.timingSafeEqual`).
- **Proofing Grid & Lightbox**: Responsive editorial grid with lazy-loaded previews, quick-select heart toggle with tactile spring feedback, and fullscreen darkroom lightbox with keyboard navigation.
- **Sticky Selection Bar**: Apple-style translucent floating bar displaying real-time selection tally and live calculation of extra surcharges.
- **Confirmation Modal**: Review selected photos, verify pricing breakdown, accept terms, and lock the gallery from further edits upon submission.

---

## Architecture & Docker Deployment

- **Container Port**: `4838`
- **Persistent Storage Volume**: `./data:/app/data`
  - SQLite Database: `./data/fotosklep.db`
  - Uploaded Photos & Watermarked Previews: `./data/uploads/`
  - Studio Watermark Logo: `./data/uploads/watermark_logo.png`

### Installation & Setup

#### First-time Installation
Clone the repository and spin up the container:
```bash
git clone https://github.com/akurpios/fotosklep.git
cd fotosklep
docker compose up -d --build
```
Once started, the application will be running at `http://<YOUR_SERVER_IP>:4838`.

#### Updating to the Latest Version
To pull the newest updates and rebuild the container without downtime:
```bash
cd fotosklep
git pull
docker compose up -d --build
```

---

## Cloudflare Tunnel Configuration

To securely expose the Client Proofing Portal to the internet under `fotosklep.your.domain` (without opening router ports, and keeping the photographer admin dashboard private to your local network), follow these steps in the Cloudflare Zero Trust dashboard.

### 1. Add Public Hostname in Cloudflare Tunnel
1. Go to **Cloudflare Zero Trust** -> **Networks** -> **Tunnels**.
2. Select your active `cloudflared` tunnel and click **Configure**.
3. Under the **Public Hostname** tab, click **Add a public hostname**.
4. Configure the route:
   - **Subdomain**: `fotosklep`
   - **Domain**: `your.domain`
   - **Type**: `HTTP`
   - **URL**: `DockerIP:ContainerPort` (or `fotosklep:4838` if cloudflared shares the same Docker network).
5. Click **Save hostname**.

---

### 2. Protect Admin Dashboard with Cloudflare WAF Custom Rule
To ensure external clients can **only** access proofing galleries, while blocking public access to the admin workspace (`/`, `/api/projects`, `/api/settings`):

1. In the Cloudflare Dashboard, navigate to your domain zone: **your.domain** -> **Security** -> **WAF** -> **Custom rules**.
2. Click **Create rule**.
3. Name the rule: `Protect FotoSklep Admin`.
4. Open the **Expression Editor** and paste:
   ```text
   (http.host eq "fotosklep.your.domain" and not (
       http.request.uri.path starts_with "/gallery" or 
       http.request.uri.path starts_with "/api/gallery" or 
       http.request.uri.path starts_with "/uploads" or 
       http.request.uri.path starts_with "/assets"
   ))
   ```
5. Choose action: **Block** (or **Managed Challenge**).
6. Deploy the rule.

> [!NOTE]
> Under this rule:
> - Clients opening share links (`https://fotosklep.your.domain/gallery/...`) enter their 8-digit PIN and review photos securely.
> - Any external requests to the root path `/` or admin management APIs are blocked at Cloudflare's edge.
> - The photographer manages sessions and uploads photos locally via LAN at `http://DockerIP:ContainerPort`.

---

### 3. Configure Domain in FotoSklep Settings
After configuring the tunnel:
1. Open the photographer dashboard on your local network: `http://DockerIP:ContainerPort`.
2. Click the **Studio & Domain Settings (🌐)** button in the navigation bar.
3. In the **Public Gallery Domain** field, set:
   ```text
   https://fotosklep.your.domain
   ```
4. Click **Save Domain**.
5. All generated "Copy Link" buttons across the application will now generate canonical HTTPS links (e.g. `https://fotosklep.your.domain/gallery/session-name-abc12`).
