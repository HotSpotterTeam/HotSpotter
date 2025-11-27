#!/usr/bin/env python3
"""
Script to create a local PostgreSQL database with PostGIS using Docker for HotSpotter development.
Works on both Windows and Mac/Linux.
"""

import os
import sys
import subprocess
import time
import platform
from pathlib import Path

# Configuration
CONTAINER_NAME = "hotspotter-db"
DB_NAME = "hotspotter"
DB_USER = "postgres"
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_PORT = "5432"
POSTGRES_VERSION = "17"
POSTGIS_VERSION = "3.5"


def run_command(cmd, check=True, capture_output=False, shell=False, env=None):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            check=check,
            capture_output=capture_output,
            shell=shell,
            env=env,
            text=True,
        )
        return result
    except subprocess.CalledProcessError as e:
        if check:
            print(f"❌ Error running command: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
            print(f"   {e}")
            sys.exit(1)
        return result
    except FileNotFoundError:
        return None


def check_docker():
    """Check if Docker is installed and running."""
    print("🔍 Checking Docker installation...")

    # Check if docker command exists
    result = run_command(["docker", "--version"], check=False, capture_output=True)
    if result is None or result.returncode != 0:
        print("❌ Error: Docker is not installed. Please install Docker first.")
        sys.exit(1)

    # Check if Docker daemon is running
    result = run_command(["docker", "info"], check=False, capture_output=True)
    if result is None or result.returncode != 0:
        print("❌ Error: Docker is not running. Please start Docker first.")
        sys.exit(1)

    print("✅ Docker is installed and running")


def container_exists():
    """Check if the container exists."""
    result = run_command(
        ["docker", "ps", "-a", "--format", "{{.Names}}"],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0:
        return CONTAINER_NAME in result.stdout
    return False


def container_is_running():
    """Check if the container is currently running."""
    result = run_command(
        ["docker", "ps", "--format", "{{.Names}}"],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0:
        return CONTAINER_NAME in result.stdout
    return False


def volume_exists():
    """Check if the Docker volume exists."""
    volume_name = f"{CONTAINER_NAME}-data"
    result = run_command(
        ["docker", "volume", "ls", "--format", "{{.Name}}"],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0:
        return volume_name in result.stdout
    return False


def check_version_incompatibility():
    """Check container logs for PostgreSQL version incompatibility."""
    if not container_exists():
        return False

    result = run_command(
        ["docker", "logs", CONTAINER_NAME, "--tail", "50"],
        check=False,
        capture_output=True,
    )
    if result:
        logs = result.stdout or ""
        # Check for version incompatibility error patterns (case insensitive)
        logs_lower = logs.lower()
        error_patterns = [
            "database files are incompatible",
            "not compatible with this version",
            "the data directory was initialized by postgresql version",
            "fatal:  database files are incompatible",
        ]
        for pattern in error_patterns:
            if pattern.lower() in logs_lower:
                return True
    return False


def handle_version_incompatibility():
    """Handle version incompatibility by cleaning up and recreating."""
    print("")
    print("⚠️  Detected PostgreSQL version incompatibility!")
    print("   The existing data was created with a different PostgreSQL version.")
    print("   Removing old container and volume to start fresh...")
    print("")

    # Stop container if running
    run_command(["docker", "stop", CONTAINER_NAME], check=False)

    # Remove container and volume
    remove_container()
    remove_volume()

    # Create fresh container
    print("")
    print("🔄 Recreating container with fresh data...")
    create_container()


def remove_volume():
    """Remove the Docker volume."""
    volume_name = f"{CONTAINER_NAME}-data"
    print(f"🗑️  Removing old volume '{volume_name}'...")
    result = run_command(
        ["docker", "volume", "rm", volume_name],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0:
        print(f"✅ Volume '{volume_name}' removed successfully.")
        return True
    else:
        print(f"⚠️  Warning: Could not remove volume '{volume_name}'.")
        if result:
            print(f"   {result.stderr}")
        return False


def wait_for_postgres():
    """Wait for PostgreSQL to be fully ready."""
    max_attempts = 60
    attempt = 0

    print("⏳ Waiting for PostgreSQL to be ready...")

    # First, wait for pg_isready
    while attempt < max_attempts:
        result = run_command(
            ["docker", "exec", CONTAINER_NAME, "pg_isready", "-U", DB_USER],
            check=False,
            capture_output=True,
        )
        if result and result.returncode == 0:
            break
        attempt += 1
        time.sleep(1)

    if attempt >= max_attempts:
        print(f"❌ Error: PostgreSQL failed to start within {max_attempts} seconds.")
        return False

    # Then, wait for the database to accept connections
    attempt = 0
    print("⏳ Verifying database connection...")
    while attempt < max_attempts:
        result = run_command(
            [
                "docker",
                "exec",
                CONTAINER_NAME,
                "psql",
                "-U",
                DB_USER,
                "-d",
                DB_NAME,
                "-c",
                "SELECT 1;",
            ],
            check=False,
            capture_output=True,
        )
        if result and result.returncode == 0:
            print("✅ PostgreSQL is ready and accepting connections!")
            time.sleep(2)  # Additional buffer wait
            return True
        attempt += 1
        time.sleep(1)

    print(f"❌ Error: Database failed to accept connections within {max_attempts} seconds.")
    return False


def remove_container():
    """Remove the Docker container."""
    print(f"🗑️  Removing container '{CONTAINER_NAME}'...")
    result = run_command(
        ["docker", "rm", "-f", CONTAINER_NAME],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0:
        print(f"✅ Container '{CONTAINER_NAME}' removed successfully.")
        return True
    return False


def container_exited():
    """Check if the container has exited."""
    result = run_command(
        ["docker", "ps", "-a", "--filter", f"name={CONTAINER_NAME}", "--format", "{{.Status}}"],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0 and result.stdout:
        status = result.stdout.strip()
        # Check for various exit states
        return "Exited" in status or status.startswith("Created")

    # Also check by trying to see if container is in stopped state
    result = run_command(
        ["docker", "inspect", "-f", "{{.State.Status}}", CONTAINER_NAME],
        check=False,
        capture_output=True,
    )
    if result and result.returncode == 0:
        status = result.stdout.strip()
        return status in ["exited", "created", "dead"]
    return False


def create_container():
    """Create and start the PostgreSQL container."""
    print(f"📦 Creating PostgreSQL with PostGIS container '{CONTAINER_NAME}'...")

    cmd = [
        "docker",
        "run",
        "-d",
        "--platform",
        "linux/amd64",
        "--name",
        CONTAINER_NAME,
        "-e",
        f"POSTGRES_USER={DB_USER}",
        "-e",
        f"POSTGRES_PASSWORD={DB_PASSWORD}",
        "-e",
        f"POSTGRES_DB={DB_NAME}",
        "-p",
        f"{DB_PORT}:5432",
        "-v",
        f"{CONTAINER_NAME}-data:/var/lib/postgresql/data",
        f"postgis/postgis:{POSTGRES_VERSION}-{POSTGIS_VERSION}",
    ]

    run_command(cmd)

    # Give container a moment to start and potentially fail
    time.sleep(3)

    # Check if container exited immediately (likely version incompatibility)
    if container_exited():
        print("⚠️  Container exited immediately. Checking logs...")
        # Print logs for debugging
        log_result = run_command(
            ["docker", "logs", CONTAINER_NAME],
            check=False,
            capture_output=True,
        )
        if log_result and log_result.stdout:
            print("   Recent logs:")
            logs = log_result.stdout.split("\n")[-5:]  # Last 5 lines
            for line in logs:
                if line.strip():
                    print(f"   {line}")

        if check_version_incompatibility():
            handle_version_incompatibility()
            return  # create_container will be called again from handle_version_incompatibility

    # Wait for PostgreSQL to be fully ready
    if not wait_for_postgres():
        # Check if it's a version incompatibility issue (in case it failed during wait)
        if check_version_incompatibility():
            print("")
            print("⚠️  Detected PostgreSQL version incompatibility!")
            print("   The existing data was created with a different PostgreSQL version.")
            print("   Removing old container and volume to start fresh...")
            print("")

            # Remove container and volume
            remove_container()
            remove_volume()

            # Recreate container
            print("")
            print("🔄 Recreating container with fresh data...")
            run_command(cmd)
            time.sleep(2)

            # Wait again
            if not wait_for_postgres():
                print("❌ Error: Failed to start PostgreSQL after removing old data.")
                print("   Check logs with: docker logs hotspotter-db")
                sys.exit(1)
        else:
            # Check logs to see what went wrong
            log_result = run_command(
                ["docker", "logs", CONTAINER_NAME, "--tail", "20"],
                check=False,
                capture_output=True,
            )
            if log_result and log_result.stdout:
                print("❌ Error: Failed to start PostgreSQL.")
                print("   Recent logs:")
                for line in log_result.stdout.split("\n")[-10:]:
                    if line.strip():
                        print(f"   {line}")
            else:
                print("❌ Error: Failed to start PostgreSQL. Check logs with: docker logs hotspotter-db")
            sys.exit(1)


def run_migrations():
    """Run Alembic migrations."""
    print("🔄 Running Alembic migrations...")

    # Get the script directory (server directory)
    script_dir = Path(__file__).resolve().parent
    os.chdir(script_dir)

    # Determine Python executable (prefer venv if it exists)
    venv_python = None
    if platform.system() == "Windows":
        venv_python = script_dir / ".venv" / "Scripts" / "python.exe"
    else:
        venv_python = script_dir / ".venv" / "bin" / "python"

    python_exe = sys.executable
    if venv_python and venv_python.exists():
        python_exe = str(venv_python)
        print("   Using virtual environment Python...")

    # Check if alembic is available
    result = run_command(
        [python_exe, "-m", "alembic", "--version"],
        check=False,
        capture_output=True,
    )

    if result is None or result.returncode != 0:
        print("⚠️  Warning: Alembic is not installed or not accessible.")
        print("   Install it with: pip install alembic")
        print("   Then run migrations manually with: alembic upgrade head")
        return False

    # Set environment variables for migrations
    env = os.environ.copy()
    env["DATABASE_URL_LOCAL"] = f"postgresql://{DB_USER}:{DB_PASSWORD}@localhost:{DB_PORT}/{DB_NAME}"
    env["LOCAL_DB"] = "true"

    # Run migrations
    result = run_command(
        [python_exe, "-m", "alembic", "upgrade", "head"],
        check=False,
        env=env,
    )

    if result and result.returncode == 0:
        print("✅ Migrations completed successfully!")
        return True
    else:
        print("❌ Error: Migration failed. Please check the error messages above.")
        return False


def print_connection_info():
    """Print connection information."""
    print("")
    print("📋 Connection details:")
    print(f"   Container name: {CONTAINER_NAME}")
    print(f"   Database name: {DB_NAME}")
    print(f"   Username: {DB_USER}")
    print(f"   Password: {DB_PASSWORD}")
    print(f"   Port: {DB_PORT}")
    print("")
    print("🔗 Connection string:")
    print(f"   postgresql://{DB_USER}:{DB_PASSWORD}@localhost:{DB_PORT}/{DB_NAME}")
    print("")
    print("💡 Add this to your .env file:")
    print(f"   DATABASE_URL_LOCAL=postgresql://{DB_USER}:{DB_PASSWORD}@localhost:{DB_PORT}/{DB_NAME}")
    print("   LOCAL_DB=true")
    print("")
    print("📝 Useful commands:")
    print(f"   Stop container:  docker stop {CONTAINER_NAME}")
    print(f"   Start container: docker start {CONTAINER_NAME}")
    print(f"   Remove container: docker rm -f {CONTAINER_NAME}")
    print(f"   View logs:       docker logs {CONTAINER_NAME}")
    print("")


def main():
    """Main function."""
    print("🐘 Setting up local PostgreSQL database with PostGIS via Docker...")
    print("")

    # Check Docker
    check_docker()
    print("")

    # Check for orphaned volume (volume exists but no container)
    if not container_exists() and volume_exists():
        print("⚠️  Found existing volume but no container.")
        print("   This might be from a previous PostgreSQL version.")
        print("   The volume will be reused. If you encounter version errors,")
        print("   the script will automatically remove it and start fresh.")
        print("")

    # Check if container already exists
    if container_exists():
        if container_is_running():
            print(f"✅ Container '{CONTAINER_NAME}' is already running.")
            if not wait_for_postgres():
                # Check for version incompatibility
                if check_version_incompatibility():
                    handle_version_incompatibility()
                else:
                    sys.exit(1)
        else:
            print(f"🔄 Starting existing container '{CONTAINER_NAME}'...")
            run_command(["docker", "start", CONTAINER_NAME])
            print("✅ Container started successfully.")

            # Give container a moment to start and potentially fail
            time.sleep(2)

            # Check if container exited immediately (likely version incompatibility)
            if container_exited():
                print("⚠️  Container exited immediately. Checking logs...")
                # Print logs for debugging
                log_result = run_command(
                    ["docker", "logs", CONTAINER_NAME],
                    check=False,
                    capture_output=True,
                )
                if log_result and log_result.stdout:
                    print("   Recent logs:")
                    logs = log_result.stdout.split("\n")[-5:]  # Last 5 lines
                    for line in logs:
                        if line.strip():
                            print(f"   {line}")

                if check_version_incompatibility():
                    handle_version_incompatibility()
                else:
                    print("❌ Error: Container exited but no version incompatibility detected.")
                    print("   Check logs with: docker logs hotspotter-db")
                    sys.exit(1)
            elif not wait_for_postgres():
                # Check for version incompatibility (in case it failed during wait)
                if check_version_incompatibility():
                    handle_version_incompatibility()
                else:
                    sys.exit(1)
    else:
        # Create new container
        create_container()

    print("")
    print("✅ Local PostgreSQL database with PostGIS created successfully!")
    print("")

    # Additional wait to ensure database is fully ready for migrations
    print("⏳ Finalizing database setup...")
    time.sleep(3)

    # Run migrations
    run_migrations()

    # Print connection info
    print_connection_info()


if __name__ == "__main__":
    main()
