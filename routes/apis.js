const express = require('express')
const router = express.Router()

const passport = require('../config/passport')
const adminController = require('../controllers/api/adminController.js')
const categoryController = require('../controllers/api/categoryController.js')
const userController = require('../controllers/api/userController.js')

const multer = require('multer')
const upload = multer({ dest: 'temp/' })

const authenticated = passport.authenticate('jwt', { session: false })

const authenticatedAdmin = (req, res, next) => {
  if (req.user) {
    if (req.user.isAdmin) {
      return next()
    }
    return res.json({ status: 'error', message: 'permission denied' })
  } else {
    return res.json({ status: 'error', message: 'permission denied' })
  }
}

router
  .route('/admin/restaurants')
  .all(authenticated, authenticatedAdmin)
  .get(adminController.getRestaurants)
  .post(upload.single('image'), adminController.postRestaurant)
router
  .route('/admin/restaurants/:id')
  .all(authenticated, authenticatedAdmin)
  .get(adminController.getRestaurant)
  .put(upload.single('image'), adminController.putRestaurant)
  .delete(adminController.deleteRestaurant)

router
  .route('/admin/categories')
  .all(authenticated, authenticatedAdmin)
  .get(categoryController.getCategories)
  .post(categoryController.postCategories)
router
  .route('/admin/categories/:id')
  .all(authenticated, authenticatedAdmin)
  .get(categoryController.getCategories)
  .put(categoryController.putCategory)
  .delete(categoryController.deleteCategory)

router.post('/signin', userController.signIn)

module.exports = router
