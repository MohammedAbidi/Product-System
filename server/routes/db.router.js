const express = require("express")
const router = express.Router()

const dbController = require('../controllers/db.controller')

router.get("/shop/quantities", dbController.nothing)
router.post("/shop/pay", dbController.nothing)

router.get("/orders", dbController.nothing)
router.post("/ff/complete", dbController.nothing)

router.post("/rcv/available", dbController.nothing)
router.get("/admin/brackets", dbController.nothing)
router.post("/admin/add_bracket", dbController.nothing)

module.exports = router