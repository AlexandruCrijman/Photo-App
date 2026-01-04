# Development Guide - Wedding Photo App

This guide explains how to set up and develop the Wedding Photo App using Docker.

## Prerequisites

- Docker Desktop installed and running
- Git (for version control)
- Sufficient disk space (~3-5GB for images, models, and data)

## Initial Setup

### 1. Environment Configuration

Copy the example environment files and configure them:

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your OPENAI_API_KEY

# Frontend environment
cp frontend/.env.example frontend/.env
# Edit frontend/.env if needed (default should work for Docker)
```

**Required Environment Variables:**

- `OPENAI_API_KEY`: Your OpenAI API key for photo descriptions (required)
- `DATABASE_URL`: Automatically set in Docker to `postgres://postgres:postgres@db:5432/photo_app`
- `FRONTEND_ORIGIN`: Set to `http://localhost:5173` for development
- Model paths: Configure in `backend/.env` if using different model files

### 2. Download AI Models

The application requires AI model files for face detection and recognition. Download them using the provided script:

```bash
# On Linux/Mac
./scripts/download-models.sh

# On Windows (PowerShell)
# You may need to download models manually or use WSL
# See scripts/download-models.sh for download URLs
```

**Required Models:**
- `scrfd_2.5g_bnkps.onnx` - Face detection (SCRFD)
- `arcface_r50.onnx` - Face recognition (ArcFace)
- `osnet_x0_25.onnx` - Person re-identification (OSNet)

Place downloaded models in `backend/models/` directory.

**Model Download Sources:**
- SCRFD: https://github.com/deepinsight/insightface/releases/tag/v0.7
- ArcFace: https://github.com/deepinsight/insightface/releases
- OSNet: https://github.com/KaiyangZhou/deep-person-reid

### 3. Start Docker Services

```bash
# Start all services in detached mode
npm run docker:up

# Or using docker-compose directly
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Backend API server (port 4000)
- Frontend development server (port 5173)

### 4. Initialize Database

Run database migrations:

```bash
npm run docker:migrate

# Or manually
docker-compose exec backend npm run migrate
```

## Development Workflow

### Accessing Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health
- **Database**: localhost:5432 (only accessible from containers by default)

### Hot Reload

Both frontend and backend support hot reload:

- **Backend**: Uses nodemon, automatically restarts on file changes in `backend/src/`
- **Frontend**: Uses Vite HMR, updates browser automatically on file changes in `frontend/src/`

Changes to mounted source code directories are reflected immediately without rebuilding containers.

### Viewing Logs

```bash
# All services
npm run docker:logs

# Specific service
npm run docker:logs:backend
npm run docker:logs:frontend
npm run docker:logs:db

# Or using docker-compose
docker-compose logs -f [service-name]
```

### Running Commands in Containers

```bash
# Access backend container shell
npm run docker:exec:backend

# Access frontend container shell
npm run docker:exec:frontend

# Run specific commands
docker-compose exec backend npm test
docker-compose exec backend npm run migrate
```

### Adding Dependencies

When adding new npm packages:

1. **Backend dependencies:**
   ```bash
   # Option 1: Install in container
   docker-compose exec backend npm install [package-name]
   
   # Option 2: Install locally, then rebuild
   cd backend
   npm install [package-name]
   cd ..
   docker-compose build backend
   ```

2. **Frontend dependencies:**
   ```bash
   # Option 1: Install in container
   docker-compose exec frontend npm install [package-name]
   
   # Option 2: Install locally, then rebuild
   cd frontend
   npm install [package-name]
   cd ..
   docker-compose build frontend
   ```

**Note:** For persistent changes, install locally and commit `package.json` and `package-lock.json`. The container will use the updated files on next rebuild.

### Database Management

**Run Migrations:**
```bash
npm run docker:migrate
```

**Access Database:**
```bash
# Using psql in container
docker-compose exec db psql -U postgres -d photo_app

# Or from host (if port is exposed)
psql -h localhost -U postgres -d photo_app
```

**Backup Database:**
```bash
docker-compose exec db pg_dump -U postgres photo_app > backup.sql
```

**Restore Database:**
```bash
docker-compose exec -T db psql -U postgres photo_app < backup.sql
```

## Docker Commands Reference

All commands can be run via npm scripts or docker-compose directly:

| npm script | docker-compose equivalent | Description |
|-----------|---------------------------|-------------|
| `npm run docker:up` | `docker-compose up -d` | Start all services |
| `npm run docker:down` | `docker-compose down` | Stop all services |
| `npm run docker:logs` | `docker-compose logs -f` | View all logs |
| `npm run docker:rebuild` | `docker-compose build --no-cache` | Rebuild all images |
| `npm run docker:restart` | `docker-compose restart` | Restart all services |
| `npm run docker:clean` | `docker-compose down -v` | Remove volumes and containers |
| `npm run docker:ps` | `docker-compose ps` | List running containers |
| `npm run docker:migrate` | `docker-compose exec backend npm run migrate` | Run DB migrations |

## Troubleshooting

### Port Conflicts

If ports 4000, 5173, or 5432 are already in use:

1. **Change ports in docker-compose.yml:**
   ```yaml
   services:
     backend:
       ports:
         - "4001:4000"  # Change host port
   ```

2. **Or stop conflicting services:**
   ```bash
   # Find process using port (Windows)
   netstat -ano | findstr :4000
   
   # Kill process (replace PID)
   taskkill /PID [PID] /F
   ```

### Container Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs [service-name]
   ```

2. **Verify environment files:**
   - Ensure `backend/.env` exists and has required variables
   - Check `OPENAI_API_KEY` is set

3. **Rebuild containers:**
   ```bash
   npm run docker:rebuild
   npm run docker:up
   ```

### Database Connection Issues

1. **Wait for database to be healthy:**
   ```bash
   docker-compose ps
   # Ensure db service shows "healthy"
   ```

2. **Check database logs:**
   ```bash
   npm run docker:logs:db
   ```

3. **Verify DATABASE_URL in backend/.env:**
   - Should be: `postgres://postgres:postgres@db:5432/photo_app`
   - Use service name `db`, not `localhost`

### Model Loading Errors

1. **Verify models exist:**
   ```bash
   ls -la backend/models/*.onnx
   ```

2. **Check model paths in backend/.env:**
   ```env
   SCRFD_MODEL_PATH=models/scrfd_2.5g_bnkps.onnx
   ARCFACE_MODEL_PATH=models/arcface_r50.onnx
   OSNET_MODEL_PATH=models/osnet_x0_25.onnx
   ```

3. **Verify file permissions:**
   - Models should be readable by the container
   - Check volume mount in docker-compose.yml

### Hot Reload Not Working

1. **Verify volume mounts:**
   ```bash
   docker-compose config
   # Check that source directories are mounted
   ```

2. **Check file watching:**
   - On Windows, ensure Docker Desktop has file sharing enabled
   - Check Docker Desktop settings > Resources > File Sharing

3. **Restart services:**
   ```bash
   npm run docker:restart
   ```

### Permission Errors

1. **On Linux/Mac:**
   ```bash
   # Fix uploads directory permissions
   sudo chown -R $USER:$USER backend/uploads
   ```

2. **On Windows:**
   - Ensure Docker Desktop has access to the project directory
   - Check Docker Desktop settings > Resources > File Sharing

### Clean Slate

To start completely fresh:

```bash
# Stop and remove everything
npm run docker:clean

# Remove images (optional)
docker-compose down --rmi all

# Rebuild and start
npm run docker:rebuild
npm run docker:up
npm run docker:migrate
```

## Production Deployment

For production deployment, use the production compose file:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Production differences:**
- No source code volume mounts (uses built images)
- Production Node.js environment
- Optimized builds
- Database port not exposed to host

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
- [Vite Documentation](https://vite.dev/)

## Getting Help

If you encounter issues:

1. Check logs: `npm run docker:logs`
2. Verify environment configuration
3. Ensure all prerequisites are met
4. Check Docker Desktop is running
5. Review troubleshooting section above

