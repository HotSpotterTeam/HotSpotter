#!/bin/bash

# Script to create a local PostgreSQL database with PostGIS using Docker for HotSpotter development

set -e  # Exit on error

# Configuration
CONTAINER_NAME="hotspotter-db"
DB_NAME="hotspotter"
DB_USER="postgres"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DB_PORT="5432"
POSTGRES_VERSION="15"

echo "🐘 Setting up local PostgreSQL database with PostGIS via Docker..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Function to wait for PostgreSQL to be fully ready
wait_for_postgres() {
    local max_attempts=60
    local attempt=0
    echo "⏳ Waiting for PostgreSQL to be ready..."
    
    # First, wait for pg_isready
    while [ $attempt -lt $max_attempts ]; do
        if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" &> /dev/null; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Error: PostgreSQL failed to start within ${max_attempts} seconds."
        return 1
    fi
    
    # Then, wait for the database to accept connections
    attempt=0
    echo "⏳ Verifying database connection..."
    while [ $attempt -lt $max_attempts ]; do
        if docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" &> /dev/null; then
            echo "✅ PostgreSQL is ready and accepting connections!"
            # Additional buffer wait to ensure everything is fully initialized
            sleep 2
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo "❌ Error: Database failed to accept connections within ${max_attempts} seconds."
    return 1
}

# Check if container already exists
CONTAINER_EXISTS=false
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    CONTAINER_EXISTS=true
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "✅ Container '${CONTAINER_NAME}' is already running."
        # Still verify it's ready
        wait_for_postgres || exit 1
    else
        echo "🔄 Starting existing container '${CONTAINER_NAME}'..."
        docker start "${CONTAINER_NAME}"
        echo "✅ Container started successfully."
        wait_for_postgres || exit 1
    fi
fi

# Create and start the PostgreSQL container if it doesn't exist
if [ "$CONTAINER_EXISTS" = false ]; then
    echo "📦 Creating PostgreSQL with PostGIS container '${CONTAINER_NAME}'..."
    docker run -d \
        --name "${CONTAINER_NAME}" \
        -e POSTGRES_USER="${DB_USER}" \
        -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
        -e POSTGRES_DB="${DB_NAME}" \
        -p "${DB_PORT}:5432" \
        -v "${CONTAINER_NAME}-data:/var/lib/postgresql/data" \
        postgis/postgis:${POSTGRES_VERSION}-3.3

    # Wait for PostgreSQL to be fully ready
    wait_for_postgres || exit 1
fi

echo ""
echo "✅ Local PostgreSQL database with PostGIS created successfully!"
echo ""

# Additional wait to ensure database is fully ready for migrations
echo "⏳ Finalizing database setup..."
sleep 3

# Run Alembic migrations
echo "🔄 Running Alembic migrations..."
DATABASE_URL_LOCAL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
LOCAL_DB="true"

# Change to server directory to run alembic
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Check if virtual environment exists and activate it if present
if [ -d ".venv" ]; then
    echo "   Activating virtual environment..."
    source .venv/bin/activate
fi

# Check if alembic is available
if ! command -v alembic &> /dev/null; then
    echo "⚠️  Warning: Alembic is not installed or not in PATH."
    echo "   Install it with: pip install alembic"
    echo "   Then run migrations manually with: alembic upgrade head"
else
    # Run migrations with local database URL
    export DATABASE_URL_LOCAL
    export LOCAL_DB
    if alembic upgrade head; then
        echo "✅ Migrations completed successfully!"
    else
        echo "❌ Error: Migration failed. Please check the error messages above."
        exit 1
    fi
fi

echo ""
echo "📋 Connection details:"
echo "   Container name: ${CONTAINER_NAME}"
echo "   Database name: ${DB_NAME}"
echo "   Username: ${DB_USER}"
echo "   Password: ${DB_PASSWORD}"
echo "   Port: ${DB_PORT}"
echo ""
echo "🔗 Connection string:"
echo "   postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
echo ""
echo "💡 Add this to your .env file:"
echo "   DATABASE_URL_LOCAL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
echo "   LOCAL_DB=true"
echo ""
echo "📝 Useful commands:"
echo "   Stop container:  docker stop ${CONTAINER_NAME}"
echo "   Start container: docker start ${CONTAINER_NAME}"
echo "   Remove container: docker rm -f ${CONTAINER_NAME}"
echo "   View logs:       docker logs ${CONTAINER_NAME}"
echo ""
