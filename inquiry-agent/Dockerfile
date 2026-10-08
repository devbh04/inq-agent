FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Optimize uv performance in Docker
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PYTHONUNBUFFERED=1
ENV BACKEND_HOST=0.0.0.0
ENV BACKEND_PORT=8000

# Copy dependency definition files first for efficient Docker layer caching
COPY pyproject.toml uv.lock ./

# Synchronize python dependencies
RUN uv sync --frozen --no-install-project

# Copy application codebase
COPY . .

# Final project sync
RUN uv sync --frozen

# Make sure entrypoint script is executable
RUN chmod +x /app/entrypoint.sh

# Expose backend REST port
EXPOSE 8000

# Entrypoint accepts: 'all' (default), 'backend', or 'agent'
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["all"]
