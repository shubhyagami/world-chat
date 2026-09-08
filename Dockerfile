# ==============================================================================
# Multi-stage Dockerfile for TerraChat 3D / OrbitSync on Render (onrender.com)
# Java 21 + Spring Boot 3.3.4 + MapLibre GL 3D Globe + STOMP WebSockets
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the Spring Boot application using Maven
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /build

# Cache dependencies layer
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application source code and compile
COPY src ./src
RUN mvn clean package -DskipTests

# ------------------------------------------------------------------------------
# Stage 2: Minimal, secure JRE runtime container
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root container user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled JAR from builder stage
COPY --from=builder /build/target/webchat-globe-1.0.0.jar app.jar

# Set file ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Render dynamically assigns the PORT environment variable (default: 8080/10000)
ENV PORT=8080
EXPOSE 8080

# Configure JVM flags optimized for container environments and memory limits (512MB RAM on Render Free Tier)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Launch Spring Boot application with dynamic port binding
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT} -jar app.jar"]
