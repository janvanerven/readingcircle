# Reading Circle

A self-hosted book club web application for managing book selections, meetings, voting, and reading history.

## Features

- **Reading List** — Add, browse, search, and filter books with read/unread status
- **Meets** — Organize book club meetings with phase-based workflow (Draft → Voting → Reading → Completed)
- **Blind Voting** — Distribute points across candidate books, with reveal and tie-break
- **Availability Polling** — Members vote on proposed dates
- **Top 5 Rankings** — After each meet, members rank their favourite books read so far
- **Invite-Only Access** — Admin invites members via email with magic link registration
- **User Management** — Admin can promote/demote admins and manage members

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Database | SQLite (via Drizzle ORM) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Email | Nodemailer (SMTP) |
| Container | Docker (multi-stage build) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWT access tokens. Use a long random string. |
| `JWT_REFRESH_SECRET` | **Yes** | — | Secret key for signing JWT refresh tokens. Use a different long random string. |
| `ADMIN_USERNAME` | **Yes** | — | Username for the initial admin account (created on first startup). |
| `ADMIN_PASSWORD` | **Yes** | — | Password for the initial admin account. Must meet password requirements (8+ chars, upper, lower, number, special). |
| `DATABASE_PATH` | No | `/app/data/readingcircle.db` | Path to the SQLite database file inside the container. |
| `PORT` | No | `3000` | Port the server listens on. |
| `APP_URL` | No | `http://localhost:3000` | Public URL of the application (used in invitation emails). |
| `SMTP_HOST` | No | — | SMTP server hostname for sending invitation emails. |
| `SMTP_PORT` | No | `587` | SMTP server port. |
| `SMTP_SECURE` | No | `false` | Set to `true` for port 465 (SSL), `false` for STARTTLS. |
| `SMTP_USER` | No | — | SMTP authentication username. |
| `SMTP_PASS` | No | — | SMTP authentication password. |
| `SMTP_FROM` | No | — | Sender email address for outgoing emails. |

> **Note:** If SMTP is not configured, invitation emails are logged to the console instead of being sent. You can copy the invite link from the server logs.

## Quick Start with Docker

### Using `docker run`

```bash
docker run -d \
  --name readingcircle \
  -p 3000:3000 \
  -v readingcircle-data:/app/data \
  -e JWT_SECRET="your-random-secret-here" \
  -e JWT_REFRESH_SECRET="your-random-refresh-secret-here" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="MyP@ssw0rd!" \
  -e APP_URL="http://localhost:3000" \
  jvanerven/readingcircle:latest
```

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  readingcircle:
    image: jvanerven/readingcircle:latest
    container_name: readingcircle
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - readingcircle-data:/app/data
    environment:
      - JWT_SECRET=your-random-secret-here
      - JWT_REFRESH_SECRET=your-random-refresh-secret-here
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=MyP@ssw0rd!
      - APP_URL=http://localhost:3000

volumes:
  readingcircle-data:
```

Then run:

```bash
docker compose up -d
```

### With SMTP (email invitations)

```yaml
services:
  readingcircle:
    image: jvanerven/readingcircle:latest
    container_name: readingcircle
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - readingcircle-data:/app/data
    environment:
      - JWT_SECRET=your-random-secret-here
      - JWT_REFRESH_SECRET=your-random-refresh-secret-here
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=MyP@ssw0rd!
      - APP_URL=https://readingcircle.example.com
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_SECURE=false
      - SMTP_USER=your-email@gmail.com
      - SMTP_PASS=your-app-password
      - SMTP_FROM=your-email@gmail.com

volumes:
  readingcircle-data:
```

### Behind a Reverse Proxy (Traefik example)

```yaml
services:
  readingcircle:
    image: jvanerven/readingcircle:latest
    container_name: readingcircle
    restart: unless-stopped
    volumes:
      - readingcircle-data:/app/data
    environment:
      - JWT_SECRET=your-random-secret-here
      - JWT_REFRESH_SECRET=your-random-refresh-secret-here
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=MyP@ssw0rd!
      - APP_URL=https://readingcircle.example.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.readingcircle.rule=Host(`readingcircle.example.com`)"
      - "traefik.http.routers.readingcircle.entrypoints=websecure"
      - "traefik.http.routers.readingcircle.tls.certresolver=letsencrypt"
      - "traefik.http.services.readingcircle.loadbalancer.server.port=3000"
    networks:
      - traefik

volumes:
  readingcircle-data:

networks:
  traefik:
    external: true
```

## First Login

1. Open the app at your configured URL (default: `http://localhost:3000`)
2. Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you configured
3. Complete the first-time setup (set a new password and email)
4. Invite other members from the Members page

## Data Persistence

The SQLite database is stored at `/app/data/readingcircle.db` inside the container. Mount a volume to `/app/data` to persist data across container restarts and upgrades.

## Building from Source

```bash
git clone https://github.com/janvanerven/readingcircle.git
cd readingcircle
npm install
npm run build
npm start
```

For development with hot reload:

```bash
npm run dev
```

## CI/CD

The repository includes a GitHub Actions workflow (`.github/workflows/docker-publish.yml`) that automatically builds and pushes multi-architecture Docker images (linux/amd64 and linux/arm64) to Docker Hub on every push to `main` or when a version tag is created.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | A Docker Hub access token ([create one here](https://hub.docker.com/settings/security)) |

## License

MIT
