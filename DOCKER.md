# Docker 环境搭建指南

本项目使用 Docker Compose 来管理开发和生产环境。

## 快速开始

### 1. 前置要求

- Docker Desktop（Mac/Windows）或 Docker Engine + Docker Compose（Linux）
- 确保 Docker 版本 >= 20.10

### 2. 环境变量配置

复制环境变量示例文件：

```bash
cp env.example .env.local
```

根据需要修改 `.env.local` 中的配置（特别是密码和密钥）。

### 3. 启动服务

启动所有服务（MongoDB、PostgreSQL、Next.js 应用）：

```bash
docker-compose up -d
```

查看服务状态：

```bash
docker-compose ps
```

查看日志：

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f postgres
```

### 4. 访问应用

- **应用地址**: http://localhost:3000
- **MongoDB**: localhost:27017
- **PostgreSQL**: localhost:5432

### 5. 停止服务

```bash
# 停止服务（保留数据）
docker-compose stop

# 停止并删除容器（保留数据卷）
docker-compose down

# 停止并删除所有数据（⚠️ 危险操作）
docker-compose down -v
```

## 服务说明

### MongoDB

- **容器名**: `smartcourse-mongodb`
- **端口**: 27017
- **默认用户**: admin
- **默认密码**: admin123
- **数据库**: smartcourse
- **数据卷**: `mongodb_data`（持久化存储）

### PostgreSQL (with pgvector)

- **容器名**: `smartcourse-postgres`
- **端口**: 5432
- **默认用户**: postgres
- **默认密码**: postgres123
- **数据库**: smartcourse
- **数据卷**: `postgres_data`（持久化存储）
- **扩展**: pgvector（自动启用）

### Next.js 应用

- **容器名**: `smartcourse-app`
- **端口**: 3000
- **模式**: 开发模式（热重载）
- **数据卷**: 代码目录挂载（实时同步）

## 开发模式 vs 生产模式

### 开发模式（默认）

使用 `Dockerfile.dev`，支持：
- 热重载
- 源代码实时同步
- 开发工具支持

启动：
```bash
docker-compose up
```

### 生产模式

使用 `Dockerfile`，优化：
- 多阶段构建
- 最小化镜像大小
- standalone 输出模式

要使用生产模式，需要：
1. 修改 `docker-compose.yml`，取消注释 `app-prod` 服务
2. 注释掉 `app` 服务
3. 配置生产环境变量

```bash
docker-compose up app-prod
```

## 数据库初始化

### MongoDB

MongoDB 会在首次启动时自动创建数据库和用户。

### PostgreSQL

PostgreSQL 会在应用首次连接时自动初始化 pgvector 扩展和表结构（通过 `lib/vectorDb.ts` 的 `initVectorDb` 函数）。

## 数据持久化

所有数据都存储在 Docker volumes 中：

- `mongodb_data`: MongoDB 数据
- `postgres_data`: PostgreSQL 数据

即使删除容器，数据也会保留。要完全清除数据：

```bash
docker-compose down -v
```

## 常见问题

### 1. 端口被占用

如果 3000、27017 或 5432 端口被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 将主机端口改为 3001
```

### 2. 权限问题

如果遇到权限问题，确保：
- Docker 有足够权限访问项目目录
- 文件权限正确（特别是 Linux 系统）

### 3. 连接失败

确保服务健康检查通过：

```bash
docker-compose ps
```

所有服务应该显示 `healthy` 状态。

### 4. 数据丢失

检查 volumes 是否正常：

```bash
docker volume ls
docker volume inspect smartcourse_mongodb_data
```

## 备份和恢复

### 备份 MongoDB

```bash
docker exec smartcourse-mongodb mongodump --out /data/backup --username admin --password admin123 --authenticationDatabase admin
docker cp smartcourse-mongodb:/data/backup ./mongodb-backup
```

### 备份 PostgreSQL

```bash
docker exec smartcourse-postgres pg_dump -U postgres smartcourse > postgres-backup.sql
```

### 恢复

恢复操作类似，使用 `mongorestore` 和 `psql` 命令。

## 性能优化

### 开发环境

- 使用 volume 挂载源代码，实现热重载
- 使用 `node_modules` 匿名卷，避免同步问题

### 生产环境

- 使用多阶段构建，减小镜像大小
- 使用 standalone 输出，优化启动时间
- 考虑使用 Docker Swarm 或 Kubernetes 进行扩展

## 安全建议

⚠️ **重要**: 在生产环境中：

1. 修改所有默认密码
2. 使用强密码和密钥
3. 配置防火墙规则
4. 使用 Docker secrets 管理敏感信息
5. 定期更新镜像版本
6. 启用 TLS/SSL 连接

## 更多信息

- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js Docker 部署](https://nextjs.org/docs/deployment#docker-image)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [pgvector Docker Hub](https://hub.docker.com/r/pgvector/pgvector)


