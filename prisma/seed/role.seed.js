import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await hash('password', 10)

  // 1. Roles
  const adminRole = await prisma.role.upsert({
    where: { nama_role: 'admin' },
    update: {},
    create: { nama_role: 'admin' },
  })

  const teknisiRole = await prisma.role.upsert({
    where: { nama_role: 'teknisi' },
    update: {},
    create: { nama_role: 'teknisi' },
  })

  // 2. Admin user route
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@laporketua.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      nama: 'Admin',
      email: 'admin@laporketua.com',
      password: hashedPassword,
    },
  })

  // 3. Assign role
  await prisma.userRole.upsert({
    where: {
      id_user_id_role: {
        id_user: adminUser.id_user,
        id_role: adminRole.id_role,
      },
    },
    update: {},
    create: {
      id_user: adminUser.id_user,
      id_role: adminRole.id_role,
    },
  })

  console.log('✅ Seed completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
