# Etapa 1: build del frontend (React + Vite)
FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

# Etapa 2: build del backend (.NET)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY Backend/ClinicaDental.Domain/*.csproj Backend/ClinicaDental.Domain/
COPY Backend/ClinicaDental.Application/*.csproj Backend/ClinicaDental.Application/
COPY Backend/ClinicaDental.Infrastructure/*.csproj Backend/ClinicaDental.Infrastructure/
COPY Backend/ClinicaDental.API/*.csproj Backend/ClinicaDental.API/
RUN dotnet restore Backend/ClinicaDental.API/ClinicaDental.API.csproj
COPY Backend/ ./Backend/
RUN dotnet publish Backend/ClinicaDental.API/ClinicaDental.API.csproj -c Release -o /app/publish --no-restore

# Etapa 3: imagen final de runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /src/frontend/dist ./wwwroot

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "ClinicaDental.API.dll"]
