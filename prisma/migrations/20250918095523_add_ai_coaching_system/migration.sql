-- CreateTable
CREATE TABLE "player_analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerNickname" TEXT NOT NULL,
    "playerServer" TEXT NOT NULL,
    "playStyle" TEXT NOT NULL,
    "playstyleScore" REAL NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "killDeathRatio" REAL NOT NULL,
    "damagePerGame" REAL NOT NULL,
    "survivalRate" REAL NOT NULL,
    "aggressionIndex" REAL NOT NULL,
    "consistencyIndex" REAL NOT NULL,
    "recommendations" TEXT NOT NULL,
    "trainingPlan" TEXT NOT NULL,
    "lastAnalyzed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "coaching_tips" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "playStyle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerNickname" TEXT NOT NULL,
    "playerServer" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "targetSkill" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "exercises" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "player_analyses_playerNickname_playerServer_key" ON "player_analyses"("playerNickname", "playerServer");
