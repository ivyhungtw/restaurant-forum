const bcrypt = require('bcryptjs')
const db = require('../models')
const User = db.User
const Comment = db.Comment
const Restaurant = db.Restaurant
const Favorite = db.Favorite
const Like = db.Like
const Followship = db.Followship
const { Op } = require('sequelize')

const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID

const helpers = require('../_helpers')

const uploadImg = path => {
  return new Promise((resolve, reject) => {
    imgur.upload(path, (err, img) => {
      if (err) {
        return reject(err)
      }
      resolve(img)
    })
  })
}

const userService = {
  signUp: async (req, res, callback) => {
    const { name, email, password, confirmPassword } = req.body
    const emailRule =
      /^\w+((-\w+)|(\.\w+)|(\+\w+))*@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/
    const errors = []
    // Before creating an account,
    // make sure all the required fields are correct
    if (!name || !email || !password || !confirmPassword) {
      errors.push({ message: 'Please fill out all fields.' })
    }
    if (email.search(emailRule) === -1) {
      errors.push({ message: 'Please enter the correct email address.' })
    }
    if (password !== confirmPassword) {
      errors.push({ message: 'Password and confirmPassword do not match.' })
    }
    if (errors.length > 0) {
      return callback({
        status: 'error',
        name,
        email,
        password,
        confirmPassword,
        errors
      })
    }

    try {
      // make sure email has not been used yet
      const user = await User.findOne({ where: { email } })

      if (user) {
        return callback({
          status: 'error',
          message: `A user with ${email} already exists. Choose a different address or login directly.`
        })
      }

      await User.create({
        name,
        email,
        password: bcrypt.hashSync(
          req.body.password,
          bcrypt.genSaltSync(10),
          null
        ),
        image: 'https://i.imgur.com/q6bwDGO.png'
      })

      return callback({
        status: 'success',
        message: `${req.body.email} register successfully! Please login.`
      })
    } catch (error) {
      console.log(error)
    }
  },

  getUser: async (req, res, callback) => {
    try {
      let userProfile = await User.findOne({
        include: [
          {
            model: User,
            as: 'Followers',
            attributes: ['id', 'image']
          },
          { model: User, as: 'Followings', attributes: ['id', 'image'] },
          {
            model: Restaurant,
            as: 'FavoritedRestaurants',
            attributes: ['id', 'image']
          },
          {
            model: Comment,
            include: [
              {
                model: Restaurant,
                attributes: ['id', 'image'],
                where: {
                  id: {
                    [Op.ne]: null
                  }
                }
              }
            ]
          }
        ],
        where: {
          id: Number(req.params.id)
        },
        attributes: ['id', 'name', 'email', 'image']
      })

      if (!userProfile) {
        return callback({
          status: 'error',
          message: 'This user does not exist'
        })
      }

      userProfile = userProfile.toJSON()

      // Users can leave many comments on a restaurants,
      // but we wanna show restaurants commented by the user without duplication on the profile page
      const commentRestaurants = []
      const restaurantId = {}
      userProfile.Comments.forEach(comment => {
        if (!restaurantId[comment.RestaurantId]) {
          restaurantId[comment.RestaurantId] = 1
          commentRestaurants.push(comment.Restaurant)
        }
      })

      return callback({
        status: 'success',
        userProfile: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          image: userProfile.image
        },
        userId: helpers.getUser(req).id,
        commentRestaurants,
        followers: userProfile.Followers,
        followings: userProfile.Followings,
        favRestaurants: userProfile.FavoritedRestaurants,
        isFollowed: userProfile.Followers.some(user => user.id === req.user.id)
      })
    } catch (err) {
      console.log(err)
    }
  },

  editUser: async (req, res, callback) => {
    const userId = helpers.getUser(req).id
    const id = req.params.id

    // Users can only edit their own profile
    if (userId !== Number(id)) {
      return callback({
        status: 'error',
        message: 'You can only edit your own profile.',
        userId
      })
    }
    try {
      const user = await User.findByPk(userId)
      return callback({ user: user.toJSON() })
    } catch (err) {
      console.log(err)
    }
  },

  putUser: async (req, res, callback) => {
    const userId = helpers.getUser(req).id
    const id = req.params.id
    const { file } = req
    let img
    const acceptedType = ['.png', '.jpg', '.jpeg']

    // Users can only edit their own profile
    if (userId !== Number(id)) {
      return callback({
        status: 'error',
        message: 'You can only edit your own profile.',
        userId
      })
    }

    if (!req.body.name || req.body.name.length > 25) {
      return callback({
        status: 'error',
        message: 'Name can not be empty or longer than 25 characters.'
      })
    }

    try {
      if (file) {
        const fileType = file.originalname
          .substring(file.originalname.lastIndexOf('.'))
          .toLowerCase()

        if (acceptedType.indexOf(fileType) === -1) {
          return callback({
            status: 'error',
            message:
              'This type of image is not accepted, Please upload the image ends with png, jpg, or jpeg.'
          })
        }

        imgur.setClientID(IMGUR_CLIENT_ID)
        img = await uploadImg(file.path)
      }

      const user = await User.findByPk(userId)
      await user.update({
        name: req.body.name,
        image: file ? img.data.link : user.image
      })
      return callback({ status: 'success', userId })
    } catch (err) {
      console.log(err)
    }
  },

  addFavorite: async (req, res, callback) => {
    try {
      let restaurant = await Restaurant.findByPk(req.params.restaurantId)

      if (!restaurant) {
        callback({
          status: 'error',
          message:
            "You can't add a restaurant which doesn't exist to your favorite list."
        })
      }

      const [fav, created] = await Favorite.findOrCreate({
        where: {
          UserId: helpers.getUser(req).id,
          RestaurantId: req.params.restaurantId
        }
      })

      if (!created) {
        return callback({
          status: 'error',
          message: 'The restaurant has already in your favorite list'
        })
      }

      restaurant = await Restaurant.findByPk(req.params.restaurantId, {
        include: { model: User, as: 'FavoritedUsers' }
      })

      callback({
        status: 'success',
        restaurantName: restaurant.name,
        btn: 'Remove from Favorite',
        btnClass: 'btn-danger favBtn',
        favCount: restaurant.FavoritedUsers.length
      })
    } catch (err) {
      console.log(err)
    }
  },

  removeFavorite: async (req, res, callback) => {
    try {
      const favorite = await Favorite.findOne({
        where: {
          UserId: helpers.getUser(req).id,
          RestaurantId: req.params.restaurantId
        }
      })

      if (!favorite) {
        return callback({
          status: 'error',
          message:
            "You can't remove the restaurant which is not in your favorite list"
        })
      }

      await favorite.destroy()
      const restaurant = await Restaurant.findByPk(req.params.restaurantId, {
        include: { model: User, as: 'FavoritedUsers' }
      })

      callback({
        status: 'success',
        restaurantName: restaurant.name,
        btn: 'Add to Favorite',
        btnClass: 'btn-primary favBtn',
        favCount: restaurant.FavoritedUsers.length
      })
    } catch (err) {
      console.log(err)
    }
  },

  likeRestaurant: async (req, res, callback) => {
    await Like.create({
      UserId: helpers.getUser(req).id,
      RestaurantId: req.params.restaurantId
    })
    callback({
      status: 'success',
      btn: 'Unlike',
      btnClass: 'btn-danger likeBtn'
    })
  },

  unlikeRestaurant: async (req, res, callback) => {
    const like = await Like.findOne({
      where: {
        RestaurantId: req.params.restaurantId,
        UserId: helpers.getUser(req).id
      }
    })
    await like.destroy()
    callback({
      status: 'success',
      btn: 'Like',
      btnClass: 'btn-primary likeBtn'
    })
  },

  getTopUser: async (req, res, callback) => {
    let users = await User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
    const followings = req.user.Followings.map(following => following.id)

    // Clean up users data
    users = users.map(user => ({
      id: user.id,
      name: user.name,
      image: user.image,
      followerCount: user.Followers.length,
      isFollowed: followings.includes(user.id)
    }))

    users = users.sort((a, b) => b.followerCount - a.followerCount)

    callback({ users, id: req.user.id })
  },

  addFollowing: async (req, res, callback) => {
    // Users can not follow themselves
    if (req.user.id === Number(req.params.userId)) {
      return callback({
        status: 'error',
        message: 'You can not follow yourself.'
      })
    }

    try {
      await Followship.create({
        followingId: Number(req.params.userId),
        followerId: req.user.id
      })
    } catch (err) {
      console.log(err)
    }

    callback({
      status: 'success'
    })
  },

  removeFollowing: async (req, res, callback) => {
    try {
      const followship = await Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })

      if (!followship) {
        return callback({
          status: 'error',
          message: 'Can not remove the followship that did not exist'
        })
      }

      await followship.destroy()
    } catch (err) {
      console.log(err)
    }

    callback({
      status: 'success'
    })

    res.redirect('back')
  }
}

module.exports = userService
