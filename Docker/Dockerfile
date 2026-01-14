FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including LibreOffice
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libreoffice \
    libreoffice-writer \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy Backend requirements and install Python dependencies
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend code and AI model
COPY Backend/ ./Backend/
COPY AI_model/ ./AI_model/

# Set working directory to Backend
WORKDIR /app/Backend

# Expose port
EXPOSE 10000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
