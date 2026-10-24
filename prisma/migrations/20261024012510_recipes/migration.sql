-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ingredients" TEXT[],
    "steps" TEXT[],
    "tags" TEXT[],
    "sourceText" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "reports" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeReport" (
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeReport_pkey" PRIMARY KEY ("userId","recipeId")
);

-- CreateIndex
CREATE INDEX "Recipe_createdAt_idx" ON "Recipe"("createdAt");

-- CreateIndex
CREATE INDEX "Recipe_tags_idx" ON "Recipe" USING GIN ("tags");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeReport" ADD CONSTRAINT "RecipeReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeReport" ADD CONSTRAINT "RecipeReport_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
