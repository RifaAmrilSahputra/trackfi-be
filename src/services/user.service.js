import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function getUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } })
}

async function getUserById(id) {
  return prisma.user.findUnique({ where: { id_user: Number(id) } })
}

async function assignRole(id_user, roleName) {
  const role = await prisma.role.findUnique({ where: { nama_role: roleName } })
  if (!role) return null
  return prisma.userRole.create({ data: { id_user, id_role: role.id_role } })
}

async function assignRoles(id_user, roles = []) {
  return Promise.all(
    roles.map(r => assignRole(id_user, r))
  )
}

async function createDataTeknisi({ id_user, no_hp, area_kerja, alamat = null, koordinat = null }) {
  return prisma.dataTeknisi.create({
    data: {
      id_teknisi: id_user,
      no_hp: no_hp || '',
      area_kerja: area_kerja || '',
      alamat,
      koordinat,
    },
  })
}

async function createUserWithRolesAndTeknisi({ name, email, password, roles = ['teknisi'], phone = null, area_kerja = null, alamat = null, koordinat = null }) {
  return prisma.$transaction(async (tx) => {
    // check email
    const exists = await tx.user.findUnique({ where: { email } })
    if (exists) {
      const err = new Error('Email sudah terdaftar')
      err.statusCode = 409
      throw err
    }

    const hashed = await hash(password, 10)

    const user = await tx.user.create({
      data: {
        nama: name,
        email,
        password: hashed,
      },
    })

    // assign roles in parallel
    const roleRecords = await Promise.all(
      roles.map(rn => tx.role.findUnique({ where: { nama_role: rn } }))
    )

    await Promise.all(
      roleRecords.filter(Boolean).map(role => tx.userRole.create({ data: { id_user: user.id_user, id_role: role.id_role } }))
    )

    // create teknisi data if needed
    if (roles.includes('teknisi') && (phone || area_kerja || alamat || koordinat)) {
      await tx.dataTeknisi.create({
        data: {
          id_teknisi: user.id_user,
          no_hp: phone || '',
          area_kerja: area_kerja || '',
          alamat: alamat || null,
          koordinat: koordinat || null,
        },
      })
    }

    const { password: _p, ...rest } = user
    return rest
  })
}

async function getTeknisiUsers() {
  return prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            nama_role: 'teknisi'
          }
        }
      }
    },
    include: {
      roles: {
        include: {
          role: true
        }
      },
      teknisi: true
    }
  })
}

async function deleteUser(id) {
  const idNum = Number(id)
  return prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { id_user: idNum } })
    await tx.dataTeknisi.deleteMany({ where: { id_teknisi: idNum } })
    return tx.user.delete({ where: { id_user: idNum } })
  })
}

async function updateTeknisiData(id_teknisi, data) {
  const idNum = Number(id_teknisi)
  return prisma.dataTeknisi.update({
    where: { id_teknisi: idNum },
    data: {
      no_hp: data.no_hp || '',
      area_kerja: data.area_kerja || '',
      alamat: data.alamat || null,
      koordinat: data.koordinat || null,
    },
  })
}

async function getTeknisiById(id_teknisi) {
  return prisma.dataTeknisi.findUnique({
    where: { id_teknisi: Number(id_teknisi) },
  })
}

export default {
  getUserByEmail,
  getUserById,
  assignRole,
  assignRoles,
  createDataTeknisi,
  createUserWithRolesAndTeknisi,
  getTeknisiUsers,
  deleteUser,
  updateTeknisiData,
  getTeknisiById,
}
