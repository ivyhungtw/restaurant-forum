const express = require('express')
const router = express.Router()

const passport = require('../config/passport')
const adminController = require('../controllers/api/adminController.js')
const categoryController = require('../controllers/api/categoryController.js')
const userController = require('../controllers/api/userController.js')
const restController = require('../controllers/api/restController.js')
const commentController = require('../controllers/api/commentController.js')

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

router.get(
  '/admin/users',
  authenticated,
  authenticatedAdmin,
  adminController.getUsers
)
router.put(
  '/admin/users/:id',
  authenticated,
  authenticatedAdmin,
  adminController.toggleAdmin
)

router.post('/signin', userController.signIn)
router.post('/signup', userController.signUp)

router.get('/restaurants', authenticated, restController.getRestaurants)
router.get('/restaurants/feeds', authenticated, restController.getFeeds)
router.get('/restaurants/top', authenticated, restController.getTopRestaurant)

router.get('/restaurants/:id', authenticated, restController.getRestaurant)
router.get(
  '/restaurants/:id/dashboard',
  authenticated,
  restController.getDashboard
)
router
  .route('/restaurants/:restaurantId/favorites')
  .all(authenticated)
  .post(userController.addFavorite)
  .delete(userController.removeFavorite)
router
  .route('/restaurants/:restaurantId/likes')
  .all(authenticated)
  .post(userController.likeRestaurant)
  .delete(userController.unlikeRestaurant)
router
  .route('/users/:userId/followships')
  .all(authenticated)
  .post(userController.addFollowing)
  .delete(userController.removeFollowing)

router.get('/current_user', authenticated, userController.getCurrentUser)
router.get('/users/top', authenticated, userController.getTopUser)
router
  .route('/users/:id')
  .all(authenticated)
  .get(userController.getUser)
  .put(upload.single('image'), userController.putUser)
router.get('/users/:id/edit', authenticated, userController.editUser)

router.post('/comments', authenticated, commentController.postComment)
router.delete(
  '/comments/:id',
  authenticated,
  authenticatedAdmin,
  commentController.deleteComment
)

module.exports = router
