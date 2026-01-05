import userService from '../services/user.service.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

const validRoles = ['admin', 'teknisi']

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params
    const authUser = req.user

    const isAdmin = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    const existingUser = await userService.getUserById(id)
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' })
    }

    await userService.deleteUser(id)

    res.status(200).json({
      success: true,
      message: 'User berhasil dihapus',
    })
  } catch (err) {
    next(err)
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, roles, phone, area_kerja, alamat, koordinat } = req.body
    const authUser = req.user

    const isAdminCreate = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    if (!isAdminCreate) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Nama dan email wajib diisi' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email tidak valid' })
    }

    if (!roles || !roles.every(r => validRoles.includes(r))) {
      return res.status(400).json({ success: false, message: 'Role tidak valid' })
    }

    let pwd = password
    let temporaryPassword = null
    if (!pwd) {
      temporaryPassword = Math.random().toString(36).slice(-8)
      pwd = temporaryPassword
    }

    const user = await userService.createUserWithRolesAndTeknisi({
      name,
      email,
      password: pwd,
      roles,
      phone,
      area_kerja,
      alamat,
      koordinat,
    })

    const data = {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      roles,
      createdAt: user.createdAt,
    }

    const response = { success: true, message: 'User berhasil dibuat', data }
    if (temporaryPassword) response.temporaryPassword = temporaryPassword

    res.status(201).json(response)
  } catch (err) {
    next(err)
  }
}

async function getAllTeknisi(req, res, next) {
  try {
    const authUser = req.user

    const isAdmin = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    const teknisiUsers = await userService.getTeknisiUsers()

    const formattedData = teknisiUsers.map(user => {
      let roles = []
      if (user.roles && Array.isArray(user.roles)) {
        roles = user.roles.map(ur => ur.role?.nama_role || 'teknisi')
      } else {
        roles = ['teknisi']
      }

      return {
        id: user.id_user,
        name: user.nama,
        email: user.email,
        roles: roles,
        phone: user.teknisi?.no_hp || null,
        area_kerja: user.teknisi?.area_kerja || null,
        alamat: user.teknisi?.alamat || null,
        koordinat: user.teknisi?.koordinat || null,
        createdAt: user.createdAt,
      }
    })

    res.status(200).json({
      success: true,
      message: 'Data teknisi berhasil diambil',
      data: formattedData,
    })
  } catch (err) {
    next(err)
  }
}

async function updateTeknisi(req, res, next) {
  try {
    const { id } = req.params
    const { name, email, phone, area_kerja, alamat, koordinat } = req.body
    const authUser = req.user

    const isAdmin = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    
    const isTeknisiSelf = authUser.id_user === Number(id) || authUser.id === Number(id)

    if (!isAdmin && !isTeknisiSelf) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    const existingTeknisi = await userService.getTeknisiById(id)
    if (!existingTeknisi) {
      return res.status(404).json({ success: false, message: 'Teknisi tidak ditemukan' })
    }

    const updatedTeknisi = await userService.updateTeknisiData(id, {
      no_hp: phone,
      area_kerja,
      alamat,
      koordinat,
    })

    let updatedUser = null
    if (isAdmin && (name || email)) {
      const updateUserData = {}
      if (name) updateUserData.nama = name
      if (email) {
        if (!isValidEmail(email)) {
          return res.status(400).json({ success: false, message: 'Email tidak valid' })
        }
        updateUserData.email = email
      }
      updatedUser = await prisma.user.update({
        where: { id_user: Number(id) },
        data: updateUserData,
      })
    }

    const user = await userService.getUserById(id)

    const responseData = {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      phone: updatedTeknisi.no_hp,
      area_kerja: updatedTeknisi.area_kerja,
      alamat: updatedTeknisi.alamat,
      koordinat: updatedTeknisi.koordinat,
      updatedAt: new Date(),
    }

    res.status(200).json({
      success: true,
      message: 'Data teknisi berhasil diperbarui',
      data: responseData,
    })
  } catch (err) {
    next(err)
  }
}

async function updateMyTeknisiData(req, res, next) {
  try {
    const authUser = req.user
    const { phone, area_kerja, alamat, koordinat } = req.body

    const isTeknisi = (authUser.roles && authUser.roles.some(r => r.toLowerCase() === 'teknisi')) || authUser.role === 'teknisi'
    
    if (!isTeknisi) {
      return res.status(403).json({ success: false, message: 'Hanya teknisi yang dapat mengakses endpoint ini' })
    }

    const teknisiId = authUser.id_user || authUser.id

    const existingTeknisi = await userService.getTeknisiById(teknisiId)
    if (!existingTeknisi) {
      return res.status(404).json({ success: false, message: 'Data teknisi tidak ditemukan' })
    }

    const updatedTeknisi = await userService.updateTeknisiData(teknisiId, {
      no_hp: phone,
      area_kerja,
      alamat,
      koordinat,
    })

    const user = await userService.getUserById(teknisiId)

    const responseData = {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      phone: updatedTeknisi.no_hp,
      area_kerja: updatedTeknisi.area_kerja,
      alamat: updatedTeknisi.alamat,
      koordinat: updatedTeknisi.koordinat,
      updatedAt: new Date(),
    }

    res.status(200).json({
      success: true,
      message: 'Data profil teknisi berhasil diperbarui',
      data: responseData,
    })
  } catch (err) {
    next(err)
  }
}

async function getMyTeknisiData(req, res, next) {
  try {
    const authUser = req.user

    const isTeknisi = (authUser.roles && authUser.roles.some(r => r.toLowerCase() === 'teknisi')) || authUser.role === 'teknisi'
    
    if (!isTeknisi) {
      return res.status(403).json({ success: false, message: 'Hanya teknisi yang dapat mengakses endpoint ini' })
    }

    const teknisiId = authUser.id_user || authUser.id

    const user = await userService.getUserById(teknisiId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' })
    }

    const teknisiData = await userService.getTeknisiById(teknisiId)

    let roles = []
    if (user.roles && Array.isArray(user.roles)) {
      roles = user.roles.map(ur => ur.role?.nama_role || 'teknisi')
    } else if (user.role) {
      roles = Array.isArray(user.role) ? user.role : [user.role]
    } else {
      roles = ['teknisi']
    }

    const responseData = {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      roles: roles,
      phone: teknisiData?.no_hp || null,
      area_kerja: teknisiData?.area_kerja || null,
      alamat: teknisiData?.alamat || null,
      koordinat: teknisiData?.koordinat || null,
      createdAt: user.createdAt,
    }

    res.status(200).json({
      success: true,
      message: 'Data profil teknisi berhasil diambil',
      data: responseData,
    })
  } catch (err) {
    next(err)
  }
}

export { deleteUser, createUser, getAllTeknisi, updateTeknisi, updateMyTeknisiData, getMyTeknisiData }
