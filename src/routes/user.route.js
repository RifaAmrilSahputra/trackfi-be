import { Router } from 'express'
const router = Router()

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'
import { deleteUser, createUser, getAllTeknisi, updateTeknisi, updateMyTeknisiData, getMyTeknisiData } from '../controllers/user.controller.js'

router.delete('/:id', authGuard, authorizeRole(['admin']), deleteUser)

router.get('/teknisi', authGuard, authorizeRole(['admin']), getAllTeknisi)

router.put('/teknisi/:id', authGuard, authorizeRole(['admin']), updateTeknisi)

router.get('/me/teknisi', authGuard, authorizeRole(['teknisi']), getMyTeknisiData)

router.put('/me/teknisi', authGuard, authorizeRole(['teknisi']), updateMyTeknisiData)

router.post('/', authGuard, authorizeRole(['admin']), createUser)

export default router
