import { PrismaClient } from '@prisma/client'
import { compare } from 'bcrypt'
import { signToken } from '../utils/jwt.js'

const prisma = new PrismaClient()

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  })

  if (!user) {
    const err = new Error('Email atau password salah')
    err.statusCode = 401
    throw err
  }

  const isMatch = await compare(password, user.password)
  if (!isMatch) {
    const err = new Error('Email atau password salah')
    err.statusCode = 401
    throw err
  }

  const roles = user.roles.map(r => r.role.nama_role.toUpperCase())

  const token = signToken({
    id: user.id_user,
    email: user.email,
    roles,
  })

  return {
    token,
    user: {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      roles,
    },
  }
}

export default { login }
