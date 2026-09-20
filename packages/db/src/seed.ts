import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean slate
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.bot.deleteMany()
  await prisma.tenant.deleteMany()

  // Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      dataRegion: 'us',
      plan: 'pro',
    },
  })

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`)

  // Admin user
  const adminHash = await bcrypt.hash('password123', 10)
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@acme.com',
      displayName: 'Admin User',
      passwordHash: adminHash,
    },
  })
  await prisma.membership.create({
    data: { tenantId: tenant.id, userId: admin.id, role: 'ADMIN' },
  })
  console.log(`✅ Admin: ${admin.email}`)

  // Developer user
  const devHash = await bcrypt.hash('password123', 10)
  const dev = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'dev@acme.com',
      displayName: 'Dev User',
      passwordHash: devHash,
    },
  })
  await prisma.membership.create({
    data: { tenantId: tenant.id, userId: dev.id, role: 'DEVELOPER' },
  })
  console.log(`✅ Developer: ${dev.email}`)

  // Bot
  const bot = await prisma.bot.create({
    data: {
      tenantId: tenant.id,
      name: 'Acme Support Bot',
      description: 'Customer support automation',
      status: 'active',
      environments: {
        create: [
          { tenantId: tenant.id, kind: 'sandbox', name: 'Sandbox' },
          { tenantId: tenant.id, kind: 'production', name: 'Production' },
        ],
      },
    },
    include: { environments: true },
  })
  console.log(`✅ Bot: ${bot.name} (${bot.environments.length} environments)`)

  // Sample flow
  await prisma.flow.create({
    data: {
      tenantId: tenant.id,
      botId: bot.id,
      name: 'Welcome Flow',
      kind: 'flow',
      tags: ['welcome', 'onboarding'],
    },
  })
  console.log('✅ Sample flow: Welcome Flow')

  // Sample intent
  await prisma.intent.create({
    data: {
      tenantId: tenant.id,
      botId: bot.id,
      name: 'greeting',
      utterances: ['hi', 'hello', 'hey', 'good morning', 'good afternoon'],
      responses: [{ text: 'Hello! How can I help you today?' }],
    },
  })
  console.log('✅ Sample intent: greeting')

  console.log('\n🎉 Seed complete!')
  console.log('\nLogin credentials:')
  console.log('  Admin:     admin@acme.com / password123')
  console.log('  Developer: dev@acme.com   / password123')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
