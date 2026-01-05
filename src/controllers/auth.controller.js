import authService from '../services/auth.service.js'

async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi',
      })
    }

    const result = await authService.login(email, password)

    res.json({
      success: true,
      message: 'Login berhasil',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function logout(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'Logout berhasil. Silakan hapus token dari client side.',
    })
  } catch (err) {
    next(err)
  }
}

export { login, logout }
