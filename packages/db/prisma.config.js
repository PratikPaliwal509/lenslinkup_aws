import path from 'path';
import { defineConfig } from 'prisma/config';
export default defineConfig({
    earlyAccess: true,
    schema: path.join(__dirname, 'prisma/schema.prisma'),
    datasource: {
        url: process.env.DATABASE_URL ?? 'postgresql://neondb_owner:npg_0UnhS3bdmcEB@ep-gentle-cell-ad9uzzho-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    },
});
